-- Second Act — core schema (demo scenario v1)
--
-- Conventions
--   * Catalogue tables (skills, roles, requirements, assessments, mentors,
--     opportunities) use stable text ids so the demo dataset is reproducible.
--   * Person-level tables use UUIDs.
--   * Every synthetic/simulated record carries an explicit boolean flag.
--   * Status vocabularies follow 01_PRD §7 and are enforced with CHECKs.
--   * Invariants that must hold no matter who writes (backend, SQL editor,
--     future services) are enforced here, not only in application code.

-- Internal helpers that must never be exposed through the Data API.
create schema if not exists app_private;

-- ---------------------------------------------------------------------------
-- Versioning and organisations
-- ---------------------------------------------------------------------------

create table public.dataset_versions (
  id            text primary key,
  kind          text not null check (kind in ('taxonomy', 'roles', 'mentors', 'opportunities', 'assessments', 'scoring', 'extraction', 'scenario')),
  description   text not null,
  source        text not null,
  released_at   date not null,
  is_synthetic  boolean not null default true
);

create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  kind          text not null check (kind in ('employer')),
  is_synthetic  boolean not null default true
);

-- One application role per Supabase Auth identity. Roles are never read from
-- user-editable JWT metadata; the backend resolves them from this table.
create table public.app_users (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  role          text not null check (role in ('worker', 'mentor', 'recruiter', 'admin')),
  display_name  text not null check (char_length(display_name) between 1 and 80),
  org_id        uuid references public.organizations (id),
  is_synthetic  boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint recruiter_requires_org check (role <> 'recruiter' or org_id is not null)
);

-- ---------------------------------------------------------------------------
-- Skill and role knowledge base
-- ---------------------------------------------------------------------------

create table public.skills (
  id                        text primary key check (id ~ '^[a-z0-9-]+$'),
  canonical_name            text not null,
  category                  text not null,
  description               text not null,
  aliases                   text[] not null default '{}',
  learning_hours_per_level  integer not null check (learning_hours_per_level > 0),
  taxonomy_source           text not null,
  taxonomy_version          text not null references public.dataset_versions (id)
);

create table public.roles (
  id                text primary key check (id ~ '^[a-z0-9-]+$'),
  title             text not null,
  family            text not null,
  description       text not null,
  employment_type   text not null check (employment_type in ('employee', 'independent')),
  work_mode         text not null check (work_mode in ('remote', 'hybrid', 'onsite')),
  locations         text[] not null default '{}',
  salary_min_lpa    double precision,
  salary_max_lpa    double precision,
  salary_note       text not null default 'Illustrative band from the curated demo dataset; not market data.',
  demand_note       text not null default 'Market demand not assessed in this prototype.',
  source            text not null,
  dataset_version   text not null references public.dataset_versions (id),
  last_reviewed_at  date not null,
  constraint salary_band_order check (salary_min_lpa is null or salary_max_lpa is null or salary_min_lpa <= salary_max_lpa)
);

