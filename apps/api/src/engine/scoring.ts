import { sha256, stableStringify } from './hash.ts';
import type {
  ConstraintResult,
  GapItem,
  MandatoryCheck,
  RecommendationResult,
  RequirementBreakdown,
  RoleDefinition,
  RoleEvaluation,
  SkillInfo,
  WorkerPreferences,
  WorkerSkillState,
} from './types.ts';
import { EVIDENCE_FACTORS, PROFICIENCY_LABELS, SCORING_VERSION, TOP_ROLE_COUNT, type SkillStatus } from './vocabulary.ts';

/**
 * Adjacency Engine, scoring rule fit-v1.
 *
 *   role_fit_score = 100 × Σ(w_i × min(p_i / q_i, 1) × e_i) / Σ w_i
 *
 * - w_i  importance weight (1–5), q_i required level (1–4),
 *   p_i  worker level (0–4; unknown contributes nothing),
 *   e_i  evidence factor for the claim's status (see EVIDENCE_FACTORS).
 * - Mandatory requirements are a separate gate and can block a role no matter
 *   how high its score is.
 * - Hard constraints are applied before ranking; filtered roles keep their
 *   reason.
 * - The score is an estimated skill fit, never a hiring probability.
 * - Pure and deterministic: no clock, randomness or I/O.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

const levelLabel = (level: number | null) =>
  level === null ? 'unknown' : `${level} (${PROFICIENCY_LABELS[level] ?? '?'})`;

const statusLabel: Record<SkillStatus, string> = {
  verified: 'verified by assessment',
  self_reported: 'confirmed by worker',
  inferred: 'inferred from work history, not yet reviewed',
  unknown: 'no evidence yet',
  not_demonstrated: 'not demonstrated in assessment',
};

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function checkConstraints(role: RoleDefinition, prefs: WorkerPreferences, estimatedWeeks: number | null): {
  failures: ConstraintResult[];
  notes: string[];
} {
  const failures: ConstraintResult[] = [];
  const notes: string[] = [];

  if (prefs.employment_types && prefs.employment_types.length > 0) {
    if (!prefs.employment_types.includes(role.employment_type)) {
      failures.push({
        code: 'employment_type',
        message: `Role is ${role.employment_type === 'independent' ? 'independent/freelance work' : 'salaried employment'}, which is not in your preferences.`,
      });
    }
  } else {
    notes.push('Employment-type preference not set; not applied.');
  }

  if (prefs.work_modes && prefs.work_modes.length > 0 && !prefs.work_modes.includes(role.work_mode)) {
    failures.push({ code: 'work_mode', message: `Role is ${role.work_mode}; you did not select that work mode.` });
  }

  if (role.work_mode !== 'remote') {
    if (prefs.locations && prefs.locations.length > 0) {
      const overlap = role.locations.some((l) => prefs.locations!.some((p) => sameText(p, l)));
      if (!overlap) {
        failures.push({
          code: 'location',
          message: `Role is based in ${role.locations.join(', ') || 'an unspecified location'}; none match your locations.`,
        });
      }
    } else {
      notes.push('Location preference not set; not applied.');
    }
  }

  if (prefs.salary_floor_lpa != null) {
    if (role.salary_max_lpa == null) {
      notes.push('No salary data for this role; salary floor not applied.');
    } else if (role.salary_max_lpa < prefs.salary_floor_lpa) {
      failures.push({
        code: 'salary_floor',
        message: `Illustrative salary band tops out at ₹${role.salary_max_lpa} LPA, below your floor of ₹${prefs.salary_floor_lpa} LPA.`,
      });
    }
  }

  if (prefs.max_transition_weeks != null && estimatedWeeks != null && estimatedWeeks > prefs.max_transition_weeks) {
    failures.push({
      code: 'learning_time',
      message: `Estimated gap effort (~${estimatedWeeks} weeks at your weekly learning time) exceeds your limit of ${prefs.max_transition_weeks} weeks.`,
    });
  }

  return { failures, notes };
}

export function evaluateRole(
  role: RoleDefinition,
  workerSkills: ReadonlyMap<string, WorkerSkillState>,
  catalog: ReadonlyMap<string, SkillInfo>,
  prefs: WorkerPreferences,
): RoleEvaluation {
  const requirements = [...role.requirements].sort((a, b) => (a.skill_id < b.skill_id ? -1 : 1));
  const totalWeight = requirements.reduce((sum, r) => sum + r.importance_weight, 0);
  const base = {
    role_id: role.id,
    title: role.title,
    family: role.family,
    employment_type: role.employment_type,
    work_mode: role.work_mode,
    score_type: 'estimated_skill_fit_not_hiring_probability' as const,
    market_fit: 'not_assessed' as const,
  };

  const invalid =
    requirements.length === 0 ||
    totalWeight <= 0 ||
    requirements.some((r) => r.required_level < 1 || r.importance_weight <= 0 || !catalog.has(r.skill_id));
  if (invalid) {
    return {
      ...base,
      role_fit_score: null,
      evidence_confidence: 0,
      readiness_status: 'blocked',
      eligibility: 'data_error',
      rank: null,
      mandatory: [],
      critical_gaps: [],
      unknowns: [],
      transferable: [],
      breakdown: [],
      constraint_failures: [],
      constraint_notes: [],
      estimated_learning_hours: 0,
      estimated_learning_weeks: null,
      explanation: ['Role data is invalid (missing requirements, zero weight or zero required level); no score was computed.'],
    };
  }

  const breakdown: RequirementBreakdown[] = [];
  const mandatory: MandatoryCheck[] = [];
  const critical_gaps: GapItem[] = [];
  const unknowns: GapItem[] = [];
  const transferable: GapItem[] = [];
  let weightedCoverage = 0;
  let weightedEvidence = 0;
  let learningHours = 0;

  for (const req of requirements) {
    const info = catalog.get(req.skill_id)!;
    const claim = workerSkills.get(req.skill_id);
    const status: SkillStatus = claim?.status ?? 'unknown';
    const level = status === 'unknown' ? null : (claim?.proficiency ?? null);
    const factor = EVIDENCE_FACTORS[status];
    const ratio = level === null ? 0 : Math.min(level / req.required_level, 1);
    const coverage = ratio * factor;

    weightedCoverage += req.importance_weight * coverage;
    weightedEvidence += req.importance_weight * factor;

    breakdown.push({
      skill_id: req.skill_id,
      name: info.canonical_name,
      importance_weight: req.importance_weight,
      required_level: req.required_level,
      worker_level: level,
      status,
      is_mandatory: req.is_mandatory,
      evidence_factor: factor,
      coverage: round1(coverage * 100) / 100,
      contribution: round1((100 * req.importance_weight * coverage) / totalWeight),
    });

    const item: GapItem = {
      skill_id: req.skill_id,
      name: info.canonical_name,
      required_level: req.required_level,
      worker_level: level,
      status,
      importance_weight: req.importance_weight,
      is_mandatory: req.is_mandatory,
      hours_per_level: info.learning_hours_per_level,
    };

    if (status === 'unknown') {
      unknowns.push(item);
    } else if (status === 'not_demonstrated' || (level ?? 0) < req.required_level) {
      critical_gaps.push(item);
      learningHours += (req.required_level - Math.min(level ?? 0, req.required_level)) * info.learning_hours_per_level;
    } else {
      transferable.push(item);
    }

    if (req.is_mandatory) {
      let gate: MandatoryCheck['gate'];
      let reason: string;
      if (status === 'unknown') {
        gate = 'needs_validation';
        reason = 'No evidence yet. Treated as unknown, not as missing.';
      } else if (status === 'not_demonstrated') {
        gate = 'blocker';
        reason = `Not demonstrated at level ${req.required_level} in the latest assessment.`;
      } else if ((level ?? 0) < req.required_level) {
        gate = 'blocker';
        reason = `Current level ${levelLabel(level)} is below the required ${levelLabel(req.required_level)}.`;
      } else if (status === 'verified') {
        gate = 'cleared';
        reason = `Verified at ${levelLabel(level)}.`;
      } else {
        gate = 'needs_validation';
        reason = `Level ${levelLabel(level)} is ${statusLabel[status]}; needs verification.`;
      }
      mandatory.push({ skill_id: req.skill_id, name: info.canonical_name, required_level: req.required_level, worker_level: level, status, gate, reason });
    }
  }

  const byImportance = (a: GapItem, b: GapItem) =>
    b.importance_weight - a.importance_weight || (a.skill_id < b.skill_id ? -1 : 1);
  critical_gaps.sort(byImportance);
  unknowns.sort(byImportance);
  transferable.sort(byImportance);

  const readiness_status = mandatory.some((m) => m.gate === 'blocker')
    ? 'blocked'
    : mandatory.some((m) => m.gate === 'needs_validation')
      ? 'needs_validation'
      : 'ready';

  const weekly = prefs.weekly_learning_hours ?? null;
  const estimated_learning_weeks = weekly && weekly > 0 ? Math.ceil(learningHours / weekly) : null;
  const { failures, notes } = checkConstraints(role, prefs, estimated_learning_weeks);

  const eligibility = failures.length > 0 ? 'filtered' : readiness_status === 'blocked' ? 'stretch' : 'eligible';

  const evaluation: RoleEvaluation = {
    ...base,
    role_fit_score: round1((100 * weightedCoverage) / totalWeight),
    evidence_confidence: round1((100 * weightedEvidence) / totalWeight),
    readiness_status,
    eligibility,
    rank: null,
    mandatory,
    critical_gaps,
    unknowns,
    transferable,
    breakdown,
    constraint_failures: failures,
    constraint_notes: notes,
    estimated_learning_hours: learningHours,
    estimated_learning_weeks,
    explanation: [],
  };
  evaluation.explanation = explain(evaluation, requirements.length);
  return evaluation;
}

function explain(e: RoleEvaluation, requirementCount: number): string[] {
  const lines: string[] = [];
  const met = e.transferable;
  const counts = {
    verified: met.filter((m) => m.status === 'verified').length,
    self_reported: met.filter((m) => m.status === 'self_reported').length,
    inferred: met.filter((m) => m.status === 'inferred').length,
  };
  lines.push(
    `Meets ${met.length} of ${requirementCount} requirements at the required level ` +
      `(${counts.verified} verified, ${counts.self_reported} worker-confirmed, ${counts.inferred} inferred and unreviewed).`,
  );

  const blockers = e.mandatory.filter((m) => m.gate === 'blocker');
  const pending = e.mandatory.filter((m) => m.gate === 'needs_validation');
  if (blockers.length > 0) {
    lines.push(`Blocked by mandatory requirement: ${blockers.map((b) => `${b.name} — ${b.reason}`).join('; ')}`);
  } else if (pending.length > 0) {
    lines.push(`Mandatory requirements still need verification: ${pending.map((p) => p.name).join(', ')}.`);
  } else if (e.mandatory.length > 0) {
    lines.push('All mandatory requirements are verified.');
  }

  const top = e.critical_gaps[0];
  if (top) {
    lines.push(`Largest gap: ${top.name} (level ${top.worker_level ?? 0} → ${top.required_level}, weight ${top.importance_weight}).`);
  }
  if (e.unknowns.length > 0) {
    lines.push(`Unknown, not counted as missing: ${e.unknowns.map((u) => u.name).join(', ')}.`);
  }
  for (const f of e.constraint_failures) {
    lines.push(`Filtered before ranking: ${f.message}`);
  }
  lines.push(`Evidence confidence ${e.evidence_confidence}%: share of requirement weight backed by evidence, discounted by evidence type.`);
  return lines;
}

export interface RankInput {
  roles: RoleDefinition[];
  catalog: SkillInfo[];
  workerSkills: WorkerSkillState[];
  preferences: WorkerPreferences;
  datasetVersion: string;
}

/** Only constraint-relevant preference keys enter the hash and the engine. */
function constraintPreferences(p: WorkerPreferences): WorkerPreferences {
  return {
    locations: p.locations,
    work_modes: p.work_modes,
    employment_types: p.employment_types,
    salary_floor_lpa: p.salary_floor_lpa,
    weekly_learning_hours: p.weekly_learning_hours,
    max_transition_weeks: p.max_transition_weeks,
  };
}

