import type { Db, Queryable } from '../db/types.ts';
import { rankRoles } from '../engine/scoring.ts';
import type { RecommendationResult, RoleDefinition, SkillInfo, WorkerPreferences, WorkerSkillState } from '../engine/types.ts';
import type { SkillStatus } from '../engine/vocabulary.ts';
import { recordAudit } from './audit.ts';

export interface Catalog {
  roles: RoleDefinition[];
  skills: SkillInfo[];
  datasetVersion: string;
}

export async function loadCatalog(q: Queryable): Promise<Catalog> {
  const roles = await q.query<{
    id: string; title: string; family: string; employment_type: RoleDefinition['employment_type'];
    work_mode: RoleDefinition['work_mode']; locations: string[]; salary_min_lpa: number | null;
    salary_max_lpa: number | null; dataset_version: string;
  }>(
    `select id, title, family, employment_type, work_mode, locations, salary_min_lpa, salary_max_lpa, dataset_version
     from public.roles order by id`,
  );
  const reqs = await q.query<{ role_id: string; skill_id: string; importance_weight: number; required_level: number; is_mandatory: boolean }>(
    `select role_id, skill_id, importance_weight, required_level, is_mandatory
     from public.role_requirements order by role_id, skill_id`,
  );
  const skills = await q.query<SkillInfo>(
    'select id, canonical_name, aliases, learning_hours_per_level from public.skills order by id',
  );

  const byRole = new Map<string, RoleDefinition['requirements']>();
  for (const r of reqs.rows) {
    const list = byRole.get(r.role_id) ?? [];
    list.push({
      skill_id: r.skill_id,
      importance_weight: Number(r.importance_weight),
      required_level: Number(r.required_level),
      is_mandatory: r.is_mandatory,
    });
    byRole.set(r.role_id, list);
  }

  const versions = [...new Set(roles.rows.map((r) => r.dataset_version))].sort();
  return {
    roles: roles.rows.map(({ dataset_version: _v, ...r }) => ({
      ...r,
      salary_min_lpa: r.salary_min_lpa === null ? null : Number(r.salary_min_lpa),
      salary_max_lpa: r.salary_max_lpa === null ? null : Number(r.salary_max_lpa),
      requirements: byRole.get(r.id) ?? [],
    })),
    skills: skills.rows.map((s) => ({ ...s, learning_hours_per_level: Number(s.learning_hours_per_level) })),
    datasetVersion: versions.join('+') || 'none',
  };
}

export async function loadWorkerState(q: Queryable, profileId: string): Promise<{ preferences: WorkerPreferences; skills: WorkerSkillState[] } | null> {
  const profile = await q.query<{ preferences: WorkerPreferences }>('select preferences from public.profiles where id = $1', [profileId]);
  const row = profile.rows[0];
  if (!row) return null;
  const skills = await q.query<{ skill_id: string; status: SkillStatus; proficiency: number | null }>(
    'select skill_id, status, proficiency from public.worker_skills where profile_id = $1 order by skill_id',
    [profileId],
  );
  return {
    preferences: row.preferences ?? {},
    skills: skills.rows.map((s) => ({ ...s, proficiency: s.proficiency === null ? null : Number(s.proficiency) })),
  };
}

export interface StoredRun {
  id: string;
  created_at: string;
  trigger: string;
  reused: boolean;
  result: RecommendationResult;
}

/** Same input hash as the latest run => reuse it (idempotent recompute). */
async function storeRun(q: Queryable, profileId: string, result: RecommendationResult, trigger: string): Promise<StoredRun> {
  const latest = await q.query<{ id: string; input_hash: string; created_at: Date | string; trigger: string }>(
    `select id, input_hash, created_at, trigger from public.recommendation_runs
     where profile_id = $1 order by created_at desc limit 1`,
    [profileId],
  );
  const prev = latest.rows[0];
  if (prev && prev.input_hash === result.input_hash) {
    return { id: prev.id, created_at: new Date(prev.created_at).toISOString(), trigger: prev.trigger, reused: true, result };
  }
  const inserted = await q.query<{ id: string; created_at: Date | string }>(
    `insert into public.recommendation_runs (profile_id, input_hash, dataset_version, scoring_version, trigger, result)
     values ($1, $2, $3, $4, $5, $6::jsonb) returning id, created_at`,
    [profileId, result.input_hash, result.dataset_version, result.scoring_version, trigger, JSON.stringify(result)],
  );
  const row = inserted.rows[0]!;
  return { id: row.id, created_at: new Date(row.created_at).toISOString(), trigger, reused: false, result };
}

/**
 * Reads the worker's evidence (in the worker's own RLS context when an actor
 * is given), runs the deterministic engine and stores the run.
 */
export async function recompute(
  db: Db,
  opts: { actorUserId: string | null; actorRole: string | null; profileId: string; trigger: string; requestId?: string },
): Promise<StoredRun> {
  const read = <T>(fn: (q: Queryable) => Promise<T>) => (opts.actorUserId ? db.asUser(opts.actorUserId, fn) : db.asService(fn));
  const { catalog, worker } = await read(async (q) => ({ catalog: await loadCatalog(q), worker: await loadWorkerState(q, opts.profileId) }));
  if (!worker) {
    throw new Error('Profile not readable for recompute.');
  }

  const result = rankRoles({
    roles: catalog.roles,
    catalog: catalog.skills,
    workerSkills: worker.skills,
    preferences: worker.preferences,
    datasetVersion: catalog.datasetVersion,
  });

  return db.asService(async (q) => {
    const run = await storeRun(q, opts.profileId, result, opts.trigger);
    if (!run.reused) {
      await recordAudit(q, {
        actorUserId: opts.actorUserId,
        actorRole: opts.actorRole,
        action: 'recommendations.computed',
        objectType: 'recommendation_run',
        objectId: run.id,
        subjectProfileId: opts.profileId,
        requestId: opts.requestId,
        metadata: { trigger: opts.trigger, scoring_version: result.scoring_version, top_role_ids: result.top_role_ids },
      });
    }
    return run;
  });
}

export async function latestRun(q: Queryable, profileId: string): Promise<StoredRun | null> {
  const r = await q.query<{ id: string; created_at: Date | string; trigger: string; result: RecommendationResult }>(
    `select id, created_at, trigger, result from public.recommendation_runs
     where profile_id = $1 order by created_at desc limit 1`,
    [profileId],
  );
  const row = r.rows[0];
  return row ? { id: row.id, created_at: new Date(row.created_at).toISOString(), trigger: row.trigger, reused: true, result: row.result } : null;
}
