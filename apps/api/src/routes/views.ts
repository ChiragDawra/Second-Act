import { isStepBack, learningPlan, studyNext } from '../engine/plan.ts';
import { fromDbId } from '../ncr/catalogue.ts';
import { getNcrDataset } from '../ncr/dataset.ts';
import type { RoleEvaluation } from '../engine/types.ts';
import type { StoredRun } from '../services/recommendations.ts';

/**
 * Current role and step-back flags for a Delhi-NCR run. The current role is matched by title (the
 * profile stores the title the worker confirmed); demo-catalogue runs get no annotations.
 */
function roleNotes(evaluations: RoleEvaluation[], currentRoleTitle: string | null) {
  const ds = getNcrDataset();
  const rows = new Map(ds.roles.map((r) => [r.id, r]));
  const current = currentRoleTitle ? (ds.roles.find((r) => r.title === currentRoleTitle) ?? null) : null;
  const notes: Record<string, { is_current: boolean; step_back: boolean }> = {};
  for (const e of evaluations) {
    const row = rows.get(fromDbId(e.role_id));
    if (!row) continue;
    notes[e.role_id] = { is_current: current?.id === row.id, step_back: current ? isStepBack(e, row.seniority, current.seniority) : false };
  }
  return { current_role_id: current ? evaluations.find((e) => fromDbId(e.role_id) === current.id)?.role_id ?? null : null, notes };
}

/** Shape returned to clients for a stored recommendation run. */
export function recommendationView(run: StoredRun, context: { currentRoleTitle?: string | null } = {}) {
  const byId = new Map(run.result.evaluations.map((e) => [e.role_id, e]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((e): e is RoleEvaluation => Boolean(e));
  const eligible = run.result.evaluations.filter((e) => e.eligibility === 'eligible');
  const annotated = run.result.dataset_version.startsWith('ncr')
    ? roleNotes(run.result.evaluations, context.currentRoleTitle ?? null)
    : { current_role_id: null, notes: {} as Record<string, { is_current: boolean; step_back: boolean }> };
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
    /** Skills that move the most nearby roles per hour of study, from this same run. */
    study_next: studyNext(run.result.evaluations, { exclude: annotated.current_role_id ? [annotated.current_role_id] : [] }),
    /** The worker's current role (never a "next" role) and roles that would be a step back from it. */
    current_role_id: annotated.current_role_id,
    notes: annotated.notes,
    /** Learning plan per reachable role (weeks are left to the client, which knows the weekly hours). */
    plans: Object.fromEntries(
      [...pick(run.result.top_role_ids), ...eligible, ...pick(run.result.stretch_role_ids)].map((e) => [e.role_id, learningPlan(e)]),
    ),
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
