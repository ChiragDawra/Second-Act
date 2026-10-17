import type { SkillStatus } from './vocabulary.ts';

/**
 * Fixed-rubric assessment grading and the skill-state transition it causes.
 * Only the assessed skill changes; course or resource completion never does.
 */

export interface AssessmentItem {
  id: string;
  prompt: string;
  code?: string;
  options: Array<{ id: string; label: string }>;
}

export interface GradeResult {
  score: number;
  max_score: number;
  passed: boolean;
  item_results: Record<string, boolean>;
}

export class AnswerValidationError extends Error {}

export function gradeAssessment(
  items: AssessmentItem[],
  answerKey: Record<string, string>,
  answers: Record<string, string>,
  passThreshold: number,
): GradeResult {
  const item_results: Record<string, boolean> = {};
  for (const item of items) {
    const answer = answers[item.id];
    if (answer === undefined) {
      throw new AnswerValidationError(`Question ${item.id} is unanswered.`);
    }
    if (!item.options.some((o) => o.id === answer)) {
      throw new AnswerValidationError(`Question ${item.id} has an invalid option.`);
    }
    item_results[item.id] = answerKey[item.id] === answer;
  }
  const unexpected = Object.keys(answers).filter((k) => !items.some((i) => i.id === k));
  if (unexpected.length > 0) {
    throw new AnswerValidationError('Answers include unknown questions.');
  }
  const score = Object.values(item_results).filter(Boolean).length;
  return { score, max_score: items.length, passed: score >= passThreshold, item_results };
}

export interface SkillState {
  status: SkillStatus;
  proficiency: number | null;
}

/**
 * Pass: verified at the level the assessment measures.
 * Fail: "not demonstrated" at that level — never raises a level, and never
 * downgrades an existing verification (the failed attempt is still recorded).
 */
export function skillStateAfterAssessment(before: SkillState, passed: boolean, levelOnPass: number): SkillState {
  if (passed) {
    return { status: 'verified', proficiency: levelOnPass };
  }
  if (before.status === 'verified') {
    return { ...before };
  }
  const ceiling = levelOnPass - 1;
  const prior = before.status === 'unknown' || before.proficiency === null ? ceiling : before.proficiency;
  return { status: 'not_demonstrated', proficiency: Math.min(prior, ceiling) };
}
