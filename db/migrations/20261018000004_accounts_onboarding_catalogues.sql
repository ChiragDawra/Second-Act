-- Second Act — self-service accounts, onboarding, approval and a second catalogue.
--
-- 1. Google sign-in creates an auth user with no Second Act role. The user
--    onboards once (job seeker, mentor or recruiter). Job seekers are active
--    at once; mentors and recruiters wait for an admin decision.
-- 2. Every role helper below now requires an ACTIVE account, so a pending or
--    rejected account has no row-level access, whatever role it asked for.
-- 3. The Delhi-NCR pilot catalogue lives beside the demo catalogue. Each
--    profile, role, skill and mentor belongs to exactly one catalogue, and the
--    database refuses to mix them.
-- 4. An approved recruiter can post an opening; it is labelled as posted by
--    the employer, never as a verified live feed.

-- ---------------------------------------------------------------------------
-- Catalogues
-- ---------------------------------------------------------------------------

alter table public.skills
  add column catalogue text not null default 'demo' check (catalogue in ('demo', 'ncr'));
alter table public.roles
  add column catalogue text not null default 'demo' check (catalogue in ('demo', 'ncr'));
alter table public.mentor_profiles
  add column catalogue text not null default 'demo' check (catalogue in ('demo', 'ncr'));
alter table public.profiles
  add column catalogue text not null default 'demo' check (catalogue in ('demo', 'ncr')),
  add column sector text check (sector in ('qa', 'banking-ba', 'support', 'data'));

create function app_private.enforce_requirement_catalogue() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select catalogue from public.roles where id = new.role_id)
     is distinct from (select catalogue from public.skills where id = new.skill_id) then
    raise exception 'role and skill belong to different catalogues' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger role_requirements_same_catalogue
  before insert or update on public.role_requirements
  for each row execute function app_private.enforce_requirement_catalogue();

create function app_private.enforce_worker_skill_catalogue() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select catalogue from public.profiles where id = new.profile_id)
     is distinct from (select catalogue from public.skills where id = new.skill_id) then
    raise exception 'skill is not in this profile''s catalogue' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger worker_skills_same_catalogue
  before insert or update on public.worker_skills
  for each row execute function app_private.enforce_worker_skill_catalogue();

-- ---------------------------------------------------------------------------
-- Accounts and approval
-- ---------------------------------------------------------------------------

alter table public.app_users
  add column status text not null default 'active' check (status in ('active', 'pending', 'rejected')),
  add column email text check (email is null or char_length(email) <= 254),
  add column onboarded_at timestamptz,
  add column decided_at timestamptz,
  add column decided_by uuid;

-- A real (non-synthetic) mentor or recruiter can only be active or rejected
-- after a recorded admin decision.
alter table public.app_users
  add constraint decision_recorded check (
    status = 'pending' or is_synthetic or role in ('worker', 'admin') or decided_at is not null
  );

alter table public.organizations
  add column status text not null default 'active' check (status in ('active', 'pending', 'rejected')),
  add column created_by uuid;

alter table public.mentor_profiles drop constraint mentor_profiles_verification_status_check;
alter table public.mentor_profiles
  add constraint mentor_profiles_verification_status_check
  check (verification_status in ('synthetic_demo', 'pending', 'verified', 'rejected'));

-- Role helpers: an account carries its role only while it is active.
create or replace function app_private.current_app_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.app_users where user_id = auth.uid() and status = 'active'
$$;

create or replace function app_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select role = 'admin' from public.app_users where user_id = auth.uid() and status = 'active'
  ), false)
$$;

create or replace function app_private.my_profile_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id
  from public.profiles p
  join public.app_users u on u.user_id = p.user_id
  where p.user_id = auth.uid() and u.role = 'worker' and u.status = 'active'
$$;

create or replace function app_private.my_mentor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id
  from public.mentor_profiles m
  join public.app_users u on u.user_id = m.user_id
  where m.user_id = auth.uid() and u.role = 'mentor' and u.status = 'active'
$$;

create or replace function app_private.my_org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.org_id
  from public.app_users u
  join public.organizations o on o.id = u.org_id
  where u.user_id = auth.uid() and u.role = 'recruiter' and u.status = 'active' and o.status = 'active'
$$;

-- ---------------------------------------------------------------------------
-- Openings posted by an approved recruiter
-- ---------------------------------------------------------------------------

alter table public.opportunities
  add column posted_by uuid,
  add column posted_at timestamptz;

alter table public.opportunities drop constraint opportunities_source_type_check;
alter table public.opportunities
  add constraint opportunities_source_type_check
  check (source_type in ('simulated', 'sap_mock', 'live_feed', 'employer_posted'));

alter table public.opportunities drop constraint simulated_is_labelled;
alter table public.opportunities
  add constraint simulated_is_labelled check (source_type in ('live_feed', 'employer_posted') or is_simulated);

alter table public.opportunities drop constraint live_requires_provenance;
alter table public.opportunities
  add constraint live_requires_provenance check (
    is_simulated
    or (source_type = 'employer_posted' and posted_by is not null and posted_at is not null)
    or (source_url is not null and last_checked_at is not null)
  );

-- ---------------------------------------------------------------------------
-- Privileges for new columns
-- ---------------------------------------------------------------------------

grant select (catalogue) on public.mentor_profiles to authenticated;
