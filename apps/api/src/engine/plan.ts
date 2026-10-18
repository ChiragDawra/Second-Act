import type { GapItem, RoleEvaluation } from './types.ts';
import { EVIDENCE_FACTORS, PROFICIENCY_LABELS } from './vocabulary.ts';

/**
 * Learning plans on top of fit-v1 evaluations. Pure, deterministic, no I/O.
 *
 * For one role: which skills to learn or prove, in what order, how long it takes, and what the
 * estimated fit would be afterwards. Across roles: which single skill moves the most roles per
 * hour of study ("study next"). Gains use the same formula as the score, assuming a newly learned
 * skill is self-reported (it stays self-reported until an assessment verifies it).
 */

const DEFAULT_HOURS_PER_LEVEL = 15;
const PROVE_HOURS = 1;
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface PlanStep {
  skill_id: string;
  name: string;
  /** learn: raise a level · learn_or_confirm: no evidence yet, you may already have it · prove: take an assessment. */
  kind: 'learn' | 'learn_or_confirm' | 'prove';
  from_level: number | null;
  to_level: number;
  hours: number;
  is_mandatory: boolean;
  importance_weight: number;
  /** Estimated-fit points this step adds to this role. */
  fit_gain: number;
  reason: string;
}

export interface LearningPlan {
  steps: PlanStep[];
  total_hours: number;
  /** At the worker's weekly learning time; null when they have not set one. */
  weeks: number | null;
  fit_now: number | null;
  /** Estimated fit once every learn step is done (self-reported). Proving skills raises it further. */
  fit_after_learning: number | null;
}

const label = (level: number | null) => (level === null ? 'no evidence' : `${level} ${PROFICIENCY_LABELS[level] ?? ''}`.trim());

function hoursIndex(e: RoleEvaluation): Map<string, number> {
  const map = new Map<string, number>();
  for (const g of [...e.critical_gaps, ...e.unknowns, ...e.transferable] as GapItem[]) {
    map.set(g.skill_id, g.hours_per_level ?? DEFAULT_HOURS_PER_LEVEL);
  }
  return map;
}

export function learningPlan(e: RoleEvaluation, weeklyHours: number | null = null): LearningPlan {
  if (e.role_fit_score === null || e.breakdown.length === 0) {
    return { steps: [], total_hours: 0, weeks: null, fit_now: e.role_fit_score, fit_after_learning: null };
  }
  const totalWeight = e.breakdown.reduce((s, b) => s + b.importance_weight, 0);
  const hours = hoursIndex(e);
  const mandatory = new Map(e.mandatory.map((m) => [m.skill_id, m]));
  const learned = EVIDENCE_FACTORS.self_reported;
  const steps: PlanStep[] = [];

  for (const b of e.breakdown) {
    const now = b.coverage; // ratio × evidence factor, already in 0..1
    const perLevel = hours.get(b.skill_id) ?? DEFAULT_HOURS_PER_LEVEL;
    const below = b.status === 'unknown' || b.status === 'not_demonstrated' || (b.worker_level ?? 0) < b.required_level;
    if (below) {
      const from = b.status === 'unknown' ? null : (b.worker_level ?? 0);
      const gain = (100 * b.importance_weight * Math.max(0, learned - now)) / totalWeight;
      steps.push({
        skill_id: b.skill_id,
        name: b.name,
        kind: b.status === 'unknown' ? 'learn_or_confirm' : 'learn',
        from_level: from,
        to_level: b.required_level,
        hours: (b.required_level - Math.min(from ?? 0, b.required_level)) * perLevel,
        is_mandatory: b.is_mandatory,
        importance_weight: b.importance_weight,
        fit_gain: round1(gain),
        reason:
          b.status === 'unknown'
            ? `No evidence yet. If you already do this, add it to your skills; otherwise learn it to level ${label(b.required_level)}.`
            : `You are at ${label(from)}; the role needs ${label(b.required_level)}.`,
      });
      continue;
    }
    // At the level already. A mandatory requirement that is not verified keeps the role "needs validation".
    const gate = mandatory.get(b.skill_id);
    if (gate && gate.gate === 'needs_validation') {
      steps.push({
        skill_id: b.skill_id,
        name: b.name,
        kind: 'prove',
        from_level: b.worker_level,
        to_level: b.required_level,
        hours: PROVE_HOURS,
        is_mandatory: true,
        importance_weight: b.importance_weight,
        fit_gain: round1((100 * b.importance_weight * (1 - now)) / totalWeight),
        reason: 'Mandatory for this role and not verified yet. A short assessment clears it.',
      });
    }
  }

  // Blockers first, then the best fit gain per hour, then the most important skill.
  steps.sort(
    (a, b) =>
      Number(b.is_mandatory && b.kind !== 'prove') - Number(a.is_mandatory && a.kind !== 'prove') ||
      b.fit_gain / Math.max(b.hours, 1) - a.fit_gain / Math.max(a.hours, 1) ||
      b.importance_weight - a.importance_weight ||
      (a.skill_id < b.skill_id ? -1 : 1),
  );

  const learnSteps = steps.filter((s) => s.kind !== 'prove');
  const total = learnSteps.reduce((s, x) => s + x.hours, 0);
  const gain = learnSteps.reduce((s, x) => s + x.fit_gain, 0);
  return {
    steps,
    total_hours: total,
    weeks: weeklyHours && weeklyHours > 0 ? Math.ceil(total / weeklyHours) : null,
    fit_now: e.role_fit_score,
    fit_after_learning: round1(Math.min(100, e.role_fit_score + gain)),
  };
}

