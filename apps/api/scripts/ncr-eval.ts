/**
 * Runs the resume extractor over the evaluation set and writes a metrics report.
 *
 *   npm run ncr:eval -- --mode baseline            # context-blind dictionary baseline
 *   npm run ncr:eval -- --mode context             # ncr-rules-0.2
 *   npm run ncr:eval -- --mode context --private   # also the 3 private PDFs (never committed)
 *
 * Reports go to docs/eval/. With --private, evidence text from the real resumes is redacted.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNcrDataset, validateNcrDataset } from '../src/ncr/dataset.ts';
import { evaluateExtraction, renderEvalMarkdown } from '../src/ncr/evaluate.ts';
import { loadEvalSet, loadHeldoutSet, runExtraction, runMentions } from '../src/ncr/evalset.ts';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1]! : fallback;
};

const mode = value('mode', 'context') as 'baseline' | 'context';
if (mode !== 'baseline' && mode !== 'context') throw new Error('--mode must be baseline or context');

const ds = loadNcrDataset();
const problems = validateNcrDataset(ds);
if (problems.length > 0) {
  console.error(`Dataset has ${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}

const set = flag('heldout') ? loadHeldoutSet() : await loadEvalSet({ includePrivate: flag('private') });
const results = runExtraction(set, ds, { mode });
const report = evaluateExtraction(results, set.resumes, set.gold, ds, { redact: (r) => r.document_type === 'pdf', mentions: runMentions(set, ds, mode) });

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/eval');
mkdirSync(outDir, { recursive: true });
const scope = flag('heldout') ? 'heldout3' : set.includesPrivate ? 'all15' : 'synthetic12';
const base = resolve(outDir, `extractor-${report.extractor_version}-${scope}`);
writeFileSync(`${base}.json`, JSON.stringify(report, null, 2) + '\n');
writeFileSync(`${base}.md`, renderEvalMarkdown(report, `Extractor evaluation: ${report.extractor_version} (${scope})`));

const p = report.precision.value, r = report.recall.value;
console.log(
  `${report.extractor_version} ${scope}: precision ${p} recall ${r} f1 ${report.f1} | ` +
    `future-goal leakage ${report.future_goal_leakage.num}/${report.future_goal_leakage.den} | ` +
    `unsupported ${report.unsupported_skill_rate.num}/${report.unsupported_skill_rate.den} | ` +
    `foreign evidence ${report.candidate_leakage.skills_with_foreign_evidence}`,
);
console.log(`Wrote ${base}.md`);
