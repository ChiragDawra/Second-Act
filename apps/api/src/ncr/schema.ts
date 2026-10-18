import { z } from 'zod';

/** Extractor identities. Changing extraction behaviour means bumping one of these. */
export const BASELINE_EXTRACTOR_VERSION = 'baseline-0.1';
export const EXTRACTOR_VERSION = 'ncr-rules-0.2';

/**
 * What a resume sentence says about a skill. These match the labels used in
 * resume_gold_labels.csv, except `coursework`, which is scored as `ambiguous`.
 */
export const MENTION_TYPES = [
  'explicit_current',
  'coursework',
  'future_goal',
  'negated_or_no_experience',
  'ambiguous',
] as const;
export type MentionType = (typeof MENTION_TYPES)[number];

/** Priority when one skill is mentioned several times in one resume. */
export const MENTION_PRIORITY: readonly MentionType[] = [
  'explicit_current',
  'future_goal',
  'negated_or_no_experience',
  'coursework',
  'ambiguous',
];

export const DOCUMENT_TYPES = ['synthetic_text', 'pdf', 'docx', 'txt'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * The extractor never emits `verified` (only an assessment can) and never
 * `not_demonstrated`. Only an explicit current claim is `self_reported`;
 * coursework and model suggestions are `inferred`; future goals, negations and
 * ambiguous mentions carry `unknown` (no evidence of ability, which is not zero).
 */
export const extractedSkillSchema = z
  .object({
    skill_id: z.string().min(1),
    canonical_name: z.string().min(1),
    status: z.enum(['self_reported', 'inferred', 'unknown']),
    mention_type: z.enum(MENTION_TYPES),
    suggested_level: z.number().int().min(1).max(4).nullable(),
    evidence: z.string(),
    evidence_unavailable_reason: z.string().nullable(),
    section: z.string(),
    method: z.enum(['alias_rule', 'context_alias_rule', 'semantic_candidate']),
    matched_text: z.string(),
    similarity_score: z.number().min(0).max(1).nullable(),
    mention_count: z.number().int().min(1),
    review_status: z.literal('pending'),
  })
  .refine((s) => s.evidence.length > 0 || (s.evidence_unavailable_reason ?? '').length > 0, {
    message: 'Every extracted skill needs evidence or a documented reason it is unavailable.',
  })
  .refine((s) => s.method === 'semantic_candidate' || s.similarity_score === null, {
    message: 'Only semantic candidates carry a similarity score.',
  })
  .refine((s) => s.method !== 'semantic_candidate' || (s.status === 'inferred' && s.similarity_score !== null), {
    message: 'Semantic candidates stay inferred and keep their similarity score.',
  });
export type ExtractedSkill = z.infer<typeof extractedSkillSchema>;

export const extractionResultSchema = z.object({
  candidate_id: z.string().min(1),
  resume_id: z.string().min(1),
  document_type: z.enum(DOCUMENT_TYPES),
  extractor_version: z.string().min(1),
  dataset_version: z.string().min(1),
  skills: z.array(extractedSkillSchema),
  warnings: z.array(z.string()),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export interface ExtractionInput {
  candidate_id: string;
  resume_id: string;
  document_type: DocumentType;
  text: string;
}

/** Optional retrieval signal. Output is kept `inferred` and `pending`; similarity is not a probability. */
export interface SemanticCandidate {
  skill_id: string;
  similarity: number;
  evidence: string;
}
export interface SemanticProvider {
  suggest(sentences: string[], skillIds: string[]): SemanticCandidate[];
}
