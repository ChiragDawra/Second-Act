-- Second Act — database-level invariants, grants and row-level security.
--
-- Authorization model
--   * The Express API is the authority: it authenticates every request,
--     resolves the actor's role from public.app_users and checks object-level
--     permission before doing anything.
--   * The database is defence in depth. Signed-in clients ("authenticated")
--     get read-only access to their own rows and to the shared catalogue.
--     They get no INSERT/UPDATE/DELETE privilege on any table, so the
--     public Data API cannot bypass backend validation or consent checks.
--   * Cross-account reads (mentor, recruiter) are only possible through the
--     SECURITY DEFINER projection functions in the next migration, which
--     re-check the relationship and return only consented fields.
--   * Admins can read audit/demo metadata but not worker profiles, skills or
--     work history.

-- ---------------------------------------------------------------------------
-- Invariant triggers (apply to every writer, including the service role)
-- ---------------------------------------------------------------------------

-- A skill may only be "verified" by a passed assessment of that same skill
-- for that same worker.
create function app_private.enforce_verified_evidence() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'verified' and not exists (
    select 1
    from public.assessment_results r
    where r.id = new.verified_by_result_id
      and r.profile_id = new.profile_id
      and r.skill_id = new.skill_id
      and r.passed
  ) then
    raise exception 'verified status requires a passed assessment of this skill'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger worker_skills_verified_evidence
  before insert or update on public.worker_skills
  for each row execute function app_private.enforce_verified_evidence();

-- Assessment evidence is immutable once recorded.
create function app_private.reject_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '42501';
end;
$$;

create trigger assessment_results_immutable
  before update on public.assessment_results
  for each row execute function app_private.reject_update();

-- The audit trail is append-only for application roles.
create function app_private.protect_audit_events() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'audit events are append-only' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function app_private.protect_audit_events();

-- ---------------------------------------------------------------------------
-- Identity helpers used by policies (SECURITY DEFINER avoids policy recursion)
-- ---------------------------------------------------------------------------

create function app_private.current_app_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.app_users where user_id = auth.uid()
$$;

create function app_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.app_users where user_id = auth.uid()), false)
$$;

create function app_private.my_profile_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id
  from public.profiles p
  join public.app_users u on u.user_id = p.user_id
  where p.user_id = auth.uid() and u.role = 'worker'
$$;

create function app_private.my_mentor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id
  from public.mentor_profiles m
  join public.app_users u on u.user_id = m.user_id
  where m.user_id = auth.uid() and u.role = 'mentor'
$$;

create function app_private.my_org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.app_users where user_id = auth.uid() and role = 'recruiter'
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;
revoke all on schema app_private from public, anon, authenticated;

grant usage on schema app_private to authenticated, service_role;
grant execute on function
  app_private.current_app_role(),
  app_private.is_admin(),
  app_private.my_profile_id(),
  app_private.my_mentor_id(),
  app_private.my_org_id()
  to authenticated, service_role;

-- Shared catalogue: readable by any signed-in user, never writable.
grant select on
  public.dataset_versions,
  public.organizations,
  public.skills,
  public.roles,
  public.role_requirements,
  public.assessments,
  public.learning_resources,
  public.opportunities
  to authenticated;

-- Mentor catalogue without the linked auth identity.
grant select (
  id, display_name, headline, bio, skill_ids, role_experience, transition_experience,
  languages, session_formats, availability_hours_per_week, capacity_remaining,
  verification_status, is_synthetic
) on public.mentor_profiles to authenticated;

-- Person-level tables: readable only where a policy below allows it.
grant select on
  public.app_users,
  public.profiles,
  public.worker_skills,
  public.assessment_results,
  public.recommendation_runs,
  public.consent_events,
  public.mentor_requests,
  public.mentor_notes,
  public.share_grants,
  public.audit_events,
  public.demo_state
  to authenticated;

-- public.assessment_keys: deliberately no grant to authenticated.

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.dataset_versions    enable row level security;
alter table public.organizations       enable row level security;
alter table public.app_users           enable row level security;
alter table public.skills              enable row level security;
alter table public.roles               enable row level security;
alter table public.role_requirements   enable row level security;
alter table public.profiles            enable row level security;
alter table public.assessments         enable row level security;
alter table public.assessment_keys     enable row level security;
alter table public.assessment_results  enable row level security;
alter table public.worker_skills       enable row level security;
alter table public.learning_resources  enable row level security;
alter table public.recommendation_runs enable row level security;
alter table public.mentor_profiles     enable row level security;
alter table public.consent_events      enable row level security;
alter table public.mentor_requests     enable row level security;
alter table public.mentor_notes        enable row level security;
alter table public.share_grants        enable row level security;
alter table public.opportunities       enable row level security;
alter table public.audit_events        enable row level security;
alter table public.demo_state          enable row level security;

-- Catalogue
create policy catalogue_read on public.dataset_versions   for select to authenticated using (true);
create policy catalogue_read on public.organizations      for select to authenticated using (true);
create policy catalogue_read on public.skills             for select to authenticated using (true);
create policy catalogue_read on public.roles              for select to authenticated using (true);
create policy catalogue_read on public.role_requirements  for select to authenticated using (true);
create policy catalogue_read on public.assessments        for select to authenticated using (true);
create policy catalogue_read on public.learning_resources for select to authenticated using (true);
create policy catalogue_read on public.mentor_profiles    for select to authenticated using (true);
create policy catalogue_read on public.opportunities      for select to authenticated using (true);

-- Own identity
create policy own_account on public.app_users
  for select to authenticated using (user_id = (select auth.uid()));

-- Worker-owned data
create policy owner_read on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));

create policy owner_read on public.worker_skills
  for select to authenticated using (profile_id = (select app_private.my_profile_id()));

create policy owner_read on public.assessment_results
  for select to authenticated using (profile_id = (select app_private.my_profile_id()));

create policy owner_read on public.recommendation_runs
  for select to authenticated using (profile_id = (select app_private.my_profile_id()));

create policy owner_read on public.consent_events
  for select to authenticated using (profile_id = (select app_private.my_profile_id()));

-- Mentorship: the worker who asked and the mentor who was asked see the
-- request row (metadata only; worker data is reached via projection).
create policy participant_read on public.mentor_requests
  for select to authenticated using (
    profile_id = (select app_private.my_profile_id())
    or mentor_id = (select app_private.my_mentor_id())
  );

-- Notes: mentors see notes they wrote; workers see feedback (never the
-- mentor's private progress notes).
create policy participant_read on public.mentor_notes
  for select to authenticated using (
    exists (
      select 1 from public.mentor_requests r
      where r.id = request_id
        and (
          (r.mentor_id = (select app_private.my_mentor_id()) and author_user_id = (select auth.uid()))
          or (r.profile_id = (select app_private.my_profile_id()) and kind = 'feedback')
        )
    )
  );

-- Recruiter sharing: the worker sees all their grants; a recruiter sees only
-- active grants addressed to their organisation.
create policy participant_read on public.share_grants
  for select to authenticated using (
    profile_id = (select app_private.my_profile_id())
    or (org_id = (select app_private.my_org_id()) and revoked_at is null)
  );

-- Audit: admins see the trail; workers see events about their own profile.
create policy audit_read on public.audit_events
  for select to authenticated using (
    (select app_private.is_admin())
    or subject_profile_id = (select app_private.my_profile_id())
  );

create policy admin_read on public.demo_state
  for select to authenticated using ((select app_private.is_admin()));

-- public.assessment_keys: RLS enabled with no policy => no client access.