const SENIORITY = ['junior', 'junior-mid', 'mid', 'senior', 'lead'];
const seniorityRank = (s: string | null | undefined) => (s ? SENIORITY.indexOf(s.trim().toLowerCase()) : -1);

/** Share of a role's requirement weight the worker already meets at the required level. */
export function metShare(e: RoleEvaluation): number {
  const total = e.breakdown.reduce((s, b) => s + b.importance_weight, 0);
  if (total <= 0) return 0;
  const met = e.breakdown.filter((b) => b.status !== 'unknown' && b.status !== 'not_demonstrated' && (b.worker_level ?? 0) >= b.required_level);
  return met.reduce((s, b) => s + b.importance_weight, 0) / total;
}

/**
 * A move to a less senior role that the worker could already do (60%+ of it met) is a step back,
 * not a next act. A less senior role with real new skills ("Junior Test Automation Engineer" for
 * a manual tester) is a pivot and is not flagged.
 */
export function isStepBack(e: RoleEvaluation, targetSeniority: string | null | undefined, currentSeniority: string | null | undefined): boolean {
  const target = seniorityRank(targetSeniority);
  const current = seniorityRank(currentSeniority);
  return target !== -1 && current !== -1 && target < current && metShare(e) >= 0.6;
}

export interface StudyItem {
  skill_id: string;
  name: string;
  /** Hours to reach the highest level any of these roles asks for. */
  hours: number;
  to_level: number;
  from_level: number | null;
  /** Sum of estimated-fit points over the roles this skill moves. */
  fit_gain_total: number;
  roles: Array<{ role_id: string; title: string; fit_gain: number }>;
  reason: string;
}

/**
 * The skills worth studying next across the roles that are realistic for this person: eligible and
 * stretch roles (never filtered ones), best fit first. Ranked by fit points gained per hour.
 */
export function studyNext(evaluations: RoleEvaluation[], options: { roles?: number; limit?: number; exclude?: string[] } = {}): StudyItem[] {
  const exclude = new Set(options.exclude ?? []);
  const candidates = evaluations
    .filter((e) => (e.eligibility === 'eligible' || e.eligibility === 'stretch') && e.role_fit_score !== null && !exclude.has(e.role_id))
    .sort((a, b) => (b.role_fit_score ?? 0) - (a.role_fit_score ?? 0) || (a.role_id < b.role_id ? -1 : 1))
    .slice(0, options.roles ?? 6);

  const bySkill = new Map<string, StudyItem>();
  for (const e of candidates) {
    for (const step of learningPlan(e).steps) {
      if (step.kind === 'prove' || step.fit_gain <= 0) continue;
      const item = bySkill.get(step.skill_id) ?? {
        skill_id: step.skill_id,
        name: step.name,
        hours: 0,
        to_level: 0,
        from_level: step.from_level,
        fit_gain_total: 0,
        roles: [],
        reason: '',
      };
      item.hours = Math.max(item.hours, step.hours);
      item.to_level = Math.max(item.to_level, step.to_level);
      item.fit_gain_total = round1(item.fit_gain_total + step.fit_gain);
      item.roles.push({ role_id: e.role_id, title: e.title, fit_gain: step.fit_gain });
      bySkill.set(step.skill_id, item);
    }
  }
  const items = [...bySkill.values()].map((i) => ({
    ...i,
    roles: i.roles.sort((a, b) => b.fit_gain - a.fit_gain),
    reason:
      i.roles.length > 1
        ? `Moves ${i.roles.length} of your nearest roles, most of all ${i.roles[0]!.title}.`
        : `The biggest open gap for ${i.roles[0]!.title}.`,
  }));
  return items
    .sort(
      (a, b) =>
        b.fit_gain_total / Math.max(b.hours, 4) - a.fit_gain_total / Math.max(a.hours, 4) ||
        b.roles.length - a.roles.length ||
        (a.skill_id < b.skill_id ? -1 : 1),
    )
    .slice(0, options.limit ?? 5);
}
