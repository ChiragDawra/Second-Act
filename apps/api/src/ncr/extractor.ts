import { classifyMention, levelCue, normForMatch } from './context.ts';
import type { NcrDataset } from './dataset.ts';
import {
  BASELINE_EXTRACTOR_VERSION,
  EXTRACTOR_VERSION,
  MENTION_PRIORITY,
  extractionResultSchema,
  type ExtractedSkill,
  type ExtractionInput,
  type ExtractionResult,
  type MentionType,
  type SemanticProvider,
} from './schema.ts';
import { headerSegments, parseDocument, type DocLine, type SectionKind } from './sections.ts';
import { normalizeResumeText } from './text.ts';

/**
 * Resume skill extractor for the Delhi-NCR pilot.
 *
 * Two modes, kept side by side so the effect of context handling can be measured:
 *  - baseline-0.1   alias dictionary match anywhere in the text, every hit is a current claim.
 *  - ncr-rules-0.2  section parsing, clause-level context (goal, negation, coursework, employer names).
 *
 * One call handles one resume. There is no shared state between calls, so skills cannot leak
 * between candidates. Output is validated against extractionResultSchema.
 */

export interface ExtractOptions {
  mode?: 'baseline' | 'context';
  semantic?: SemanticProvider;
}

interface AliasIndex {
  matcher: RegExp;
  /** A phrase maps to one skill, or to several when it evidences more than one ("a;b" in the alias file). */
  byText: Map<string, string[]>;
  contextRequired: Map<string, string>;
}

const indexCache = new WeakMap<NcrDataset, AliasIndex>();

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function aliasIndex(ds: NcrDataset): AliasIndex {
  const cached = indexCache.get(ds);
  if (cached) return cached;
  const byText = new Map<string, string[]>();
  const contextRequired = new Map<string, string>();
  for (const a of ds.aliases) {
    if (a.review_status === 'context_required') {
      contextRequired.set(a.alias.toLowerCase(), a.skill_id);
      continue;
    }
    byText.set(normForMatch(a.alias), a.skill_id.split(';'));
  }
  // Longest alias first: at any position the longest phrase wins ("jira service desk" before "jira").
  const alternatives = [...byText.keys()].sort((x, y) => y.length - x.length || (x < y ? -1 : 1)).map(escapeRegex);
  const matcher = new RegExp(`(?<![a-z0-9])(?:${alternatives.join('|')})(?![a-z0-9])`, 'g');
  const index = { matcher, byText, contextRequired };
  indexCache.set(ds, index);
  return index;
}

