import type { RoleEvaluation } from '../engine/types.ts';
import type { StoredRun } from '../services/recommendations.ts';

/** Shape returned to clients for a stored recommendation run. */
export function recommendationView(run: StoredRun) {
  const byId = new Map(run.result.evaluations.map((e) => [e.role_id, e]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((e): e is RoleEvaluation => Boolean(e));
  const eligible = run.result.evaluations.filter((e) => e.eligibility === 'eligible');
  return {
    run_id: run.id,
    computed_at: run.created_at,
    trigger: run.trigger,
    reused_previous_run: run.reused,
    scoring_version: run.result.scoring_version,
    dataset_version: run.result.dataset_version,
    input_hash: run.result.input_hash,
    evidence_factors: run.result.evidence_factors,
    score_type: 'estimated_skill_fit_not_hiring_probability',
    score_disclaimer: run.result.dataset_version.startsWith('ncr')
      ? 'Estimated skill fit from the Delhi-NCR pilot roles (team-drafted, not yet expert-reviewed). Not a hiring probability and not a vacancy.'
      : 'Estimated skill fit from the curated demo dataset. Not a hiring probability and not a vacancy.',
    top: pick(run.result.top_role_ids),
    other_eligible: eligible.filter((e) => !run.result.top_role_ids.includes(e.role_id)),
    stretch: pick(run.result.stretch_role_ids),
    filtered: pick(run.result.filtered_role_ids),
  };
}

export type RoleSnapshot = Pick<RoleEvaluation, 'role_fit_score' | 'readiness_status' | 'eligibility' | 'rank'>;

/** Per-role differences between two runs (used to show what an assessment changed). */
export function roleChanges(before: StoredRun | null, after: StoredRun) {
  const prev = new Map((before?.result.evaluations ?? []).map((e) => [e.role_id, e]));
  const snap = (e: RoleEvaluation | undefined): RoleSnapshot | null =>
    e ? { role_fit_score: e.role_fit_score, readiness_status: e.readiness_status, eligibility: e.eligibility, rank: e.rank } : null;
  return after.result.evaluations
    .map((e) => ({ role_id: e.role_id, title: e.title, before: snap(prev.get(e.role_id)), after: snap(e)! }))
    .filter(
      (c) =>
        !c.before ||
        c.before.role_fit_score !== c.after.role_fit_score ||
        c.before.readiness_status !== c.after.readiness_status ||
        c.before.eligibility !== c.after.eligibility ||
        c.before.rank !== c.after.rank,
    );
}
