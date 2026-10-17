import { z } from 'zod';
import { MENTION_TYPES } from './schema.ts';
import type { NcrDataset } from './dataset.ts';
import type { NcrProfileSkill } from './adjacency.ts';

/**
 * The worker review step. Extracted skills are suggestions; only what the worker accepts
 * becomes part of a profile, and it becomes `self_reported` (their own claim), never `verified`.
 * A future goal or a stated lack of experience can never be accepted as a current skill.
 */

export const reviewDecisionSchema = z.object({
  skill_id: z.string().min(1).max(80),
  /** Worker-confirmed proficiency on the shared 1-4 scale. */
  level: z.number().int().min(1).max(4),
  mention_type: z.enum(MENTION_TYPES),
  evidence: z.string().max(400).nullable().optional(),
});
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

export const reviewRequestSchema = z.object({
  skills: z.array(reviewDecisionSchema).max(80),
  preferences: z
    .object({
      cities: z.array(z.string().min(1).max(40)).max(5).optional(),
      work_modes: z.array(z.enum(['onsite', 'hybrid', 'remote'])).max(3).optional(),
      weekly_learning_hours: z.number().int().min(1).max(60).nullable().optional(),
      max_transition_weeks: z.number().int().min(1).max(260).nullable().optional(),
    })
    .strict()
    .optional(),
});

export class ReviewError extends Error {
  readonly code: 'unknown_skill' | 'not_a_current_skill' | 'duplicate_skill';
  constructor(code: ReviewError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const NOT_CURRENT = new Set<string>(['future_goal', 'negated_or_no_experience']);

export function profileFromReview(ds: NcrDataset, decisions: ReviewDecision[]): NcrProfileSkill[] {
  const known = new Set(ds.skills.map((s) => s.id));
  const seen = new Set<string>();
  return decisions.map((d) => {
    if (!known.has(d.skill_id)) throw new ReviewError('unknown_skill', `Unknown skill: ${d.skill_id}`);
    if (seen.has(d.skill_id)) throw new ReviewError('duplicate_skill', `Skill listed twice: ${d.skill_id}`);
    seen.add(d.skill_id);
    if (NOT_CURRENT.has(d.mention_type)) {
      throw new ReviewError(
        'not_a_current_skill',
        `${d.skill_id}: a future goal or a stated lack of experience cannot be accepted as a current skill. Remove it, or learn it and add it later.`,
      );
    }
    return { skill_id: d.skill_id, status: 'self_reported', proficiency: d.level, evidence: d.evidence ?? null };
  });
}
