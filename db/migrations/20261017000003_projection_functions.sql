-- Second Act — consent-scoped projections.
--
-- These SECURITY DEFINER functions are the only path by which one account can
-- read another account's worker data. Each function:
--   1. derives the caller from auth.uid() (never from a parameter),
--   2. re-checks the relationship and the consent state,
--   3. returns only the fields the worker approved, and
--   4. records a minimal "share.viewed" audit event.
-- The backend calls them in the caller's own database context after making
-- its own authorization decision, so both layers must agree.

-- Builds the consented view of one worker. Not callable by clients.
create function app_private.build_shared_projection(p_profile_id uuid, p_fields text[], p_role_id text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_run     public.recommendation_runs;
  v_eval    jsonb;
  v_out     jsonb := '{}'::jsonb;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if not found then
    return null;
  end if;

  select * into v_run
  from public.recommendation_runs
  where profile_id = p_profile_id
  order by created_at desc
  limit 1;

  if p_role_id is not null then
    select e into v_eval
    from jsonb_array_elements(coalesce(v_run.result -> 'evaluations', '[]'::jsonb)) e
    where e ->> 'role_id' = p_role_id
    limit 1;
  end if;

  if 'display_name' = any (p_fields) then
    v_out := v_out || jsonb_build_object('display_name', v_profile.display_name);
  end if;

  if 'career_goal' = any (p_fields) then
    v_out := v_out || jsonb_build_object('career_goal', (
      select jsonb_build_object('role_id', r.id, 'title', r.title, 'family', r.family)
      from public.roles r where r.id = p_role_id
    ));
  end if;

  if 'skills_summary' = any (p_fields) then
    v_out := v_out || jsonb_build_object('skills_summary', coalesce((
      select jsonb_agg(jsonb_build_object(
               'skill_id', ws.skill_id, 'name', s.canonical_name,
               'status', ws.status, 'proficiency', ws.proficiency)
             order by s.canonical_name)
      from public.worker_skills ws
      join public.skills s on s.id = ws.skill_id
      where ws.profile_id = p_profile_id and ws.status <> 'unknown'
    ), '[]'::jsonb));
  end if;

  if 'skill_evidence' = any (p_fields) then
    v_out := v_out || jsonb_build_object('skill_evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
               'skill_id', ws.skill_id, 'name', s.canonical_name,
               'evidence_snippet', ws.evidence_snippet,
               'evidence_source_type', ws.evidence_source_type)
             order by s.canonical_name)
      from public.worker_skills ws
      join public.skills s on s.id = ws.skill_id
      where ws.profile_id = p_profile_id and ws.evidence_snippet is not null and ws.status <> 'unknown'
    ), '[]'::jsonb));
  end if;

  if 'gap_areas' = any (p_fields) then
    v_out := v_out || jsonb_build_object('gap_areas', case
      when v_eval is null then null
      else jsonb_build_object(
        'role_id', p_role_id,
        'readiness_status', v_eval -> 'readiness_status',
        'critical_gaps', v_eval -> 'critical_gaps',
        'mandatory', v_eval -> 'mandatory',
        'unknowns', v_eval -> 'unknowns',
        'scoring_version', v_run.scoring_version,
        'computed_at', v_run.created_at)
    end);
  end if;

  if 'assessment_results' = any (p_fields) then
    v_out := v_out || jsonb_build_object('assessment_results', coalesce((
      select jsonb_agg(jsonb_build_object(
               'assessment_id', ar.assessment_id, 'title', a.title,
               'skill_id', ar.skill_id, 'skill_name', s.canonical_name,
               'passed', ar.passed, 'score', ar.score, 'max_score', ar.max_score,
               'level_after', ar.level_after, 'reviewer_type', ar.reviewer_type,
               'is_demo_assessment', a.is_demo, 'created_at', ar.created_at)
             order by ar.created_at desc)
      from public.assessment_results ar
      join public.assessments a on a.id = ar.assessment_id
      join public.skills s on s.id = ar.skill_id
      where ar.profile_id = p_profile_id
    ), '[]'::jsonb));
  end if;

  if 'career_preferences' = any (p_fields) then
    -- The salary floor is deliberately never part of a shared projection.
    v_out := v_out || jsonb_build_object('career_preferences', jsonb_build_object(
      'locations', v_profile.preferences -> 'locations',
      'work_modes', v_profile.preferences -> 'work_modes',
      'employment_types', v_profile.preferences -> 'employment_types',
      'weekly_learning_hours', v_profile.preferences -> 'weekly_learning_hours',
      'languages', v_profile.preferences -> 'languages'));
  end if;

  if 'role_suitability' = any (p_fields) then
    v_out := v_out || jsonb_build_object('role_suitability', case
      when v_run.id is null then null
      else jsonb_build_object(
        'scoring_version', v_run.scoring_version,
        'dataset_version', v_run.dataset_version,
        'computed_at', v_run.created_at,
        'score_type', 'estimated_skill_fit_not_hiring_probability',
        'roles', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'role_id', e ->> 'role_id', 'title', e ->> 'title',
                   'role_fit_score', e -> 'role_fit_score',
                   'evidence_confidence', e -> 'evidence_confidence',
                   'readiness_status', e -> 'readiness_status',
                   'eligibility', e -> 'eligibility', 'rank', e -> 'rank')
                 order by (e ->> 'role_fit_score')::numeric desc nulls last, e ->> 'role_id')
          from jsonb_array_elements(v_run.result -> 'evaluations') e
        ), '[]'::jsonb))
    end);
  end if;

  if 'experience_summary' = any (p_fields) then
    v_out := v_out || jsonb_build_object('experience_summary', v_profile.experience_summary);
  end if;

  return v_out || jsonb_build_object('is_synthetic', v_profile.is_synthetic);
