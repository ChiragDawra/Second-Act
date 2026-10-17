import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, splitList } from './csv.ts';

/**
 * Delhi-NCR pilot dataset loader (data/delhi_ncr/v1).
 * The CSV files are the source of truth. Every row carries a review status; nothing here is a
 * validated labour-market fact. Simulated listings are labelled and never presented as live.
 */

export interface NcrSkill {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  description: string;
  review_status: string;
}

export interface NcrAlias {
  alias: string;
  skill_id: string;
  locale: string;
  source: string;
  review_status: string;
}

export interface NcrRole {
  id: string;
  title: string;
  title_aliases: string[];
  occupation_code: string;
  occupation_source: string;
  sector: string;
  seniority: string;
  region_scope: string;
  source_url: string;
  review_status: string;
}

export interface NcrRoleSkill {
  role_id: string;
  skill_id: string;
  importance_weight: number;
  required_proficiency: number;
  is_mandatory: boolean;
  evidence_rationale: string;
  source_url: string;
  reviewer_status: string;
}

export interface NcrTransition {
  source_role_id: string;
  target_role_id: string;
  transferable_skill_ids: string[];
  gap_skill_ids: string[];
  transition_rationale: string;
  reviewer_status: string;
  reviewer_notes: string;
}

export interface NcrEvidence {
  evidence_id: string;
  source: string;
  source_url: string;
  employer: string;
  raw_title: string;
  canonical_role_id: string;
  city: string;
  work_mode: 'onsite' | 'hybrid' | 'remote';
  posted_at: string;
  collected_at: string;
  experience_text: string;
  education_text: string;
  skill_phrases: string[];
  listing_status: 'current' | 'expired' | 'unknown' | 'simulated';
  collection_method: string;
  synthetic: boolean;
}

export interface NcrConfig {
  dataset_version: string;
  taxonomy_version: string;
  adjacency_version: string;
  collected_at: string;
  region_scope: string;
  cities: string[];
  recommendation_bar: { min_estimated_fit: number; min_matched_requirements: number; note: string };
  learning_hours_per_level: Record<string, number>;
  limitations: string[];
}

export interface NcrDataset {
  config: NcrConfig;
  skills: NcrSkill[];
  aliases: NcrAlias[];
  roles: NcrRole[];
  roleSkills: NcrRoleSkill[];
  transitions: NcrTransition[];
  evidence: NcrEvidence[];
}

export const DEFAULT_DATASET_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../data/delhi_ncr/v1');

const read = (dir: string, file: string) => readFileSync(resolve(dir, file), 'utf8');
const toBool = (v: string) => v.trim().toLowerCase() === 'true';

export function loadNcrDataset(dir: string = DEFAULT_DATASET_DIR): NcrDataset {
  return {
    config: JSON.parse(read(dir, 'scoring_config.json')) as NcrConfig,
    skills: parseCsv(read(dir, 'skills.csv')).map((r) => ({
      id: r.skill_id!,
      name: r.canonical_name!,
      category: r.category!,
      aliases: splitList(r.aliases!),
      description: r.description!,
      review_status: r.review_status!,
    })),
    aliases: parseCsv(read(dir, 'skill_aliases.csv')).map((r) => ({
      alias: r.alias!,
      skill_id: r.canonical_skill_id!,
      locale: r.language_or_locale!,
      source: r.source!,
      review_status: r.review_status!,
    })),
    roles: parseCsv(read(dir, 'roles.csv')).map((r) => ({
      id: r.role_id!,
      title: r.canonical_title!,
      title_aliases: splitList(r.title_aliases!),
      occupation_code: r.occupation_code!,
      occupation_source: r.occupation_source!,
      sector: r.sector!,
      seniority: r.seniority!,
      region_scope: r.region_scope!,
      source_url: r.source_url!,
      review_status: r.review_status!,
    })),
    roleSkills: parseCsv(read(dir, 'role_skills.csv')).map((r) => ({
      role_id: r.role_id!,
      skill_id: r.skill_id!,
      importance_weight: Number(r.importance_weight),
      required_proficiency: Number(r.required_proficiency),
      is_mandatory: toBool(r.is_mandatory!),
      evidence_rationale: r.evidence_rationale!,
      source_url: r.source_url!,
      reviewer_status: r.reviewer_status!,
    })),
    transitions: parseCsv(read(dir, 'transition_examples.csv')).map((r) => ({
      source_role_id: r.source_role_id!,
      target_role_id: r.target_role_id!,
      transferable_skill_ids: splitList(r.transferable_skill_ids!),
      gap_skill_ids: splitList(r.gap_skill_ids!),
      transition_rationale: r.transition_rationale!,
      reviewer_status: r.reviewer_status!,
      reviewer_notes: r.reviewer_notes!,
    })),
    evidence: parseCsv(read(dir, 'job_evidence.csv')).map((r) => ({
      evidence_id: r.evidence_id!,
      source: r.source!,
      source_url: r.source_url!,
      employer: r.employer!,
      raw_title: r.raw_title!,
      canonical_role_id: r.canonical_role_id!,
      city: r.city!,
      work_mode: r.work_mode as NcrEvidence['work_mode'],
      posted_at: r.posted_at!,
      collected_at: r.collected_at!,
      experience_text: r.experience_text!,
      education_text: r.education_text!,
      skill_phrases: splitList(r.skill_phrases!),
      listing_status: r.listing_status as NcrEvidence['listing_status'],
      collection_method: r.collection_method!,
      synthetic: toBool(r.synthetic!),
    })),
  };
}