export function computeInputHash(input: RankInput): string {
  return sha256(
    stableStringify({
      scoring_version: SCORING_VERSION,
      dataset_version: input.datasetVersion,
      evidence_factors: EVIDENCE_FACTORS,
      preferences: constraintPreferences(input.preferences),
      skills: [...input.workerSkills]
        .map((s) => ({ skill_id: s.skill_id, status: s.status, proficiency: s.status === 'unknown' ? null : s.proficiency }))
        .sort((a, b) => (a.skill_id < b.skill_id ? -1 : 1)),
      roles: [...input.roles]
        .map((r) => ({ ...r, requirements: [...r.requirements].sort((a, b) => (a.skill_id < b.skill_id ? -1 : 1)) }))
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
      catalog: [...input.catalog]
        .map((s) => ({ id: s.id, hours: s.learning_hours_per_level }))
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
    }),
  );
}

export function rankRoles(input: RankInput): RecommendationResult {
  const catalog = new Map(input.catalog.map((s) => [s.id, s]));
  const skills = new Map(input.workerSkills.map((s) => [s.skill_id, s]));
  const prefs = constraintPreferences(input.preferences);

  const evaluations = [...input.roles]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((role) => evaluateRole(role, skills, catalog, prefs));

  const order = (a: RoleEvaluation, b: RoleEvaluation) =>
    (b.role_fit_score ?? -1) - (a.role_fit_score ?? -1) ||
    b.evidence_confidence - a.evidence_confidence ||
    (a.role_id < b.role_id ? -1 : 1);

  const eligible = evaluations.filter((e) => e.eligibility === 'eligible').sort(order);
  eligible.forEach((e, i) => {
    e.rank = i + 1;
    e.explanation.push(
      `Rank ${i + 1} of ${eligible.length} eligible roles by estimated skill fit (ties broken by evidence confidence, then role id).`,
    );
  });

  const stretch = evaluations.filter((e) => e.eligibility === 'stretch').sort(order);
  const filtered = evaluations.filter((e) => e.eligibility === 'filtered' || e.eligibility === 'data_error').sort(order);

  return {
    scoring_version: SCORING_VERSION,
    dataset_version: input.datasetVersion,
    input_hash: computeInputHash(input),
    evidence_factors: { ...EVIDENCE_FACTORS },
    top_role_ids: eligible.slice(0, TOP_ROLE_COUNT).map((e) => e.role_id),
    stretch_role_ids: stretch.map((e) => e.role_id),
    filtered_role_ids: filtered.map((e) => e.role_id),
    evaluations: [...eligible, ...stretch, ...filtered],
  };
}
