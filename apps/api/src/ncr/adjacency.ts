import { isStepBack, learningPlan, studyNext, type LearningPlan, type StudyItem } from '../engine/plan.ts';
import { rankRoles } from '../engine/scoring.ts';
import type { RecommendationResult, RoleDefinition, RoleEvaluation, SkillInfo, WorkerPreferences, WorkerSkillState } from '../engine/types.ts';
import { SCORING_VERSION, type SkillStatus } from '../engine/vocabulary.ts';
import type { NcrDataset } from './dataset.ts';

/**
 * Delhi-NCR adjacency: reviewed role data in, explainable roles out.
 * Scoring is the deterministic fit-v1 engine (estimated skill fit, never hiring probability).
 * This module only adapts the dataset, applies the recommendation bar, and keeps role fit,
 * evidence confidence, readiness, demand signal and vacancies as separate fields.
 */

export interface NcrProfileSkill {
  skill_id: string;
  status: SkillStatus;
  proficiency: number | null;
  /** Sentence from the worker's own resume, shown back as evidence. Never a score input. */
  evidence?: string | null;
}

export interface NcrPreferences {
  cities?: string[];
  work_modes?: Array<'onsite' | 'hybrid' | 'remote'>;
  weekly_learning_hours?: number | null;
  max_transition_weeks?: number | null;
}

export interface MatchedSkill {
  skill_id: string;
  name: string;
  status: SkillStatus;
  worker_level: number | null;
  required_level: number;
  meets_required: boolean;
  evidence: string | null;
}

export interface NcrRecommendedRole {
  role_id: string;
  title: string;
  sector: string;
  seniority: string;
  estimated_skill_fit: number | null;
  score_type: 'estimated_skill_fit_not_hiring_probability';
  evidence_confidence: number;
  readiness_status: RoleEvaluation['readiness_status'];
  eligibility: RoleEvaluation['eligibility'];
  matching_skills: MatchedSkill[];
  critical_gaps: RoleEvaluation['critical_gaps'];
  mandatory_blockers: RoleEvaluation['mandatory'];
  unknown_requirements: RoleEvaluation['unknowns'];
  constraint_exclusion: string | null;
  estimated_learning_weeks: number | null;
  explanation: string[];
  requirement_source: {
    reviewer_status: string;
    source_urls: string[];
    dataset_collected_at: string;
    occupation_code: string | null;
    freshness_note: string;
  };
  /** Separate record from fit: a small simulated sample, never a statement about real demand. */
  demand_signal: {
    kind: 'simulated_sample';
    sample_size: number;
    cities: string[];
    note: string;
  };
  /** Separate record again: no vacancy feed is connected. */
  vacancies: { status: 'none_connected'; items: []; note: string };
  known_transitions_into_role: Array<{ from_role_id: string; reviewer_status: string }>;
  /** What to learn or prove for this role, in order, with hours and the fit it would add. */
  learning_plan: LearningPlan;
  /** The worker said (or the resume shows) they hold this role now. */
  is_current_role: boolean;
  /** Less senior than the current role and already mostly met: shown, but ranked after real moves. */
  is_step_back: boolean;
  /** A documented move from the worker's current role into this one, if the dataset has it. */
  transition: {
    from_role_id: string;
    from_title: string;
    transferable_skill_ids: string[];
    gap_skill_ids: string[];
    rationale: string;
    reviewer_status: string;
  } | null;
}

export interface NcrRecommendation {
  adjacency_version: string;
  scoring_version: string;
  dataset_version: string;
  input_hash: string;
  region_scope: string;
  top_roles: NcrRecommendedRole[];
  stretch_roles: NcrRecommendedRole[];
  excluded_roles: NcrRecommendedRole[];
  /** The role(s) the worker holds now: shown as the starting point, never as a recommendation. */
  current_roles: NcrRecommendedRole[];
  /** Skills that move the most nearby roles per hour of study. */
  study_next: StudyItem[];
  /** Set when no role clears the recommendation bar. */
  message: string | null;
  bar: { min_estimated_fit: number; min_matched_requirements: number; note: string };
  limitations: string[];
}

/** True when a role clears the pilot recommendation bar (a configured cut-off, not a probability). */
export function meetsRecommendationBar(e: RoleEvaluation, bar: NcrDataset['config']['recommendation_bar']): boolean {
  const evidenced = e.breakdown.filter((b) => b.status !== 'unknown' && (b.worker_level ?? 0) > 0).length;
  return (e.role_fit_score ?? 0) >= bar.min_estimated_fit && evidenced >= bar.min_matched_requirements;
}

