import { normForMatch } from './context.ts';
import type { NcrDataset } from './dataset.ts';
import type { ExtractedSkill, ExtractionResult } from './schema.ts';

/**
 * Extractor evaluation.
 *
 * Unit of evaluation: one canonical skill in one resume. A skill counts as "extracted as current"
 * when the extractor reports mention_type = explicit_current. Gold rows labelled `ambiguous`
 * are excluded from precision and recall and reported on their own; every other pair without a
 * gold row is `not_present`.
 */

export interface GoldRow {
  candidate_id: string;
  resume_id: string;
  skill_id: string;
  expected_label: 'explicit_current' | 'future_goal' | 'negated_or_no_experience' | 'ambiguous';
  evidence_quote: string;
  evidence_location: string;
}

export interface EvalResume {
  resume_id: string;
  candidate_id: string;
  text: string;
  document_type: string;
  group: string;
}

export interface Ratio {
  num: number;
  den: number;
  value: number | null;
}
const ratio = (num: number, den: number): Ratio => ({ num, den, value: den === 0 ? null : Math.round((num / den) * 1000) / 1000 });
const f1 = (p: Ratio, r: Ratio): number | null =>
  p.value === null || r.value === null || p.value + r.value === 0 ? null : Math.round(((2 * p.value * r.value) / (p.value + r.value)) * 1000) / 1000;

export interface ErrorExample {
  resume_id: string;
  skill_id: string;
  category: string;
  gold_label: string;
  extracted_as: string | null;
  sentence: string;
}