/** Context-required aliases (ambiguous abbreviations) match only where the sentence supports the meaning. */
const GO_CONTEXT =
  /\b(C\+\+|Python|Java|JavaScript|TypeScript|Rust|Golang|Linux|goroutines?|channels?|concurrency|programming|languages?|runtime|race detector|microservices|daemon|server|implementation|GCC|Clang|Bash|Docker|gRPC)\b|\b(?:in|using|with|and|or|of)\s+Go\b|\bGo\s*[(,/]/;
const C_CONTEXT =
  /\b(Go|Golang|Python|Java|Rust|Linux|pointers|structs|socket|GCC|Clang|C99|C11|C\+\+|kernel|firmware|embedded|compiled|programming)\b|\b(?:in|using|with|and|or|of|embedded)\s+C\b|^C\s*[(,/]/;
const AD_CONTEXT = /active directory|azure|entra|group polic|user (?:creation|provisioning)|password|domain|mfa|windows|identity/i;

function contextRequiredMatches(clause: string, ctxSkills: Map<string, string>): Array<{ skill_id: string; index: number; text: string }> {
  const out: Array<{ skill_id: string; index: number; text: string }> = [];
  const ad = ctxSkills.get('ad');
  if (ad && AD_CONTEXT.test(clause)) {
    for (const m of clause.matchAll(/(?<![\w])AD(?![\w])/g)) out.push({ skill_id: ad, index: m.index!, text: 'ad' });
  }
  const go = ctxSkills.get('go');
  if (go && GO_CONTEXT.test(clause)) {
    for (const m of clause.matchAll(/(?<![\w.-])Go(?![\w-])(?!\s+(?:to|live|ahead|back|through|beyond|for)\b)/g)) {
      out.push({ skill_id: go, index: m.index!, text: 'go' });
    }
  }
  // "Swift" is also a programming language; only the capitalised network name SWIFT counts as banking.
  const swift = ctxSkills.get('swift');
  if (swift) for (const m of clause.matchAll(/(?<![A-Za-z0-9])SWIFT(?![A-Za-z0-9])/g)) out.push({ skill_id: swift, index: m.index!, text: 'swift' });
  const c = ctxSkills.get('c');
  if (c && C_CONTEXT.test(clause)) {
    for (const m of clause.matchAll(/(?<![\w.#+-])C(?![\w+#-])/g)) out.push({ skill_id: c, index: m.index!, text: 'c' });
  }
  return out;
}

/** Splits at sentence ends and at top-level semicolons (not inside brackets). */
export function splitClauses(text: string): string[] {
  const clauses: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+(?=[A-Z"“(])/)) {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < sentence.length; i++) {
      const ch = sentence[i]!;
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ';' && depth === 0) {
        clauses.push(sentence.slice(start, i));
        start = i + 1;
      }
    }
    clauses.push(sentence.slice(start));
  }
  return clauses.map((c) => c.trim()).filter((c) => c.length > 0);
}

export interface Mention {
  skill_id: string;
  mention: MentionType;
  level: number | null;
  evidence: string;
  section: string;
  kind: SectionKind;
  method: 'alias_rule' | 'context_alias_rule';
  matched: string;
  order: number;
}

const MAX_EVIDENCE = 320;
function evidenceWindow(clause: string, rawIndexHint: number): string {
  if (clause.length <= MAX_EVIDENCE) return clause;
  const start = Math.max(0, Math.min(rawIndexHint - 140, clause.length - MAX_EVIDENCE));
  const cut = clause.slice(start, start + MAX_EVIDENCE);
  return cut.trim();
}

/** Position of a normalised match inside the raw clause, to centre long evidence. Best effort only. */
function rawHint(clause: string, matched: string): number {
  const first = matched.split(' ')[0] ?? matched;
  const i = clause.toLowerCase().indexOf(first);
  return i === -1 ? 0 : i;
}

function collectBaseline(text: string, ds: NcrDataset): Mention[] {
  const { matcher, byText } = aliasIndex(ds);
  const mentions: Mention[] = [];
  let order = 0;
  for (const sentence of text.split(/\n|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)) {
    const norm = normForMatch(sentence);
    for (const m of norm.matchAll(matcher)) {
      for (const skill_id of byText.get(m[0])!) {
        mentions.push({
          skill_id,
          mention: 'explicit_current',
          level: null,
          evidence: evidenceWindow(sentence, rawHint(sentence, m[0])),
          section: 'Unsegmented',
          kind: 'other',
          method: 'alias_rule',
          matched: m[0],
          order: order++,
        });
      }
    }
  }
  return mentions;
}

const CONTACT_LINE = /@|https?:[/][/]|linkedin[.]com|github[.]com|[+]?[0-9][0-9 ()-]{8,}[0-9]/i;

/** Every alias hit with its classified context, before one mention per skill is chosen. */
export function collectMentions(rawText: string, ds: NcrDataset, mode: 'baseline' | 'context' = 'context'): Mention[] {
  const text = normalizeResumeText(rawText);
  return mode === 'baseline' ? collectBaseline(text, ds) : collectContextual(parseDocument(text), ds);
}

function collectContextual(lines: DocLine[], ds: NcrDataset): Mention[] {
  const { matcher, byText, contextRequired } = aliasIndex(ds);
  const mentions: Mention[] = [];
  let order = 0;

  const scan = (clause: string, line: DocLine, claimAllowed: boolean) => {
    const norm = normForMatch(clause);
    const label = line.label ? normForMatch(line.label) : '';
    const push = (skill_id: string, matchIndex: number, matched: string, method: Mention['method']) => {
      mentions.push({
        skill_id,
        mention: classifyMention({ clause: norm, matchIndex, kind: line.kind, label, claimAllowed }),
        level: levelCue(norm, matchIndex, matched.length),
        evidence: evidenceWindow(clause, rawHint(clause, matched)),
        section: line.section,
        kind: line.kind,
        method,
        matched,
        order: order++,
      });
    };
    for (const m of norm.matchAll(matcher)) for (const id of byText.get(m[0])!) push(id, m.index!, m[0], 'alias_rule');
    for (const c of contextRequiredMatches(clause, contextRequired)) {
      push(c.skill_id, normForMatch(clause.slice(0, c.index)).length, c.text, 'context_alias_rule');
    }
  };

  for (const line of lines) {
    // Name, contact and headline lines are not skill evidence ("Jenkins" is also a surname).
    if (line.section === 'Document start' && line.text.length < 80) continue;
    if (CONTACT_LINE.test(line.text) && line.text.length < 200) continue;
    if (line.isHeaderLine) {
      for (const seg of headerSegments(line.text)) scan(seg.text, line, seg.claimAllowed);
      continue;
    }
    for (const clause of splitClauses(line.text)) scan(clause, line, true);
  }
  return mentions;
}

const KIND_QUALITY: Record<SectionKind, number> = {
  experience: 0,
  projects: 0,
  skills: 1,
  certifications: 2,
  education: 3,
  summary: 4,
  mixed: 5,
  learning: 6,
  goals: 6,
  other: 7,
};

function statusFor(mention: MentionType): ExtractedSkill['status'] {
  if (mention === 'explicit_current') return 'self_reported';
  if (mention === 'coursework') return 'inferred';
  return 'unknown';
}

export function extractResume(input: ExtractionInput, ds: NcrDataset, options: ExtractOptions = {}): ExtractionResult {
  const mode = options.mode ?? 'context';
  const text = normalizeResumeText(input.text);
  const names = new Map(ds.skills.map((s) => [s.id, s.name]));
  const warnings: string[] = [];

  const mentions = collectMentions(input.text, ds, mode);

  const bySkill = new Map<string, Mention[]>();
  for (const m of mentions) {
    const list = bySkill.get(m.skill_id) ?? [];
    list.push(m);
    bySkill.set(m.skill_id, list);
  }

  const skills: ExtractedSkill[] = [];
  for (const [skill_id, list] of [...bySkill.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const best = [...list].sort(
      (a, b) =>
        MENTION_PRIORITY.indexOf(a.mention) - MENTION_PRIORITY.indexOf(b.mention) ||
        KIND_QUALITY[a.kind] - KIND_QUALITY[b.kind] ||
        a.order - b.order,
    )[0]!;
    const types = new Set(list.map((m) => m.mention));
    if (best.mention === 'explicit_current' && (types.has('future_goal') || types.has('negated_or_no_experience'))) {
      warnings.push(`conflicting_evidence:${skill_id}`);
    }
    const levelFrom = list.find((m) => m.mention === best.mention && m.level !== null);
    skills.push({
      skill_id,
      canonical_name: names.get(skill_id) ?? skill_id,
      status: statusFor(best.mention),
      mention_type: best.mention,
      suggested_level: best.mention === 'explicit_current' || best.mention === 'coursework' ? (levelFrom?.level ?? null) : null,
      evidence: best.evidence,
      evidence_unavailable_reason: best.evidence ? null : 'no_sentence_captured',
      section: best.section,
      method: best.method,
      matched_text: best.matched,
      similarity_score: null,
      mention_count: list.length,
      review_status: 'pending',
    });
  }

  if (options.semantic) {
    const found = new Set(skills.map((s) => s.skill_id));
    const sentences = text.split(/\n|(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length >= 12);
    const compact = text.replace(/\s+/g, ' ');
    for (const c of options.semantic.suggest(sentences, ds.skills.map((s) => s.id))) {
      if (found.has(c.skill_id) || !names.has(c.skill_id)) continue;
      // A suggestion must quote this resume; anything else is dropped (and counted) rather than trusted.
      if (!compact.includes(c.evidence.replace(/\s+/g, ' ').trim())) {
        warnings.push(`semantic_candidate_dropped:${c.skill_id}`);
        continue;
      }
      found.add(c.skill_id);
      skills.push({
        skill_id: c.skill_id,
        canonical_name: names.get(c.skill_id)!,
        status: 'inferred',
        mention_type: 'ambiguous',
        suggested_level: null,
        evidence: c.evidence.slice(0, MAX_EVIDENCE),
        evidence_unavailable_reason: null,
        section: 'Unknown',
        method: 'semantic_candidate',
        matched_text: '',
        similarity_score: Math.max(0, Math.min(1, c.similarity)),
        mention_count: 1,
        review_status: 'pending',
      });
    }
  }

  if (skills.length === 0) warnings.push('no_skills_found');

  return extractionResultSchema.parse({
    candidate_id: input.candidate_id,
    resume_id: input.resume_id,
    document_type: input.document_type,
    extractor_version: mode === 'baseline' ? BASELINE_EXTRACTOR_VERSION : EXTRACTOR_VERSION,
    dataset_version: ds.config.dataset_version,
    skills,
    warnings,
  });
}
