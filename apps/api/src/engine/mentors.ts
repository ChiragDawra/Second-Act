import type { WorkerPreferences } from './types.ts';
import { MENTOR_MATCH_VERSION } from './vocabulary.ts';

/**
 * Deterministic mentor matching (mentor-match-v1). Matching never shares
 * worker data; it only reads the worker's gap list and preferences.
 *
 *   score = 100 × (0.50 gap coverage + 0.25 target-role experience
 *                 + 0.10 transition experience + 0.10 availability
 *                 + 0.05 session format)
 * Hard filters: remaining capacity and at least one shared language.
 * Weights are starting assumptions for the demo, not validated values.
 */

export const MENTOR_WEIGHTS = Object.freeze({
  gap_coverage: 0.5,
  role_experience: 0.25,
  transition_experience: 0.1,
  availability: 0.1,
  session_format: 0.05,
});

export interface MentorCandidate {
  id: string;
  display_name: string;
  headline: string;
  skill_ids: string[];
  role_experience: string[];
  transition_experience: boolean;
  languages: string[];
  session_formats: string[];
  availability_hours_per_week: number;
  capacity_remaining: number;
  is_synthetic: boolean;
  has_demo_login: boolean;
}

export interface MentorMatch {
  mentor: MentorCandidate;
  eligible: boolean;
  score: number | null;
  covered_gap_ids: string[];
  uncovered_gap_ids: string[];
  reasons: string[];
  exclusion_reason: string | null;
}

export interface MentorMatchResult {
  version: string;
  target_role_id: string;
  gap_skill_ids: string[];
  matches: MentorMatch[];
}

export function matchMentors(input: {
  mentors: MentorCandidate[];
  gapSkillIds: string[];
  gapNames: ReadonlyMap<string, string>;
  targetRoleId: string;
  targetRoleTitle: string;
  preferences: WorkerPreferences;
}): MentorMatchResult {
  const gaps = [...new Set(input.gapSkillIds)].sort();
  const languages = (input.preferences.languages ?? []).map((l) => l.toLowerCase());
  const formats = input.preferences.session_formats ?? [];

  const matches = input.mentors.map((mentor): MentorMatch => {
    const covered = gaps.filter((g) => mentor.skill_ids.includes(g));
    const uncovered = gaps.filter((g) => !mentor.skill_ids.includes(g));
    const sharedLanguages = mentor.languages.filter((l) => languages.includes(l.toLowerCase()));
    const base = { mentor, covered_gap_ids: covered, uncovered_gap_ids: uncovered };

    if (mentor.capacity_remaining <= 0 || mentor.availability_hours_per_week <= 0) {
      return { ...base, eligible: false, score: null, reasons: [], exclusion_reason: 'No mentoring capacity in this period.' };
    }
    if (languages.length > 0 && sharedLanguages.length === 0) {
      return { ...base, eligible: false, score: null, reasons: [], exclusion_reason: 'No shared language with your preferences.' };
    }

    const coverage = gaps.length === 0 ? 0 : covered.length / gaps.length;
    const roleExperience = mentor.role_experience.includes(input.targetRoleId) ? 1 : 0;
    const transition = mentor.transition_experience ? 1 : 0;
    const availability = Math.min(mentor.availability_hours_per_week / 2, 1);
    const formatMatch = formats.length === 0 || mentor.session_formats.some((f) => formats.includes(f)) ? 1 : 0;

    const score =
      100 *
      (MENTOR_WEIGHTS.gap_coverage * coverage +
        MENTOR_WEIGHTS.role_experience * roleExperience +
        MENTOR_WEIGHTS.transition_experience * transition +
        MENTOR_WEIGHTS.availability * availability +
        MENTOR_WEIGHTS.session_format * formatMatch);

    const reasons: string[] = [];
    reasons.push(
      covered.length > 0
        ? `Covers ${covered.length} of ${gaps.length} gap areas: ${covered.map((g) => input.gapNames.get(g) ?? g).join(', ')}.`
        : `Covers none of your ${gaps.length} gap areas.`,
    );
    if (roleExperience) reasons.push(`Has worked as ${input.targetRoleTitle}.`);
    if (transition) reasons.push('Has made a similar career transition.');
    reasons.push(`${mentor.availability_hours_per_week} h/week available; ${mentor.capacity_remaining} mentee slot(s) open.`);
    if (sharedLanguages.length > 0) reasons.push(`Shared languages: ${sharedLanguages.join(', ')}.`);
    if (formatMatch && formats.length > 0) reasons.push(`Offers ${mentor.session_formats.filter((f) => formats.includes(f)).join(', ')} sessions.`);

    return { ...base, eligible: true, score: Math.round(score * 10) / 10, reasons, exclusion_reason: null };
  });

  matches.sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      (b.score ?? -1) - (a.score ?? -1) ||
      a.mentor.display_name.localeCompare(b.mentor.display_name) ||
      (a.mentor.id < b.mentor.id ? -1 : 1),
  );

  return { version: MENTOR_MATCH_VERSION, target_role_id: input.targetRoleId, gap_skill_ids: gaps, matches };
}