export interface EvalReport {
  extractor_version: string;
  dataset_version: string;
  resumes: number;
  gold_rows: number;
  counts: { true_positive: number; false_positive: number; false_negative: number };
  precision: Ratio;
  recall: Ratio;
  f1: number | null;
  future_goal_leakage: Ratio;
  negation_leakage: Ratio;
  unsupported_skill_rate: Ratio;
  evidence_coverage: Ratio;
  canonicalization_accuracy: Ratio;
  candidate_leakage: { skills_with_foreign_evidence: number; examples: string[] };
  canonicalization_errors: ErrorExample[];
  ambiguous_gold: { predicted_current: number; total: number };
  by_group: Record<string, { precision: Ratio; recall: Ratio; f1: number | null }>;
  per_resume: Array<{ resume_id: string; group: string; extracted: number; tp: number; fp: number; fn: number }>;
  error_categories: Record<string, number>;
  false_negatives: ErrorExample[];
  false_positives: ErrorExample[];
  non_current_leaks: ErrorExample[];
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function aliasRegexes(ds: NcrDataset, skillId: string): RegExp[] {
  return ds.aliases
    .filter((a) => a.skill_id === skillId)
    .map((a) => {
      const norm = normForMatch(a.alias).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      return new RegExp(`(?<![a-z0-9])${norm}(?![a-z0-9])`);
    });
}

export function evaluateExtraction(
  results: ExtractionResult[],
  resumes: EvalResume[],
  gold: GoldRow[],
  ds: NcrDataset,
  options: { redact?: (resume: EvalResume) => boolean; mentions?: Map<string, Array<{ skill_id: string; evidence: string; matched: string }>> } = {},
): EvalReport {
  const byResume = new Map(resumes.map((r) => [r.resume_id, r]));
  const resultOf = new Map(results.map((r) => [r.resume_id, r]));
  const goldOf = new Map(gold.map((g) => [`${g.resume_id}|${g.skill_id}`, g]));
  const sentenceFor = (resume: EvalResume, s: string) => (options.redact?.(resume) ? '[redacted: private resume]' : s);

  const evidenceOk = (resume: EvalResume, s: ExtractedSkill): boolean => {
    if (s.evidence.trim().length < 3) return false;
    if (!squash(resume.text).includes(squash(s.evidence))) return false;
    return s.method === 'semantic_candidate' || normForMatch(s.evidence).includes(s.matched_text);
  };

  let tp = 0, fp = 0, fn = 0;
  let futureTotal = 0, futureLeaked = 0, negTotal = 0, negLeaked = 0;
  let currentOut = 0, unsupported = 0;
  let allOut = 0, usable = 0;
  let ambTotal = 0, ambPredicted = 0;
  const categories: Record<string, number> = {};
  const bump = (c: string) => (categories[c] = (categories[c] ?? 0) + 1);
  const fnList: ErrorExample[] = [];
  const fpList: ErrorExample[] = [];
  const leaks: ErrorExample[] = [];
  const foreign: string[] = [];
  const perResume: EvalReport['per_resume'] = [];
  const groupAgg = new Map<string, { tp: number; fp: number; fn: number }>();

  for (const resume of resumes) {
    const result = resultOf.get(resume.resume_id);
    if (!result) throw new Error(`no extraction result for ${resume.resume_id}`);
    if (result.resume_id !== resume.resume_id || result.candidate_id !== resume.candidate_id) {
      throw new Error(`result identity mismatch for ${resume.resume_id}`);
    }
    const extracted = new Map(result.skills.map((s) => [s.skill_id, s]));
    let rTp = 0, rFp = 0, rFn = 0;

    for (const s of result.skills) {
      allOut++;
      const ok = evidenceOk(resume, s);
      if (ok) usable++;
      if (!squash(resume.text).includes(squash(s.evidence)) && s.evidence) foreign.push(`${resume.resume_id}:${s.skill_id}`);
      if (s.mention_type === 'explicit_current') {
        currentOut++;
        if (!ok) unsupported++;
      }
    }

    const goldHere = gold.filter((g) => g.resume_id === resume.resume_id);
    const skillIds = new Set([...extracted.keys(), ...goldHere.map((g) => g.skill_id)]);
    for (const skillId of skillIds) {
      const g = goldOf.get(`${resume.resume_id}|${skillId}`);
      const e = extracted.get(skillId);
      const predictedCurrent = e?.mention_type === 'explicit_current';
      const label = g?.expected_label ?? 'not_present';

      if (label === 'future_goal') {
        futureTotal++;
        if (predictedCurrent) futureLeaked++;
      }
      if (label === 'negated_or_no_experience') {
        negTotal++;
        if (predictedCurrent) negLeaked++;
      }
      if (label === 'ambiguous') {
        ambTotal++;
        if (predictedCurrent) ambPredicted++;
        continue;
      }

      if (label === 'explicit_current' && predictedCurrent) {
        tp++;
        rTp++;
      } else if (label === 'explicit_current') {
        fn++;
        rFn++;
        const quote = normForMatch(g!.evidence_quote);
        const aliasHit = aliasRegexes(ds, skillId).some((re) => re.test(quote));
        const category = e ? 'context_classification' : aliasHit ? 'section_or_matching' : 'missing_alias';
        bump(`FN:${category}`);
        fnList.push({ resume_id: resume.resume_id, skill_id: skillId, category, gold_label: label, extracted_as: e?.mention_type ?? null, sentence: sentenceFor(resume, g!.evidence_quote) });
      } else if (predictedCurrent) {
        fp++;
        rFp++;
        const category =
          label === 'future_goal' ? 'future_goal_leakage' : label === 'negated_or_no_experience' ? 'negation_leakage' : 'unlabelled_or_false_positive';
        bump(`FP:${category}`);
        const example: ErrorExample = { resume_id: resume.resume_id, skill_id: skillId, category, gold_label: label, extracted_as: 'explicit_current', sentence: sentenceFor(resume, e!.evidence) };
        fpList.push(example);
        if (label !== 'not_present') leaks.push(example);
      }
    }

    perResume.push({ resume_id: resume.resume_id, group: resume.group, extracted: result.skills.length, tp: rTp, fp: rFp, fn: rFn });
    const agg = groupAgg.get(resume.group) ?? { tp: 0, fp: 0, fn: 0 };
    agg.tp += rTp;
    agg.fp += rFp;
    agg.fn += rFn;
    groupAgg.set(resume.group, agg);
  }

  // Canonicalization: for each gold row, is the gold skill among the skills extracted from the same evidence?
  let canonCorrect = 0, canonWrong = 0;
  const canonErrors: ErrorExample[] = [];
  for (const g of gold) {
    const result = resultOf.get(g.resume_id);
    if (!result || !byResume.has(g.resume_id)) continue;
    const quote = squash(g.evidence_quote);
    const pool = options.mentions?.get(g.resume_id) ?? result.skills.map((s) => ({ skill_id: s.skill_id, evidence: s.evidence, matched: s.matched_text }));
    const overlapping = pool.filter((s) => {
      const ev = squash(s.evidence);
      return ev.length > 0 && (ev.includes(quote) || quote.includes(ev) || quote.includes(s.matched));
    });
    if (overlapping.length === 0) continue;
    if (overlapping.some((s) => s.skill_id === g.skill_id)) canonCorrect++;
    else {
      canonWrong++;
      const resume = byResume.get(g.resume_id)!;
      canonErrors.push({ resume_id: g.resume_id, skill_id: g.skill_id, category: 'gold_skill_not_among_skills_from_same_evidence', gold_label: g.expected_label, extracted_as: overlapping.map((s) => s.skill_id).join(','), sentence: sentenceFor(resume, g.evidence_quote) });
    }
  }

  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const groups: EvalReport['by_group'] = {};
  for (const [name, a] of groupAgg) {
    const p = ratio(a.tp, a.tp + a.fp);
    const r = ratio(a.tp, a.tp + a.fn);
    groups[name] = { precision: p, recall: r, f1: f1(p, r) };
  }
  const first = results[0];

  return {
    extractor_version: first?.extractor_version ?? 'n/a',
    dataset_version: first?.dataset_version ?? 'n/a',
    resumes: resumes.length,
    gold_rows: gold.length,
    counts: { true_positive: tp, false_positive: fp, false_negative: fn },
    precision,
    recall,
    f1: f1(precision, recall),
    future_goal_leakage: ratio(futureLeaked, futureTotal),
    negation_leakage: ratio(negLeaked, negTotal),
    unsupported_skill_rate: ratio(unsupported, currentOut),
    evidence_coverage: ratio(usable, allOut),
    canonicalization_accuracy: ratio(canonCorrect, canonCorrect + canonWrong),
    candidate_leakage: { skills_with_foreign_evidence: foreign.length, examples: foreign.slice(0, 10) },
    canonicalization_errors: canonErrors,
    ambiguous_gold: { predicted_current: ambPredicted, total: ambTotal },
    by_group: groups,
    per_resume: perResume,
    error_categories: categories,
    false_negatives: fnList,
    false_positives: fpList,
    non_current_leaks: leaks,
  };
}

const pct = (r: Ratio) => (r.value === null ? 'n/a' : `${(r.value * 100).toFixed(1)}% (${r.num}/${r.den})`);

export function renderEvalMarkdown(report: EvalReport, title: string): string {
  const lines: string[] = [];
  lines.push(`# ${title}`, '');
  lines.push(`Extractor \`${report.extractor_version}\` · dataset \`${report.dataset_version}\` · ${report.resumes} resumes · ${report.gold_rows} gold rows`, '');
  lines.push('| Metric | Result |', '|---|---|');
  lines.push(`| Precision (current skills) | ${pct(report.precision)} |`);
  lines.push(`| Recall (current skills) | ${pct(report.recall)} |`);
  lines.push(`| F1 | ${report.f1 === null ? 'n/a' : report.f1.toFixed(3)} |`);
  lines.push(`| Future-goal leakage | ${pct(report.future_goal_leakage)} |`);
  lines.push(`| Negation leakage | ${pct(report.negation_leakage)} |`);
  lines.push(`| Unsupported-skill rate | ${pct(report.unsupported_skill_rate)} |`);
  lines.push(`| Evidence coverage | ${pct(report.evidence_coverage)} |`);
  lines.push(`| Canonicalization accuracy | ${pct(report.canonicalization_accuracy)} |`);
  lines.push(`| Candidate leakage (skills with evidence not in own resume) | ${report.candidate_leakage.skills_with_foreign_evidence} |`);
  lines.push(`| Ambiguous gold pairs predicted as current | ${report.ambiguous_gold.predicted_current}/${report.ambiguous_gold.total} |`, '');
  lines.push(`Counts: TP ${report.counts.true_positive}, FP ${report.counts.false_positive}, FN ${report.counts.false_negative}.`, '');

  lines.push('## By profile group', '', '| Group | Precision | Recall | F1 |', '|---|---|---|---|');
  for (const [name, g] of Object.entries(report.by_group)) lines.push(`| ${name} | ${pct(g.precision)} | ${pct(g.recall)} | ${g.f1 === null ? 'n/a' : g.f1.toFixed(3)} |`);

  lines.push('', '## Error categories', '', '| Category | Count |', '|---|---|');
  for (const [name, n] of Object.entries(report.error_categories).sort()) lines.push(`| ${name} | ${n} |`);

  const section = (heading: string, items: ErrorExample[]) => {
    lines.push('', `## ${heading} (${items.length})`, '');
    for (const e of items.slice(0, 40)) lines.push(`- \`${e.resume_id}\` \`${e.skill_id}\` [${e.category}] gold=${e.gold_label} extracted=${e.extracted_as ?? 'none'}: ${e.sentence.replace(/\s+/g, ' ').slice(0, 200)}`);
    if (items.length > 40) lines.push(`- … ${items.length - 40} more in the JSON report`);
  };
  section('False negatives', report.false_negatives);
  section('False positives', report.false_positives);
  section('Non-current mentions treated as current', report.non_current_leaks);
  lines.push('');
  return lines.join('\n');
}
