/** Response shapes of the Second Act API (apps/api/src/routes). */

export type AppRole = 'worker' | 'mentor' | 'recruiter' | 'admin';
export type SkillStatus = 'self_reported' | 'inferred' | 'verified' | 'unknown' | 'not_demonstrated';
export type Readiness = 'ready' | 'needs_validation' | 'blocked';
export type Eligibility = 'eligible' | 'stretch' | 'filtered' | 'data_error';

export type Sector = 'qa' | 'banking-ba' | 'support' | 'data';

/** GET /me for an active account. */
export interface Me {
  status: 'active';
  user_id: string;
  role: AppRole;
  display_name: string;
  email: string | null;
  org: { id: string; name: string } | null;
  profile_id: string | null;
  mentor_id: string | null;
  is_synthetic: boolean;
  sector: Sector | null;
  catalogue: 'demo' | 'ncr' | null;
}

/** GET /me in every state. */
export type MeState =
  | Me
  | { status: 'pending' | 'rejected'; user_id: string; role: AppRole; display_name: string; email: string | null }
  | { status: 'needs_onboarding'; user_id: string; email: string | null; email_verified: boolean; suggested_name: string | null; admin_eligible: boolean };

export interface OnboardingOptions {
  sectors: { id: Sector; label: string; roles: string[] }[];
  cities: string[];
  skills: { id: string; name: string; category: string }[];
}

export interface PendingAccount {
  user_id: string;
  role: AppRole;
  status: 'pending' | 'active' | 'rejected';
  display_name: string;
  email: string | null;
  created_at: string;
  onboarded_at: string | null;
  decided_at: string | null;
  org: { id: string; name: string; status: string } | null;
  mentor: { headline: string; bio: string; availability_hours_per_week: number; languages: string[]; skills: string[] } | null;
}

export interface RecruiterOpening {
  id: string;
  title: string;
  role_id: string;
  role_title: string;
  location: string;
  work_mode: string;
  salary_band_text: string | null;
  source_type: 'simulated' | 'employer_posted' | 'live_feed' | 'sap_mock';
  status: 'simulated_open' | 'open' | 'closed';
  is_simulated: boolean;
  posted_at: string | null;
}

export interface Profile {
  id: string;
  display_name: string;
  headline: string;
  current_role_title: string | null;
  experience_summary: string;
  preferences: { locations?: string[]; work_modes?: string[]; weekly_learning_hours?: number | null; max_transition_weeks?: number | null; languages?: string[] } & Record<string, unknown>;
  is_synthetic: boolean;
  catalogue: 'demo' | 'ncr';
  sector: Sector | null;
}

export interface WorkerSkill {
  skill_id: string;
  name: string;
  category: string;
  description: string;
  status: SkillStatus;
  proficiency: number | null;
  evidence_snippet: string | null;
  evidence_source_type: string;
  confidence: number | null;
  confidence_method: string | null;
  review_state: 'pending' | 'confirmed' | 'edited' | 'rejected' | 'assessed';
  updated_at: string;
  verified_by: { result_id: string; assessment_id: string; score: number; max_score: number; created_at: string } | null;
}

export interface GapItem {
  skill_id: string;
  name: string;
  required_level: number;
  worker_level: number | null;
  status: SkillStatus;
  importance_weight: number;
  is_mandatory: boolean;
  hours_per_level?: number;
}

export interface MandatoryCheck {
  skill_id: string;
  name: string;
  required_level: number;
  worker_level: number | null;
  status: SkillStatus;
  gate: 'cleared' | 'needs_validation' | 'blocker';
  reason: string;
}