/** Drops top roles that do not clear the bar; the full evaluation list is kept for explanations. */
export function applyRecommendationBar(result: RecommendationResult, bar: NcrDataset['config']['recommendation_bar']): RecommendationResult {
  const byId = new Map(result.evaluations.map((e) => [e.role_id, e]));
  return { ...result, top_role_ids: result.top_role_ids.filter((id) => meetsRecommendationBar(byId.get(id)!, bar)) };
}

const SIMULATED_NOTE = 'Simulated listings written by the team to exercise the pipeline. They are not market demand and not live vacancies.';

export function engineInputs(ds: NcrDataset): { catalog: SkillInfo[]; roles: RoleDefinition[] } {
  const catalog: SkillInfo[] = ds.skills.map((s) => ({
    id: s.id,
    canonical_name: s.name,
    aliases: s.aliases,
    learning_hours_per_level: ds.config.learning_hours_per_level[s.category] ?? 15,
  }));

  const roles: RoleDefinition[] = ds.roles.map((r) => {
    const modes = ds.evidence.filter((e) => e.canonical_role_id === r.id).map((e) => e.work_mode);
    const count = (m: string) => modes.filter((x) => x === m).length;
    // Modal work mode of the simulated sample; hybrid when there is no sample or a tie.
    const work_mode = count('onsite') > count('hybrid') && count('onsite') >= count('remote') ? 'onsite' : 'hybrid';
    return {
      id: r.id,
      title: r.title,
      family: r.sector,
      employment_type: 'employee',
      work_mode,
      locations: ds.config.cities,
      salary_min_lpa: null,
      salary_max_lpa: null,
      requirements: ds.roleSkills
        .filter((rs) => rs.role_id === r.id)
        .map((rs) => ({
          skill_id: rs.skill_id,
          importance_weight: rs.importance_weight,
          required_level: rs.required_proficiency,
          is_mandatory: rs.is_mandatory,
        })),
    };
  });
  return { catalog, roles };
}

function toEnginePreferences(p: NcrPreferences): WorkerPreferences {
  return {
    locations: p.cities,
    work_modes: p.work_modes,
    employment_types: undefined,
    salary_floor_lpa: null,
    weekly_learning_hours: p.weekly_learning_hours ?? null,
    max_transition_weeks: p.max_transition_weeks ?? null,
  };
}

export interface RecommendOptions {
  /** Pilot role ids the worker holds now (confirmed from the resume). Never ranked as a "next" role. */
  currentRoleIds?: string[];
}

