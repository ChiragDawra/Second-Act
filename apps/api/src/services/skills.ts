import type { Queryable } from '../db/types.ts';
import { EXTRACTION_RULES } from '../data/demo-v1.ts';
import { extractSkills, type ExtractedCandidate } from '../engine/extraction.ts';
import type { SkillInfo } from '../engine/types.ts';

/**
 * Runs deterministic extraction over the stored work history and inserts
 * candidates as "inferred" only for skills the worker has no record of.
 * Reviewed, edited or assessed claims are never overwritten.
 */
export async function insertExtractedSkills(
  q: Queryable,
  profileId: string,
): Promise<{ candidates: ExtractedCandidate[]; inserted: string[] }> {
  const profile = await q.query<{ experience_summary: string; catalogue: string }>(
    'select experience_summary, catalogue from public.profiles where id = $1',
    [profileId],
  );
  const text = profile.rows[0]?.experience_summary ?? '';
  // The demo phrase matcher only runs over the profile's own catalogue.
  const catalog = await q.query<SkillInfo>(
    'select id, canonical_name, aliases, learning_hours_per_level from public.skills where catalogue = $1 order by id',
    [profile.rows[0]?.catalogue ?? 'demo'],
  );
  const candidates = extractSkills(text, catalog.rows, EXTRACTION_RULES);

  const inserted: string[] = [];
  for (const c of candidates) {
    const r = await q.query<{ skill_id: string }>(
      `insert into public.worker_skills
         (profile_id, skill_id, status, proficiency, evidence_snippet, evidence_source_type, confidence, confidence_method, review_state)
       values ($1, $2, 'inferred', $3, $4, 'work_history_text', $5, $6, 'pending')
       on conflict (profile_id, skill_id) do nothing
       returning skill_id`,
      [profileId, c.skill_id, c.proficiency, c.evidence_snippet, c.confidence, c.confidence_method],
    );
    if (r.rows[0]) inserted.push(r.rows[0].skill_id);
  }
  return { candidates, inserted };
}
