import type { Db } from '../db/types.ts';
import { SCENARIO_VERSION } from '../data/demo-v1.ts';
import { recordAudit } from '../services/audit.ts';
import { recompute } from '../services/recommendations.ts';
import { insertExtractedSkills } from '../services/skills.ts';
import { upsertWorkerProfiles } from './accounts.ts';
import { upsertCatalog } from './catalog.ts';

export interface ResetSummary {
  scenario_version: string;
  reset_at: string;
  profiles_reset: number;
  skills_seeded: number;
}

/**
 * Restores the synthetic Harpreet scenario to its starting point:
 * extracted (unreviewed) skills, no assessments, no mentorship requests,
 * no sharing, fresh recommendations. Only synthetic profiles are touched and
 * the audit trail is preserved (append-only), with a demo.reset event added.
 */
export async function resetScenario(
  db: Db,
  actor: { userId: string | null; role: string | null; requestId?: string },
): Promise<ResetSummary> {
  const { profileIds, seeded, resetAt } = await db.asService(async (q) => {
    await upsertCatalog(q);
    await upsertWorkerProfiles(q);

    const profiles = await q.query<{ id: string }>('select id from public.profiles where is_synthetic order by id');
    const ids = profiles.rows.map((p) => p.id);

    await q.query('delete from public.mentor_requests where profile_id = any($1::uuid[])', [ids]);
    await q.query('delete from public.share_grants where profile_id = any($1::uuid[])', [ids]);
    await q.query('delete from public.consent_events where profile_id = any($1::uuid[])', [ids]);
    await q.query('delete from public.recommendation_runs where profile_id = any($1::uuid[])', [ids]);
    await q.query('delete from public.worker_skills where profile_id = any($1::uuid[])', [ids]);
    await q.query('delete from public.assessment_results where profile_id = any($1::uuid[])', [ids]);

    let count = 0;
    for (const id of ids) {
      count += (await insertExtractedSkills(q, id)).inserted.length;
    }

    const now = await q.query<{ now: Date | string }>('select now() as now');
    const at = new Date(now.rows[0]!.now).toISOString();
    await q.query(
      `insert into public.demo_state (key, value, updated_at) values ('last_reset', $1::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify({ at, scenario_version: SCENARIO_VERSION, by_role: actor.role ?? 'cli' })],
    );
    await recordAudit(q, {
      actorUserId: actor.userId,
      actorRole: actor.role ?? 'cli',
      action: 'demo.reset',
      objectType: 'scenario',
      objectId: SCENARIO_VERSION,
      requestId: actor.requestId,
      metadata: { profiles_reset: ids.length, skills_seeded: count },
    });
    return { profileIds: ids, seeded: count, resetAt: at };
  });

  for (const id of profileIds) {
    await recompute(db, { actorUserId: null, actorRole: actor.role ?? 'cli', profileId: id, trigger: 'demo_reset', requestId: actor.requestId });
  }

  return { scenario_version: SCENARIO_VERSION, reset_at: resetAt, profiles_reset: profileIds.length, skills_seeded: seeded };
}