export function recommend(ds: NcrDataset, skills: NcrProfileSkill[], preferences: NcrPreferences = {}, options: RecommendOptions = {}): NcrRecommendation {
  const current = new Set((options.currentRoleIds ?? []).filter((id) => ds.roles.some((r) => r.id === id)));
  const { catalog, roles } = engineInputs(ds);
  const workerSkills: WorkerSkillState[] = skills.map((s) => ({ skill_id: s.skill_id, status: s.status, proficiency: s.proficiency }));
  const evidenceBySkill = new Map(skills.map((s) => [s.skill_id, s.evidence ?? null]));
  const result = rankRoles({ roles, catalog, workerSkills, preferences: toEnginePreferences(preferences), datasetVersion: ds.config.dataset_version });
  const bar = ds.config.recommendation_bar;
  const roleRows = new Map(ds.roles.map((r) => [r.id, r]));

  const present = (e: RoleEvaluation): NcrRecommendedRole => {
    const row = roleRows.get(e.role_id)!;
    const reqRows = ds.roleSkills.filter((rs) => rs.role_id === e.role_id);
    const sample = ds.evidence.filter((x) => x.canonical_role_id === e.role_id);
    const statuses = [...new Set(reqRows.map((rs) => rs.reviewer_status))].sort();
    return {
      role_id: e.role_id,
      title: e.title,
      sector: row.sector,
      seniority: row.seniority,
      estimated_skill_fit: e.role_fit_score,
      score_type: e.score_type,
      evidence_confidence: e.evidence_confidence,
      readiness_status: e.readiness_status,
      eligibility: e.eligibility,
      matching_skills: e.breakdown
        .filter((b) => b.status !== 'unknown' && (b.worker_level ?? 0) > 0)
        .map((b) => ({
          skill_id: b.skill_id,
          name: b.name,
          status: b.status,
          worker_level: b.worker_level,
          required_level: b.required_level,
          meets_required: (b.worker_level ?? 0) >= b.required_level,
          evidence: evidenceBySkill.get(b.skill_id) ?? null,
        })),
      critical_gaps: e.critical_gaps,
      mandatory_blockers: e.mandatory.filter((m) => m.gate !== 'cleared'),
      unknown_requirements: e.unknowns,
      constraint_exclusion: e.constraint_failures[0]?.message ?? null,
      estimated_learning_weeks: e.estimated_learning_weeks,
      explanation: e.explanation,
      requirement_source: {
        reviewer_status: statuses.join(', ') || 'none',
        source_urls: [...new Set(reqRows.map((rs) => rs.source_url).filter(Boolean))],
        dataset_collected_at: ds.config.collected_at,
        occupation_code: row.occupation_code || null,
        freshness_note: 'Team-drafted requirements; not yet reviewed by a domain expert or validated against live Delhi-NCR listings.',
      },
      demand_signal: {
        kind: 'simulated_sample',
        sample_size: sample.length,
        cities: [...new Set(sample.map((x) => x.city))].sort(),
        note: SIMULATED_NOTE,
      },
      vacancies: { status: 'none_connected', items: [], note: 'No vacancy feed is connected. Nothing here is a live opening.' },
      known_transitions_into_role: ds.transitions
        .filter((t) => t.target_role_id === e.role_id)
        .map((t) => ({ from_role_id: t.source_role_id, reviewer_status: t.reviewer_status })),
      learning_plan: learningPlan(e, preferences.weekly_learning_hours ?? null),
      is_current_role: current.has(e.role_id),
      is_step_back: stepBack(e),
      transition: transitionInto(e.role_id),
    };
  };

  const currentSeniority = [...current].map((id) => roleRows.get(id)?.seniority ?? null).sort().pop() ?? null;
  const stepBack = (e: RoleEvaluation) => isStepBack(e, roleRows.get(e.role_id)?.seniority, currentSeniority);

  const transitionInto = (roleId: string): NcrRecommendedRole['transition'] => {
    const t = ds.transitions.find((x) => x.target_role_id === roleId && current.has(x.source_role_id));
    if (!t) return null;
    return {
      from_role_id: t.source_role_id,
      from_title: roleRows.get(t.source_role_id)?.title ?? t.source_role_id,
      transferable_skill_ids: t.transferable_skill_ids,
      gap_skill_ids: t.gap_skill_ids,
      rationale: t.transition_rationale,
      reviewer_status: t.reviewer_status,
    };
  };

  const byId = new Map(result.evaluations.map((e) => [e.role_id, e]));
  const meetsBar = (e: RoleEvaluation) => meetsRecommendationBar(e, bar);
  const next = (e: RoleEvaluation) => !current.has(e.role_id);

  // Eligible roles beyond the top three are pulled up when a current role was removed from the list.
  // Real moves first; a step back only fills a slot when nothing else clears the bar.
  const eligible = result.evaluations
    .filter((e) => e.eligibility === 'eligible')
    .filter(next)
    .filter(meetsBar)
    .sort((a, b) => Number(stepBack(a)) - Number(stepBack(b)));
  const feasible = eligible.slice(0, result.top_role_ids.length || 3);
  const stretch = result.stretch_role_ids.map((id) => byId.get(id)!).filter(next).filter(meetsBar);
  const excluded = result.evaluations.filter((e) => e.eligibility === 'filtered');

  const message =
    feasible.length > 0
      ? null
      : excluded.length === result.evaluations.length
        ? 'Your preferences exclude every role in the Delhi-NCR pilot dataset. Relax a preference to see roles.'
        : 'No role in the Delhi-NCR pilot dataset has enough evidenced skills to recommend yet. Add or confirm more skills, or take an assessment.';

  return {
    adjacency_version: ds.config.adjacency_version,
    scoring_version: SCORING_VERSION,
    dataset_version: result.dataset_version,
    input_hash: result.input_hash,
    region_scope: ds.config.region_scope,
    top_roles: feasible.map(present),
    stretch_roles: stretch.map(present),
    excluded_roles: excluded.map(present),
    current_roles: result.evaluations.filter((e) => current.has(e.role_id)).map(present),
    study_next: studyNext(result.evaluations, { exclude: [...current] }),
    message,
    bar,
    limitations: ds.config.limitations,
  };
}
