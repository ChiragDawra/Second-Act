import type { SkillStatus } from './vocabulary.ts';

export interface SkillInfo {
  id: string;
  canonical_name: string;
  aliases: string[];
  learning_hours_per_level: number;
}

export interface RoleRequirement {
  skill_id: string;
  importance_weight: number;
  required_level: number;
  is_mandatory: boolean;
}

export interface RoleDefinition {
  id: string;
  title: string;
  family: string;
  employment_type: 'employee' | 'independent';
  work_mode: 'remote' | 'hybrid' | 'onsite';
  locations: string[];
  salary_min_lpa: number | null;
  salary_max_lpa: number | null;
  requirements: RoleRequirement[];
}

export interface WorkerSkillState {
  skill_id: string;
  status: SkillStatus;
  proficiency: number | null;
}

/** Constraint-relevant preferences. Missing values mean "not applied", never a default. */
export interface WorkerPreferences {
  locations?: string[];
  work_modes?: Array<'remote' | 'hybrid' | 'onsite'>;
  employment_types?: Array<'employee' | 'independent'>;
  salary_floor_lpa?: number | null;
  weekly_learning_hours?: number | null;
  max_transition_weeks?: number | null;
  languages?: string[];
  session_formats?: string[];
}

export type GateStatus = 'cleared' | 'needs_validation' | 'blocker';
export type ReadinessStatus = 'ready' | 'needs_validation' | 'blocked';
export type Eligibility = 'eligible' | 'stretch' | 'filtered' | 'data_error';

export interface RequirementBreakdown {
  skill_id: string;
  name: string;
  importance_weight: number;
  required_level: number;
  worker_level: number | null;
  status: SkillStatus;
  is_mandatory: boolean;
  evidence_factor: number;
  coverage: number;
  contribution: number;
}

export interface MandatoryCheck {
  skill_id: string;
  name: string;
  required_level: number;
  worker_level: number | null;
  status: SkillStatus;
  gate: GateStatus;
  reason: string;
}

export interface GapItem {
  skill_id: string;
  name: string;
  required_level: number;
  worker_level: number | null;
  status: SkillStatus;
  importance_weight: number;
  is_mandatory: boolean;
  /** Learning hours per proficiency level for this skill. Absent in runs stored before learning plans. */
  hours_per_level?: number;
}

export interface ConstraintResult {
  code: 'location' | 'work_mode' | 'employment_type' | 'salary_floor' | 'learning_time';
  message: string;
}

export interface RoleEvaluation {
  role_id: string;
  title: string;
  family: string;
  employment_type: RoleDefinition['employment_type'];
  work_mode: RoleDefinition['work_mode'];
  role_fit_score: number | null;
  score_type: 'estimated_skill_fit_not_hiring_probability';
  evidence_confidence: number;
  readiness_status: ReadinessStatus;
  eligibility: Eligibility;
  rank: number | null;
  mandatory: MandatoryCheck[];
  critical_gaps: GapItem[];
  unknowns: GapItem[];
  transferable: GapItem[];
  breakdown: RequirementBreakdown[];
  constraint_failures: ConstraintResult[];
  constraint_notes: string[];
  estimated_learning_hours: number;
  estimated_learning_weeks: number | null;
  market_fit: 'not_assessed';
  explanation: string[];
}

export interface RecommendationResult {
  scoring_version: string;
  dataset_version: string;
  input_hash: string;
  evidence_factors: Record<SkillStatus, number>;
  top_role_ids: string[];
  stretch_role_ids: string[];
  filtered_role_ids: string[];
  evaluations: RoleEvaluation[];
}
