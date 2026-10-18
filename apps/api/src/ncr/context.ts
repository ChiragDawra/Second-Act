import type { MentionType } from './schema.ts';
import type { SectionKind } from './sections.ts';

/**
 * Context classification for one skill mention (ncr-rules-0.2).
 * All cue patterns run on normalised text: lower-case, hyphens turned into spaces.
 * Decision order: employer/title line, lapsed credential, future goal, negation,
 * coursework, goal-only section, otherwise a current claim.
 * A future goal beats a negation, and a negation beats coursework.
 */

export function normForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‐-―-]/g, ' ')
    .replace(/[`'’"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const FUTURE =
  /\b(wants? to|intends? to|intention to|plans? to|planning to|aspir\w+|future (learning |skill )?(goal|aspiration|target|exploration)s?|learning goals?|long term goals?|career goals?|goal to|eventually|in the future|interested in|interest area|explor(?:e|ing)|will (?:learn|study)|hope to|looking to|aiming to|begin studying|to study|to learn|hobby|pursuing)\b/;
const GOAL_WORD = /\bgoals?\b/;
const TARGET_ROLE = /\b(transition(?:ing)? (?:in)?to|pivot(?:ing)? (?:in)?to|aspiring|seeking (?:a |an )?(?:role|position|opportunit\w+)|looking for)\b/;
const NEGATION =
  /\b(?:no|not|never|zero|without|lacks?|lacking|hasnt|havent|has not|have not|not yet)\b[^.;]{0,50}?\b(?:experience|exposure|applied|used|using|worked|knowledge|production|practical|practically|commercial|enterprise|workplace|hands on|developed|coding|cluster|querying)\b|\bnot applied\b|\bhas not (?:used|applied)\b|\bnever used\b|\blimited (?:exposure|experience)\b/;
const COURSEWORK =
  /\b(enrolled|coursework|courses?|coursera|udemy|codecademy|edx|linkedin learning|bootcamp|nanodegree|self paced|self study|online learning|tutorials?|completed (?:online|basic|introductory)|theoretical|syntax modules|training modules?|learning phase|refresher|introduction to|crash course|skill badge)\b/;
/** "Learning Selenium with Java", "currently learning Power BI": in progress, not a skill yet. Never "machine learning". */
const LEARNING_NOW = /(?:^|\b(?:currently|presently|now|am|im|also|actively|still)\s+)learning\b(?!\s+(?:and|&)\s+development)/;
const COURSE_TITLE =/\b(course|introduction to|crash course|skill badge|badge|bootcamp|specialization|professional certificate|nanodegree|learning path|training)\b/;
const LAPSED = /\b(lapsed|expired|inactive)\b/;
const LEVEL_WORDS: Array<[RegExp, number]> = [
  [/^(?:basic|basics|beginner|fundamentals|conceptual|introductory)$/, 1],
  [/^intermediate$/, 2],
  [/^(?:advanced|proficient)$/, 3],
  [/^expert$/, 4],
];

export interface MentionContext {
  /** Normalised clause text that contains the match. */
  clause: string;
  /** Index of the match inside `clause`. */
  matchIndex: number;
  kind: SectionKind;
  /** Normalised "Label" of a "Label: content" line, or ''. */
  label: string;
  /** False when the match sits in an employer, place or non-title part of a header line. */
  claimAllowed: boolean;
}

export function classifyMention(ctx: MentionContext): MentionType {
  const cue = `${ctx.label} ${ctx.clause}`.trim();
  if (!ctx.claimAllowed) return 'ambiguous';
  if (LAPSED.test(cue)) return 'ambiguous';

  const goalSection = ctx.kind === 'goals' || ctx.kind === 'mixed';
  const targetAt = ctx.clause.search(TARGET_ROLE);
  const afterTarget = targetAt !== -1 && ctx.matchIndex > targetAt;
  const learningPhaseLabel = /\blearning phase\b/.test(ctx.label);

  if (afterTarget) return 'future_goal';
  if (FUTURE.test(cue) || (goalSection && GOAL_WORD.test(cue))) return 'future_goal';
  if (NEGATION.test(cue)) return 'negated_or_no_experience';
  if (learningPhaseLabel || COURSEWORK.test(cue) || LEARNING_NOW.test(ctx.clause) || ctx.kind === 'learning') return 'coursework';
  if ((ctx.kind === 'certifications' || ctx.kind === 'education') && COURSE_TITLE.test(cue)) return 'coursework';
  if (ctx.kind === 'goals') return 'future_goal';
  return 'explicit_current';
}

/** Reads a stated proficiency next to the skill: "(Basic)", "Advanced SQL". Null when the text gives none. */
export function levelCue(clause: string, matchIndex: number, matchLength: number): number | null {
  const after = clause.slice(matchIndex + matchLength, matchIndex + matchLength + 40);
  const near = after.match(/^\s*[(\[,:]?\s*(basic|basics|beginner|intermediate|advanced|expert|fundamentals|conceptual|proficient)\b/);
  const before = clause.slice(Math.max(0, matchIndex - 14), matchIndex).match(/\b(basic|beginner|intermediate|advanced|expert)\s+$/);
  const word = near?.[1] ?? before?.[1];
  if (!word) return null;
  for (const [pattern, level] of LEVEL_WORDS) if (pattern.test(word)) return level;
  return null;
}