create table public.role_requirements (
  role_id            text not null references public.roles (id) on delete cascade,
  skill_id           text not null references public.skills (id),
  importance_weight  smallint not null check (importance_weight between 1 and 5),
  required_level     smallint not null check (required_level between 1 and 4),
  is_mandatory       boolean not null default false,
  evidence_rubric    text not null,
  primary key (role_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- Worker profile and skill evidence
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references public.app_users (user_id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 1 and 80),
  headline            text not null,
  current_role_title  text,
  experience_summary  text not null default '' check (char_length(experience_summary) <= 6000),
  preferences         jsonb not null default '{}'::jsonb,
  consent_version     text not null default 'consent-v1',
  is_synthetic        boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.assessments (
  id                     text primary key check (id ~ '^[a-z0-9-]+$'),
  skill_id               text not null references public.skills (id),
  title                  text not null,
  description            text not null,
  version                text not null,
  items                  jsonb not null,           -- prompts and options only; never answers
  pass_threshold         integer not null check (pass_threshold > 0),
  level_on_pass          smallint not null check (level_on_pass between 1 and 4),
  time_estimate_minutes  integer not null check (time_estimate_minutes > 0),
  is_demo                boolean not null default true
);

-- Answer keys live apart from the questions so no client-facing grant can
-- ever expose them.
create table public.assessment_keys (
  assessment_id  text primary key references public.assessments (id) on delete cascade,
  answer_key     jsonb not null
);

create table public.assessment_results (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  assessment_id  text not null references public.assessments (id),
  skill_id       text not null references public.skills (id),
  score          integer not null check (score >= 0),
  max_score      integer not null check (max_score > 0),
  passed         boolean not null,
  item_results   jsonb not null,
  status_before  text not null,
  level_before   smallint,
  status_after   text not null,
  level_after    smallint,
  reviewer_type  text not null default 'auto_rubric' check (reviewer_type in ('auto_rubric', 'human_reviewer')),
  created_at     timestamptz not null default now(),
  constraint score_within_max check (score <= max_score)
);

create table public.worker_skills (
  profile_id             uuid not null references public.profiles (id) on delete cascade,
  skill_id               text not null references public.skills (id),
  status                 text not null check (status in ('self_reported', 'inferred', 'verified', 'unknown', 'not_demonstrated')),
  proficiency            smallint check (proficiency between 0 and 4),
  evidence_snippet       text check (char_length(evidence_snippet) <= 400),
  evidence_source_type   text not null check (evidence_source_type in ('work_history_text', 'user_confirmation', 'assessment')),
  confidence             double precision check (confidence between 0 and 1),
  confidence_method      text,
  review_state           text not null default 'pending' check (review_state in ('pending', 'confirmed', 'edited', 'rejected', 'assessed')),
  verified_by_result_id  uuid references public.assessment_results (id),
  updated_at             timestamptz not null default now(),
  primary key (profile_id, skill_id),
  -- "unknown" is a state, never a level of zero.
  constraint unknown_has_no_level check ((status = 'unknown') = (proficiency is null)),
  -- A verified claim must point at the assessment evidence that verified it.
  constraint verified_requires_evidence check (status <> 'verified' or verified_by_result_id is not null)
);

create table public.learning_resources (
  id           text primary key,
  skill_id     text not null references public.skills (id),
  title        text not null,
  provider     text not null,
  url          text not null check (url ~ '^https://'),
  format       text not null,
  cost_band    text not null,
  checked_at   date,
  verified     boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Recommendations (stored for reproducibility; computed by the backend engine)
-- ---------------------------------------------------------------------------

create table public.recommendation_runs (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  input_hash       text not null,
  dataset_version  text not null,
  scoring_version  text not null,
  trigger          text not null,
  result           jsonb not null,
  created_at       timestamptz not null default now()
);
create index recommendation_runs_latest on public.recommendation_runs (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Mentors, consent, sharing, opportunities
-- ---------------------------------------------------------------------------

create table public.mentor_profiles (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid unique references public.app_users (user_id) on delete set null,
  display_name                 text not null,
  headline                     text not null,
  bio                          text not null,
  skill_ids                    text[] not null default '{}',
  role_experience              text[] not null default '{}',
  transition_experience        boolean not null default false,
  languages                    text[] not null default '{}',
  session_formats              text[] not null default '{}',
  availability_hours_per_week  integer not null default 0 check (availability_hours_per_week >= 0),
  capacity_remaining           integer not null default 0 check (capacity_remaining >= 0),
  verification_status          text not null default 'synthetic_demo' check (verification_status in ('synthetic_demo', 'verified')),
  is_synthetic                 boolean not null default true
);

-- Field vocabulary a worker can choose to share. Kept in one function so the
-- CHECK constraints, projection functions and API agree.
create function public.shareable_fields() returns text[]
language sql immutable as $$
  select array[
    'display_name', 'career_goal', 'skills_summary', 'skill_evidence', 'gap_areas',
    'assessment_results', 'career_preferences', 'role_suitability', 'experience_summary'
  ]::text[]
$$;

create table public.consent_events (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  purpose          text not null check (purpose in ('mentor_request', 'recruiter_share')),
  recipient_type   text not null check (recipient_type in ('mentor', 'recruiter_org')),
  recipient_id     uuid not null,
  fields           text[] not null,
  consent_version  text not null,
  statement        text not null,
  granted          boolean not null,
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  constraint consent_fields_valid check (cardinality(fields) > 0 and fields <@ public.shareable_fields())
);

create table public.mentor_requests (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  mentor_id         uuid not null references public.mentor_profiles (id),
  target_role_id    text not null references public.roles (id),
  focus_skill_ids   text[] not null default '{}',
  shared_fields     text[] not null,
  consent_event_id  uuid not null references public.consent_events (id),
  message           text check (char_length(message) <= 500),
  status            text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'revoked', 'completed')),
  created_at        timestamptz not null default now(),
  responded_at      timestamptz,
  revoked_at        timestamptz,
  constraint shared_fields_valid check (cardinality(shared_fields) > 0 and shared_fields <@ public.shareable_fields())
);
create unique index mentor_requests_one_open
  on public.mentor_requests (profile_id, mentor_id)
  where status in ('requested', 'accepted');

create table public.mentor_notes (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.mentor_requests (id) on delete cascade,
  author_user_id  uuid not null references public.app_users (user_id),
  -- progress = mentor's private working notes; feedback = shared with the worker
  kind            text not null check (kind in ('progress', 'feedback')),
  body            text not null check (char_length(body) between 1 and 1000),
  action_items    text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create table public.share_grants (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  org_id            uuid not null references public.organizations (id),
  target_role_id    text references public.roles (id),
  fields            text[] not null,
  purpose           text not null default 'recruiter_review' check (purpose in ('recruiter_review')),
  consent_event_id  uuid not null references public.consent_events (id),
  granted_at        timestamptz not null default now(),
  revoked_at        timestamptz,
  constraint grant_fields_valid check (cardinality(fields) > 0 and fields <@ public.shareable_fields())
);
create unique index share_grants_one_active
  on public.share_grants (profile_id, org_id)
  where revoked_at is null;

create table public.opportunities (
  id               text primary key check (id ~ '^[a-z0-9-]+$'),
  role_id          text not null references public.roles (id),
  org_id           uuid not null references public.organizations (id),
  title            text not null,
  employer_name    text not null,
  location         text not null,
  work_mode        text not null check (work_mode in ('remote', 'hybrid', 'onsite')),
  salary_band_text text,
  source_type      text not null check (source_type in ('simulated', 'sap_mock', 'live_feed')),
  source_url       text,
  last_checked_at  timestamptz,
  status           text not null check (status in ('simulated_open', 'open', 'closed')),
  is_simulated     boolean not null,
  -- A record can only claim to be a live vacancy if it carries provenance.
  constraint simulated_is_labelled check (source_type = 'live_feed' or is_simulated),
  constraint live_requires_provenance check (is_simulated or (source_url is not null and last_checked_at is not null)),
  constraint simulated_status check (not is_simulated or status <> 'open')
);

-- ---------------------------------------------------------------------------
-- Audit trail and demo state
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  actor_user_id       uuid,
  actor_role          text,
  action              text not null,
  object_type         text not null,
  object_id           text,
  subject_profile_id  uuid,                 -- no FK: the trail outlives deletions
  outcome             text not null default 'success' check (outcome in ('success', 'denied', 'error')),
  request_id          text,
  -- IDs, enums and counts only. Never resume text, notes, tokens or answers.
  metadata            jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 2048)
);
create index audit_events_recent on public.audit_events (created_at desc);
create index audit_events_subject on public.audit_events (subject_profile_id, created_at desc);

create table public.demo_state (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
