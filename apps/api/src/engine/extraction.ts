import type { SkillInfo } from './types.ts';
import { EXTRACTION_VERSION } from './vocabulary.ts';

/**
 * Deterministic skill extraction (extraction-rules-v1).
 *
 * Curated phrase rules first, then catalogue aliases. Every candidate:
 *   - is "inferred" (never verified) and needs worker review,
 *   - carries the source sentence verbatim as evidence,
 *   - is validated against the canonical skill catalogue.
 * Work-history text is treated as untrusted data: it is only matched against
 * fixed phrases, never executed or forwarded to a model.
 */

export interface PhraseRule {
  phrase: string;
  skill_id: string;
  level_hint: number;
  confidence: number;
}

export interface ExtractedCandidate {
  skill_id: string;
  canonical_name: string;
  status: 'inferred';
  proficiency: number;
  evidence_snippet: string;
  evidence_source_type: 'work_history_text';
  confidence: number;
  confidence_method: string;
  matched_phrase: string;
}

export const MAX_EXPERIENCE_CHARS = 6000;
const ALIAS_LEVEL_HINT = 1;
const ALIAS_CONFIDENCE = 0.35;

export function splitSentences(text: string): string[] {
  return text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(sentence: string, phrase: string): boolean {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(phrase)}($|[^\\p{L}\\p{N}])`, 'iu');
  return pattern.test(sentence);
}

export function extractSkills(text: string, catalog: SkillInfo[], rules: PhraseRule[]): ExtractedCandidate[] {
  if (text.length > MAX_EXPERIENCE_CHARS) {
    throw new RangeError(`Work history exceeds ${MAX_EXPERIENCE_CHARS} characters.`);
  }
  const skills = new Map(catalog.map((s) => [s.id, s]));
  const best = new Map<string, ExtractedCandidate>();

  const consider = (candidate: ExtractedCandidate) => {
    const current = best.get(candidate.skill_id);
    if (!current || candidate.confidence > current.confidence) {
      best.set(candidate.skill_id, candidate);
    }
  };

  for (const sentence of splitSentences(text)) {
    const snippet = sentence.slice(0, 400);

    for (const rule of rules) {
      const skill = skills.get(rule.skill_id);
      if (!skill || !containsPhrase(sentence, rule.phrase)) continue;
      consider({
        skill_id: skill.id,
        canonical_name: skill.canonical_name,
        status: 'inferred',
        proficiency: rule.level_hint,
        evidence_snippet: snippet,
        evidence_source_type: 'work_history_text',
        confidence: rule.confidence,
        confidence_method: `${EXTRACTION_VERSION}:phrase`,
        matched_phrase: rule.phrase,
      });
    }

    for (const skill of catalog) {
      for (const alias of skill.aliases) {
        if (!containsPhrase(sentence, alias)) continue;
        consider({
          skill_id: skill.id,
          canonical_name: skill.canonical_name,
          status: 'inferred',
          proficiency: ALIAS_LEVEL_HINT,
          evidence_snippet: snippet,
          evidence_source_type: 'work_history_text',
          confidence: ALIAS_CONFIDENCE,
          confidence_method: `${EXTRACTION_VERSION}:alias`,
          matched_phrase: alias,
        });
        break;
      }
    }
  }

  return [...best.values()].sort((a, b) => (a.skill_id < b.skill_id ? -1 : 1));
}
