/**
 * Separates extraction errors from ranking errors.
 *
 * For each resume, two skill profiles are built with the same levels:
 *   manual     - the gold-labelled current skills (what a careful human reviewer would confirm)
 *   extracted  - the extractor's explicit_current skills
 * Both go through the same deterministic ranking. If the roles differ, the difference is caused by
 * extraction (missing or extra skills), because the ranking code is identical. If they agree but look
 * wrong for the person, the cause is the role data, the level assumption or the scoring, not extraction.
 *
 * Resumes rarely state a level, so a level is assumed when the text gives none. The worker sets the real
 * level in the review step. The report is produced for two assumptions so the effect is visible.
 *
 *   npm run ncr:compare [-- --private]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recommend, type NcrProfileSkill } from '../src/ncr/adjacency.ts';
import { loadNcrDataset } from '../src/ncr/dataset.ts';
import { loadEvalSet, loadHeldoutSet, runExtraction, type EvalSet } from '../src/ncr/evalset.ts';

const includePrivate = process.argv.includes('--private');
const ds = loadNcrDataset();
const main = await loadEvalSet({ includePrivate });
const held = loadHeldoutSet();
const set: EvalSet = { resumes: [...main.resumes, ...held.resumes], gold: [...main.gold, ...held.gold], includesPrivate: main.includesPrivate };
const results = runExtraction(set, ds, { mode: 'context' });
const titles = new Map(ds.roles.map((r) => [r.id, r.title]));

interface Row {
  resume: string;
  group: string;
  manualTop: string[];
  manualStretch: string[];
  extractedTop: string[];
  extractedStretch: string[];
  missed: number;
  extra: number;
}

function compare(defaultLevel: number): Row[] {
  return set.resumes.map((resume) => {
    const extracted = results.find((r) => r.resume_id === resume.resume_id)!;
    const level = new Map(extracted.skills.map((s) => [s.skill_id, s.suggested_level ?? defaultLevel]));
    const asProfile = (ids: string[]): NcrProfileSkill[] => ids.map((id) => ({ skill_id: id, status: 'self_reported', proficiency: level.get(id) ?? defaultLevel }));
    const goldIds = set.gold.filter((g) => g.resume_id === resume.resume_id && g.expected_label === 'explicit_current').map((g) => g.skill_id);
    const extractedIds = extracted.skills.filter((s) => s.mention_type === 'explicit_current').map((s) => s.skill_id);
    const m = recommend(ds, asProfile(goldIds));
    const e = recommend(ds, asProfile(extractedIds));
    return {
      resume: resume.resume_id,
      group: resume.group,
      manualTop: m.top_roles.map((r) => r.role_id),
      manualStretch: m.stretch_roles.slice(0, 2).map((r) => r.role_id),
      extractedTop: e.top_roles.map((r) => r.role_id),
      extractedStretch: e.stretch_roles.slice(0, 2).map((r) => r.role_id),
      missed: goldIds.filter((id) => !extractedIds.includes(id)).length,
      extra: extractedIds.filter((id) => !goldIds.includes(id)).length,
    };
  });
}

const names = (ids: string[]) => (ids.length ? ids.map((i) => titles.get(i)).join('; ') : 'none');
const same = (a: Row) => JSON.stringify([a.manualTop, a.manualStretch]) === JSON.stringify([a.extractedTop, a.extractedStretch]);

const atLevel3 = compare(3);
const atLevel2 = compare(2);
const noRole = (rows: Row[]) => rows.filter((r) => r.manualTop.length === 0).length;

const out = [
  '# Manual profile vs extractor profile',
  '',
  'Same ranking code, same levels. A difference between the two columns is an extraction effect. Roles that agree but look wrong for the person point at role data, the level assumption or scoring.',
  '',
  `Dataset \`${ds.config.dataset_version}\`, scoring \`fit-v1\`, adjacency \`${ds.config.adjacency_version}\`. ${set.resumes.length} resumes${set.includesPrivate ? ' (includes the 3 private PDFs; no resume text shown)' : ''}.`,
  '',
  '## Level assumption matters more than extraction',
  '',
  'A resume rarely states a proficiency level, so one is assumed when the text gives none (the worker sets the real level in the review step). Many role requirements need level 3 and several are mandatory, so a level-2 default pushes roles into "stretch".',
  '',
  `- Assumed level 2: **${noRole(atLevel2)} of ${atLevel2.length}** manual profiles get no recommended role (blocked by a mandatory level-3 requirement or below the bar).`,
  `- Assumed level 3: **${noRole(atLevel3)} of ${atLevel3.length}** get no recommended role.`,
  `- Manual and extractor results identical: **${atLevel3.filter(same).length} of ${atLevel3.length}** (level 3) and **${atLevel2.filter(same).length} of ${atLevel2.length}** (level 2).`,
  '',
  '## Detail at assumed level 3 (professional use = "Independent")',
  '',
  '| Resume | Group | Manual profile: recommended / stretch | Extractor profile | Skills missed / extra |',
  '|---|---|---|---|---|',
  ...atLevel3.map((r) => `| ${r.resume} | ${r.group} | ${names(r.manualTop)} / ${names(r.manualStretch)} | ${same(r) ? 'same' : `${names(r.extractedTop)} / ${names(r.extractedStretch)}`} | ${r.missed}/${r.extra} |`),
  '',
].join('\n');

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/eval');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, `adjacency-manual-vs-extracted-${set.includesPrivate ? 'all18' : 'synthetic15'}.md`), out);
console.log(out);