end;
$$;

-- Records a view of shared data, at most once per actor/object per 5 minutes.
create function app_private.record_share_view(p_role text, p_object_type text, p_object_id text, p_profile_id uuid, p_fields text[])
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.audit_events
    where actor_user_id = auth.uid()
      and action = 'share.viewed'
      and object_id = p_object_id
      and created_at > now() - interval '5 minutes'
  ) then
    insert into public.audit_events (actor_user_id, actor_role, action, object_type, object_id, subject_profile_id, metadata)
    values (auth.uid(), p_role, 'share.viewed', p_object_type, p_object_id, p_profile_id,
            jsonb_build_object('fields', to_jsonb(p_fields)));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mentor
-- ---------------------------------------------------------------------------

create function public.mentor_request_list()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_mentor_id uuid := app_private.my_mentor_id();
begin
  if v_mentor_id is null then
    raise exception 'mentor account required' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id,
             'status', r.status,
             'created_at', r.created_at,
             'responded_at', r.responded_at,
             'target_role', jsonb_build_object('role_id', ro.id, 'title', ro.title),
             'shared_fields', to_jsonb(r.shared_fields),
             'worker_display_name', case
               when r.status in ('requested', 'accepted', 'completed') and 'display_name' = any (r.shared_fields)
               then p.display_name end,
             'worker_is_synthetic', p.is_synthetic)
           order by r.created_at desc)
    from public.mentor_requests r
    join public.roles ro on ro.id = r.target_role_id
    join public.profiles p on p.id = r.profile_id
    where r.mentor_id = v_mentor_id
  ), '[]'::jsonb);
end;
$$;

create function public.mentor_request_view(p_request_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_mentor_id uuid := app_private.my_mentor_id();
  v_req       public.mentor_requests;
  v_meta      jsonb;
begin
  select * into v_req from public.mentor_requests where id = p_request_id;
  if not found or v_mentor_id is null or v_req.mentor_id <> v_mentor_id then
    raise exception 'not authorized for this mentorship request' using errcode = '42501';
  end if;

  v_meta := jsonb_build_object(
    'id', v_req.id,
    'status', v_req.status,
    'target_role_id', v_req.target_role_id,
    'focus_skill_ids', to_jsonb(v_req.focus_skill_ids),
    'shared_fields', to_jsonb(v_req.shared_fields),
    'withheld_fields', to_jsonb(array(
      select f from unnest(public.shareable_fields()) f where not (f = any (v_req.shared_fields)))),
    'message', v_req.message,
    'created_at', v_req.created_at,
    'responded_at', v_req.responded_at);

  -- Declined or revoked requests no longer expose any worker data.
  if v_req.status not in ('requested', 'accepted', 'completed') then
    return jsonb_build_object('request', v_meta, 'shared', null);
  end if;

  perform app_private.record_share_view('mentor', 'mentor_request', v_req.id::text, v_req.profile_id, v_req.shared_fields);

  return jsonb_build_object(
    'request', v_meta,
    'shared', app_private.build_shared_projection(v_req.profile_id, v_req.shared_fields, v_req.target_role_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Recruiter
-- ---------------------------------------------------------------------------

create function public.recruiter_candidate_list()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := app_private.my_org_id();
begin
  if v_org is null then
    raise exception 'recruiter account required' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'grant_id', g.id,
             'granted_at', g.granted_at,
             'fields', to_jsonb(g.fields),
             'display_name', case when 'display_name' = any (g.fields) then p.display_name end,
             'career_goal', case when 'career_goal' = any (g.fields) then (
               select jsonb_build_object('role_id', r.id, 'title', r.title)
               from public.roles r where r.id = g.target_role_id) end,
             'is_synthetic', p.is_synthetic)
           order by g.granted_at desc)
    from public.share_grants g
    join public.profiles p on p.id = g.profile_id
    where g.org_id = v_org and g.revoked_at is null
  ), '[]'::jsonb);