export interface Breakdown {
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

export interface RoleEvaluation {
  role_id: string;
  title: string;
  family: string;
  employment_type: string;
  work_mode: string;
  role_fit_score: number | null;
  evidence_confidence: number;
  readiness_status: Readiness;
  eligibility: Eligibility;
  rank: number | null;
  mandatory: MandatoryCheck[];
  critical_gaps: GapItem[];
  unknowns: GapItem[];
  transferable: GapItem[];
  breakdown: Breakdown[];
  constraint_failures: { code: string; message: string }[];
  constraint_notes: string[];
  estimated_learning_hours: number;
  estimated_learning_weeks: number | null;
  market_fit: 'not_assessed';
  explanation: string[];
}

export interface Recommendations {
  run_id: string;
  computed_at: string;
  trigger: string;
  scoring_version: string;
  dataset_version: string;
  input_hash: string;
  evidence_factors: Record<SkillStatus, number>;
  score_disclaimer: string;
  top: RoleEvaluation[];
  other_eligible: RoleEvaluation[];
  stretch: RoleEvaluation[];
  filtered: RoleEvaluation[];
  /** Skills that move the most nearby roles per hour of study. Absent from older API builds. */
  study_next?: StudyItem[];
  /** Learning plan per reachable role id. Weeks are null here; use the profile's weekly hours. */
  plans?: Record<string, LearningPlan>;
  /** Delhi-NCR runs: the worker's current role and roles that would be a step back from it. */
  current_role_id?: string | null;
  notes?: Record<string, { is_current: boolean; step_back: boolean }>;
}

/** One step of a role's learning plan (apps/api/src/engine/plan.ts). */
export interface PlanStep {
  skill_id: string;
  name: string;
  kind: 'learn' | 'learn_or_confirm' | 'prove';
  from_level: number | null;
  to_level: number;
  hours: number;
  is_mandatory: boolean;
  importance_weight: number;
  fit_gain: number;
  reason: string;
}

export interface LearningPlan {
  steps: PlanStep[];
  total_hours: number;
  weeks: number | null;
  fit_now: number | null;
  fit_after_learning: number | null;
}

export interface StudyItem {
  skill_id: string;
  name: string;
  hours: number;
  to_level: number;
  from_level: number | null;
  fit_gain_total: number;
  roles: { role_id: string; title: string; fit_gain: number }[];
  reason: string;
}

export interface Resource {
  id: string;
  skill_id: string;
  title: string;
  provider: string;
  url: string;
  format: string;
  cost_band: string;
  verified: boolean;
}

export interface RoleGaps {
  computed_at: string;
  scoring_version: string;
  evaluation: RoleEvaluation;
  learning_plan?: LearningPlan;
  learning_resources: Resource[];
  assessments: { id: string; skill_id: string; skill_name: string; title: string; level_on_pass: number; time_estimate_minutes: number }[];
  next_action: { kind: 'prove' | 'learn'; skill_id: string; name: string; reason: string } | null;
}

export interface Opportunity {
  id: string;
  title: string;
  employer_name: string;
  org_id: string;
  location: string;
  work_mode: string;
  salary_band_text: string | null;
  source_type: string;
  status: string;
  is_simulated: boolean;
  role_id: string;
  role_title: string;
  provenance_label: string;
}

export interface RoleDetail {
  id: string;
  title: string;
  description: string;
  salary_note: string;
  demand_note: string;
  source: string;
  dataset_version: string;
  last_reviewed_at: string;
  requirements: { skill_id: string; name: string; importance_weight: number; required_level: number; is_mandatory: boolean; evidence_rubric: string }[];
  opportunities: Pick<Opportunity, 'id' | 'title' | 'employer_name' | 'location' | 'work_mode' | 'salary_band_text' | 'is_simulated'>[];
}

export interface AssessmentSummary {
  id: string;
  skill_id: string;
  skill_name: string;
  title: string;
  description: string;
  pass_threshold: number;
  level_on_pass: number;
  time_estimate_minutes: number;
  is_demo: boolean;
  item_count: number;
}

export interface AssessmentDetail extends Omit<AssessmentSummary, 'item_count'> {
  items: { id: string; prompt: string; code?: string; options: { id: string; label: string }[] }[];
}

export interface RoleChange {
  role_id: string;
  title: string;
  before: { role_fit_score: number | null; readiness_status: Readiness; eligibility: Eligibility; rank: number | null } | null;
  after: { role_fit_score: number | null; readiness_status: Readiness; eligibility: Eligibility; rank: number | null };
}

export interface AssessmentOutcome {
  result: { id: string; title: string; skill_id: string; score: number; max_score: number; passed: boolean; item_results: Record<string, boolean>; created_at: string };
  skill_before: { status: SkillStatus; proficiency: number | null };
  skill_after: { status: SkillStatus; proficiency: number | null };
  skills_changed: string[];
  role_changes: RoleChange[];
  recommendations: Recommendations;
}

export interface MentorMatch {
  mentor: {
    id: string;
    display_name: string;
    headline: string;
    bio: string;
    languages: string[];
    session_formats: string[];
    availability_hours_per_week: number;
    capacity_remaining: number;
    is_synthetic: boolean;
    has_demo_login: boolean;
  };
  eligible: boolean;
  score: number | null;
  reasons: string[];
  exclusion_reason: string | null;
  covered_gaps: { id: string; name: string }[];
  uncovered_gaps: { id: string; name: string }[];
  open_request: { id: string; status: string } | null;
}

export interface MentorMatches {
  version: string;
  target_role: { id: string; title: string };
  gap_skills: { id: string; name: string }[];
  privacy_note: string;
  matches: MentorMatch[];
}

export interface ShareField {
  id: string;
  label: string;
}

export interface WorkerMentorship {
  id: string;
  status: 'requested' | 'accepted' | 'declined' | 'revoked' | 'completed';
  shared_fields: string[];
  message: string | null;
  created_at: string;
  responded_at: string | null;
  mentor: { id: string; display_name: string; headline: string; is_synthetic: boolean };
  target_role: { id: string; title: string };
  consent_statement: string;
  feedback: { id: string; body: string; action_items: string[]; created_at: string }[];
}

export interface WorkerShare {
  id: string;
  fields: string[];
  granted_at: string;
  revoked_at: string | null;
  target_role_id: string | null;
  org: { id: string; name: string; is_synthetic: boolean };
  consent_statement: string;
}

export interface AuditEvent {
  id: string;
  created_at: string;
  actor_role: string | null;
  action: string;
  object_type: string;
  object_id?: string | null;
  subject_profile_id?: string | null;
  outcome: 'success' | 'denied' | 'error';
  request_id?: string | null;
  metadata: Record<string, unknown>;
}

/** Consent-scoped projection returned to mentors and recruiters. Absent keys were not shared. */
export interface SharedProjection {
  is_synthetic: boolean;
  display_name?: string;
  career_goal?: { role_id: string; title: string; family: string } | null;
  skills_summary?: { skill_id: string; name: string; status: SkillStatus; proficiency: number | null }[];
  skill_evidence?: { skill_id: string; name: string; evidence_snippet: string; evidence_source_type: string }[];
  gap_areas?: {
    role_id: string;
    readiness_status: Readiness;
    critical_gaps: GapItem[];
    mandatory: MandatoryCheck[];
    unknowns: GapItem[];
    scoring_version: string;
    computed_at: string;
  } | null;
  assessment_results?: {
    assessment_id: string; title: string; skill_id: string; skill_name: string; passed: boolean;
    score: number; max_score: number; level_after: number | null; reviewer_type: string; is_demo_assessment: boolean; created_at: string;
  }[];
  career_preferences?: { locations?: string[]; work_modes?: string[]; employment_types?: string[]; weekly_learning_hours?: number; languages?: string[] };
  role_suitability?: {
    scoring_version: string;
    dataset_version: string;
    computed_at: string;
    roles: { role_id: string; title: string; role_fit_score: number | null; evidence_confidence: number; readiness_status: Readiness; eligibility: Eligibility; rank: number | null }[];
  } | null;
  experience_summary?: string;
}

export interface MentorRequestSummary {
  id: string;
  status: WorkerMentorship['status'];
  created_at: string;
  responded_at: string | null;
  target_role: { role_id: string; title: string };
  shared_fields: string[];
  worker_display_name: string | null;
  worker_is_synthetic: boolean;
}

export interface MentorRequestDetail {
  request: {
    id: string;
    status: WorkerMentorship['status'];
    target_role_id: string;
    focus_skill_ids: string[];
    shared_fields: string[];
    withheld_fields: string[];
    message: string | null;
    created_at: string;
    responded_at: string | null;
  };
  shared: SharedProjection | null;
  notes: { id: string; kind: 'progress' | 'feedback'; body: string; action_items: string[]; created_at: string }[];
}

export interface RecruiterCandidate {
  grant_id: string;
  granted_at: string;
  fields: string[];
  display_name: string | null;
  career_goal: { role_id: string; title: string } | null;
  is_synthetic: boolean;
}

export interface RecruiterCandidateDetail {
  grant: { id: string; granted_at: string; target_role_id: string | null; fields: string[]; withheld_fields: string[] };
  shared: SharedProjection;
  opportunity_fit: {
    opportunity_id: string;
    title: string;
    role_id: string;
    is_simulated: boolean;
    evaluation: { role_fit_score: number | null; evidence_confidence: number; readiness_status: Readiness; eligibility: Eligibility } | null;
  }[] | null;
  withheld_field_labels: string[];
  notice: string;
}

export interface AdminOverview {
  api: { status: string; uptime_seconds: number; node: string };
  database: { status: string; latency_ms: number | null };
  engine: { scoring_version: string; mentor_match_version: string; extraction_version: string; evidence_factors: Record<SkillStatus, number> };
  dataset_versions: { id: string; kind: string; description: string; source: string; released_at: string; is_synthetic: boolean }[];
  synthetic_data: Record<string, number | Record<string, number>>;
  demo_state: { key: string; value: { at?: string; scenario_version?: string; by_role?: string }; updated_at: string }[];
  denied_requests_24h: number;
  pending_accounts: number;
  integrations: { name: string; status: 'live' | 'synthetic' | 'simulated' | 'planned'; detail: string }[];
  access_note: string;
}

// ---- Delhi-NCR resume pilot -------------------------------------------------

export type NcrMentionType = 'explicit_current' | 'coursework' | 'future_goal' | 'negated_or_no_experience' | 'ambiguous';

export interface NcrExtractedSkill {
  skill_id: string;
  canonical_name: string;
  status: 'self_reported' | 'inferred' | 'unknown';
  mention_type: NcrMentionType;
  suggested_level: number | null;
  /** Why that level was suggested ("Used at work for about 5 years"). */
  level_basis?: string | null;
  evidence: string;
  section: string;
  method: 'alias_rule' | 'context_alias_rule' | 'pattern_rule' | 'semantic_candidate';
  mention_count?: number;
}

export interface NcrDetectedRole {
  role_id: string;
  title: string;
  matched_text: string;
  source: 'job_title' | 'summary' | 'headline';
  years: number | null;
  most_recent: boolean;
}

export interface NcrExtraction {
  extraction: {
    extractor_version: string;
    dataset_version: string;
    skills: NcrExtractedSkill[];
    detected_roles?: NcrDetectedRole[];
    experience_years?: number | null;
    warnings: string[];
  };
  review_required: boolean;
  notice: string;
}

export interface NcrMatchedSkill {
  skill_id: string;
  name: string;
  status: SkillStatus;
  worker_level: number | null;
  required_level: number;
  meets_required: boolean;
  evidence: string | null;
}

export interface NcrGap {
  skill_id: string;
  name: string;
  required_level: number;
  worker_level: number | null;
  is_mandatory: boolean;
}

export interface NcrRole {
  role_id: string;
  title: string;
  sector: string;
  estimated_skill_fit: number | null;
  evidence_confidence: number;
  readiness_status: Readiness;
  matching_skills: NcrMatchedSkill[];
  critical_gaps: NcrGap[];
  mandatory_blockers: { skill_id: string; name: string; reason: string; gate: string }[];
  unknown_requirements: NcrGap[];
  constraint_exclusion: string | null;
  explanation: string[];
  requirement_source: { reviewer_status: string; freshness_note: string; dataset_collected_at: string };
  demand_signal: { kind: 'simulated_sample'; sample_size: number; cities: string[]; note: string };
  vacancies: { status: 'none_connected'; note: string };
  estimated_learning_weeks?: number | null;
  learning_plan?: LearningPlan;
  is_current_role?: boolean;
  transition?: { from_role_id: string; from_title: string; transferable_skill_ids: string[]; gap_skill_ids: string[]; rationale: string; reviewer_status: string } | null;
}

export interface NcrRecommendation {
  adjacency_version: string;
  scoring_version: string;
  dataset_version: string;
  top_roles: NcrRole[];
  stretch_roles: NcrRole[];
  excluded_roles: NcrRole[];
  current_roles?: NcrRole[];
  study_next?: StudyItem[];
  message: string | null;
  limitations: string[];
}

export interface NcrMeta {
  cities: string[];
  limitations: string[];
  labels: { roles: string; listings: string };
}
