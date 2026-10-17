/**
 * Shared vocabulary for the Adjacency Engine (PRD §7).
 * Changing any value here changes results, so bump SCORING_VERSION.
 */

export const SCORING_VERSION = 'fit-v1';
export const MENTOR_MATCH_VERSION = 'mentor-match-v1';
export const EXTRACTION_VERSION = 'extraction-rules-v1';

export const SKILL_STATUSES = ['self_reported', 'inferred', 'verified', 'unknown', 'not_demonstrated'] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

/** One proficiency scale everywhere: 0 None · 1 Aware · 2 Practiced · 3 Independent · 4 Expert. */
export const PROFICIENCY_LABELS = ['None', 'Aware', 'Practiced', 'Independent', 'Expert'] as const;
export const MAX_PROFICIENCY = 4;

/**
 * Evidence reliability factor e_i in
 *   fit = 100 × Σ(w_i × min(p_i / q_i, 1) × e_i) / Σ w_i
 * Unknown and not-demonstrated claims contribute no evidence. Unknown is
 * reported as unknown, never as "missing".
 */
export const EVIDENCE_FACTORS: Readonly<Record<SkillStatus, number>> = Object.freeze({
  verified: 1.0,
  self_reported: 0.7,
  inferred: 0.4,
  unknown: 0,
  not_demonstrated: 0,
});

export const TOP_ROLE_COUNT = 3;

export const SHAREABLE_FIELDS = [
  'display_name',
  'career_goal',
  'skills_summary',
  'skill_evidence',
  'gap_areas',
  'assessment_results',
  'career_preferences',
  'role_suitability',
  'experience_summary',
] as const;
export type ShareableField = (typeof SHAREABLE_FIELDS)[number];

export const SHAREABLE_FIELD_LABELS: Readonly<Record<ShareableField, string>> = Object.freeze({
  display_name: 'Display name',
  career_goal: 'Target role',
  skills_summary: 'Skill list with status and level',
  skill_evidence: 'Evidence snippets from work history',
  gap_areas: 'Gaps and blockers for the target role',
  assessment_results: 'Assessment results',
  career_preferences: 'Location, work mode and learning-time preferences (never salary)',
  role_suitability: 'Estimated role-fit scores',
  experience_summary: 'Full work-history text',
});

export const CONSENT_VERSION = 'share-consent-v1';