end;
$$;

create function public.recruiter_candidate_view(p_grant_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_org    uuid := app_private.my_org_id();
  v_grant  public.share_grants;
  v_shared jsonb;
  v_fit    jsonb := null;
begin
  select * into v_grant from public.share_grants where id = p_grant_id;
  if not found or v_org is null or v_grant.org_id <> v_org or v_grant.revoked_at is not null then
    raise exception 'not authorized for this candidate' using errcode = '42501';
  end if;

  perform app_private.record_share_view('recruiter', 'share_grant', v_grant.id::text, v_grant.profile_id, v_grant.fields);

  v_shared := app_private.build_shared_projection(v_grant.profile_id, v_grant.fields, v_grant.target_role_id);

  -- Suitability for this organisation's (simulated) openings, only when the
  -- worker shared role suitability.
  if 'role_suitability' = any (v_grant.fields) then
    v_fit := coalesce((
      select jsonb_agg(jsonb_build_object(
               'opportunity_id', o.id,
               'title', o.title,
               'role_id', o.role_id,
               'is_simulated', o.is_simulated,
               'evaluation', (
                 select jsonb_build_object(
                   'role_fit_score', e -> 'role_fit_score',
                   'evidence_confidence', e -> 'evidence_confidence',
                   'readiness_status', e -> 'readiness_status',
                   'eligibility', e -> 'eligibility')
                 from jsonb_array_elements(v_shared -> 'role_suitability' -> 'roles') e
                 where e ->> 'role_id' = o.role_id
                 limit 1))
             order by o.title)
      from public.opportunities o
      where o.org_id = v_org
    ), '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'grant', jsonb_build_object(
      'id', v_grant.id,
      'granted_at', v_grant.granted_at,
      'target_role_id', v_grant.target_role_id,
      'fields', to_jsonb(v_grant.fields),
      'withheld_fields', to_jsonb(array(
        select f from unnest(public.shareable_fields()) f where not (f = any (v_grant.fields))))),
    'shared', v_shared,
    'opportunity_fit', v_fit);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: aggregate status only (no worker content)
-- ---------------------------------------------------------------------------

create function public.admin_synthetic_status()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.is_admin() then
    raise exception 'admin account required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'worker_profiles', (select count(*) from public.profiles),
    'synthetic_worker_profiles', (select count(*) from public.profiles where is_synthetic),
    'mentor_profiles', (select count(*) from public.mentor_profiles),
    'synthetic_mentor_profiles', (select count(*) from public.mentor_profiles where is_synthetic),
    'opportunities', (select count(*) from public.opportunities),
    'simulated_opportunities', (select count(*) from public.opportunities where is_simulated),
    'organizations', (select count(*) from public.organizations),
    'synthetic_organizations', (select count(*) from public.organizations where is_synthetic),
    'app_users_by_role', coalesce((
      select jsonb_object_agg(role, n) from (
        select role, count(*) as n from public.app_users group by role) t), '{}'::jsonb),
    'open_mentor_requests', (select count(*) from public.mentor_requests where status in ('requested', 'accepted')),
    'active_share_grants', (select count(*) from public.share_grants where revoked_at is null),
    'assessment_results', (select count(*) from public.assessment_results),
    'recommendation_runs', (select count(*) from public.recommendation_runs));
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges for the functions above
-- ---------------------------------------------------------------------------

revoke all on function app_private.build_shared_projection(uuid, text[], text) from public, anon, authenticated;
revoke all on function app_private.record_share_view(text, text, text, uuid, text[]) from public, anon, authenticated;

revoke all on function public.mentor_request_list() from public, anon;
revoke all on function public.mentor_request_view(uuid) from public, anon;
revoke all on function public.recruiter_candidate_list() from public, anon;
revoke all on function public.recruiter_candidate_view(uuid) from public, anon;
revoke all on function public.admin_synthetic_status() from public, anon;
revoke all on function public.shareable_fields() from anon;

grant execute on function
  public.mentor_request_list(),
  public.mentor_request_view(uuid),
  public.recruiter_candidate_list(),
  public.recruiter_candidate_view(uuid),
  public.admin_synthetic_status(),
  public.shareable_fields()
  to authenticated, service_role;