/** Returns a list of problems; an empty list means the dataset is internally consistent. */
export function validateNcrDataset(ds: NcrDataset): string[] {
  const problems: string[] = [];
  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${label}: duplicate id ${id}`);
      seen.add(id);
    }
    return seen;
  };
  const skillIds = unique('skills', ds.skills.map((s) => s.id));
  const roleIds = unique('roles', ds.roles.map((r) => r.id));
  unique('job_evidence', ds.evidence.map((e) => e.evidence_id));

  const aliasOwner = new Map<string, string>();
  for (const a of ds.aliases) {
    for (const id of a.skill_id.split(';')) if (!skillIds.has(id)) problems.push(`skill_aliases: "${a.alias}" -> unknown skill ${id}`);
    const owner = aliasOwner.get(a.alias.toLowerCase());
    if (owner && owner !== a.skill_id) problems.push(`skill_aliases: "${a.alias}" maps to both ${owner} and ${a.skill_id}`);
    aliasOwner.set(a.alias.toLowerCase(), a.skill_id);
  }
  for (const s of ds.skills) {
    for (const alias of s.aliases) {
      if (!(aliasOwner.get(alias.toLowerCase()) ?? '').split(';').includes(s.id)) problems.push(`skills: alias "${alias}" of ${s.id} missing from skill_aliases.csv`);
    }
  }

  const perRole = new Map<string, Set<string>>();
  for (const rs of ds.roleSkills) {
    if (!roleIds.has(rs.role_id)) problems.push(`role_skills: unknown role ${rs.role_id}`);
    if (!skillIds.has(rs.skill_id)) problems.push(`role_skills: unknown skill ${rs.skill_id}`);
    if (!Number.isInteger(rs.importance_weight) || rs.importance_weight < 1 || rs.importance_weight > 5) {
      problems.push(`role_skills: ${rs.role_id}/${rs.skill_id} weight must be an integer 1-5`);
    }
    if (!Number.isInteger(rs.required_proficiency) || rs.required_proficiency < 1 || rs.required_proficiency > 4) {
      problems.push(`role_skills: ${rs.role_id}/${rs.skill_id} required_proficiency must be an integer 1-4`);
    }
    if (!rs.evidence_rationale.trim()) problems.push(`role_skills: ${rs.role_id}/${rs.skill_id} has no evidence_rationale`);
    const set = perRole.get(rs.role_id) ?? new Set<string>();
    if (set.has(rs.skill_id)) problems.push(`role_skills: duplicate ${rs.role_id}/${rs.skill_id}`);
    set.add(rs.skill_id);
    perRole.set(rs.role_id, set);
  }
  for (const id of roleIds) if (!perRole.get(id)?.size) problems.push(`roles: ${id} has no requirements`);

  for (const t of ds.transitions) {
    if (!roleIds.has(t.source_role_id) || !roleIds.has(t.target_role_id)) problems.push(`transitions: unknown role in ${t.source_role_id}->${t.target_role_id}`);
    for (const id of [...t.transferable_skill_ids, ...t.gap_skill_ids]) if (!skillIds.has(id)) problems.push(`transitions: unknown skill ${id}`);
  }

  for (const e of ds.evidence) {
    if (!roleIds.has(e.canonical_role_id)) problems.push(`job_evidence: ${e.evidence_id} unknown role`);
    if (!e.collected_at) problems.push(`job_evidence: ${e.evidence_id} has no collected_at`);
    if (!e.city) problems.push(`job_evidence: ${e.evidence_id} has no city`);
    if (e.synthetic && e.listing_status !== 'simulated') problems.push(`job_evidence: ${e.evidence_id} is synthetic but not marked simulated`);
    if (!e.synthetic && !e.source_url) problems.push(`job_evidence: ${e.evidence_id} is not synthetic but has no source_url`);
  }
  return problems;
}
