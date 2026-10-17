import type { Queryable } from '../db/types.ts';
import {
  ASSESSMENTS,
  DATASET_VERSIONS,
  LEARNING_RESOURCES,
  MENTORS,
  OPPORTUNITIES,
  ORGANIZATIONS,
  RELEASED_AT,
  ROLES,
  SKILLS,
  TAXONOMY_VERSION,
} from '../data/demo-v1.ts';

const TAXONOMY_SOURCE = 'Second Act curated skill list (ESCO/O*NET-aligned labels; not an import)';

/**
 * Idempotently upserts the shared, non-personal catalogue: versions,
 * organisations, skills, roles, requirements, assessments, resources,
 * mentors and simulated opportunities. Run in service context.
 */
export async function upsertCatalog(q: Queryable): Promise<void> {
  for (const v of DATASET_VERSIONS) {
    await q.query(
      `insert into public.dataset_versions (id, kind, description, source, released_at, is_synthetic)
       values ($1, $2, $3, $4, $5, true)
       on conflict (id) do update set kind = excluded.kind, description = excluded.description,
         source = excluded.source, released_at = excluded.released_at`,
      [v.id, v.kind, v.description, v.source, RELEASED_AT],
    );
  }

  for (const o of ORGANIZATIONS) {
    await q.query(
      `insert into public.organizations (id, name, kind, is_synthetic) values ($1, $2, $3, true)
       on conflict (id) do update set name = excluded.name, kind = excluded.kind`,
      [o.id, o.name, o.kind],
    );
  }

  for (const s of SKILLS) {
    await q.query(
      `insert into public.skills (id, canonical_name, category, description, aliases, learning_hours_per_level, taxonomy_source, taxonomy_version)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set canonical_name = excluded.canonical_name, category = excluded.category,
         description = excluded.description, aliases = excluded.aliases,
         learning_hours_per_level = excluded.learning_hours_per_level,
         taxonomy_source = excluded.taxonomy_source, taxonomy_version = excluded.taxonomy_version`,
      [s.id, s.canonical_name, s.category, s.description, [...s.aliases], s.learning_hours_per_level, TAXONOMY_SOURCE, TAXONOMY_VERSION],
    );
  }

  for (const r of ROLES) {
    await q.query(
      `insert into public.roles (id, title, family, description, employment_type, work_mode, locations,
         salary_min_lpa, salary_max_lpa, source, dataset_version, last_reviewed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update set title = excluded.title, family = excluded.family,
         description = excluded.description, employment_type = excluded.employment_type,
         work_mode = excluded.work_mode, locations = excluded.locations,
         salary_min_lpa = excluded.salary_min_lpa, salary_max_lpa = excluded.salary_max_lpa,
         source = excluded.source, dataset_version = excluded.dataset_version,
         last_reviewed_at = excluded.last_reviewed_at`,
      [r.id, r.title, r.family, r.description, r.employment_type, r.work_mode, r.locations,
        r.salary_min_lpa, r.salary_max_lpa, r.source, r.dataset_version, r.last_reviewed_at],
    );
    await q.query('delete from public.role_requirements where role_id = $1', [r.id]);
    for (const req of r.requirements) {
      await q.query(
        `insert into public.role_requirements (role_id, skill_id, importance_weight, required_level, is_mandatory, evidence_rubric)
         values ($1, $2, $3, $4, $5, $6)`,
        [r.id, req.skill_id, req.importance_weight, req.required_level, req.is_mandatory, req.evidence_rubric],
      );
    }
  }

  for (const a of ASSESSMENTS) {
    await q.query(
      `insert into public.assessments (id, skill_id, title, description, version, items, pass_threshold, level_on_pass, time_estimate_minutes, is_demo)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, true)
       on conflict (id) do update set skill_id = excluded.skill_id, title = excluded.title,
         description = excluded.description, version = excluded.version, items = excluded.items,
         pass_threshold = excluded.pass_threshold, level_on_pass = excluded.level_on_pass,
         time_estimate_minutes = excluded.time_estimate_minutes`,
      [a.id, a.skill_id, a.title, a.description, a.version, JSON.stringify(a.items), a.pass_threshold, a.level_on_pass, a.time_estimate_minutes],
    );
    await q.query(
      `insert into public.assessment_keys (assessment_id, answer_key) values ($1, $2::jsonb)
       on conflict (assessment_id) do update set answer_key = excluded.answer_key`,
      [a.id, JSON.stringify(a.answer_key)],
    );
  }

  for (const l of LEARNING_RESOURCES) {
    await q.query(
      `insert into public.learning_resources (id, skill_id, title, provider, url, format, cost_band, checked_at, verified)
       values ($1, $2, $3, $4, $5, $6, $7, null, false)
       on conflict (id) do update set skill_id = excluded.skill_id, title = excluded.title,
         provider = excluded.provider, url = excluded.url, format = excluded.format, cost_band = excluded.cost_band`,
      [l.id, l.skill_id, l.title, l.provider, l.url, l.format, l.cost_band],
    );
  }

  for (const m of MENTORS) {
    await q.query(
      `insert into public.mentor_profiles (id, display_name, headline, bio, skill_ids, role_experience, transition_experience,
         languages, session_formats, availability_hours_per_week, capacity_remaining, verification_status, is_synthetic)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'synthetic_demo', true)
       on conflict (id) do update set display_name = excluded.display_name, headline = excluded.headline,
         bio = excluded.bio, skill_ids = excluded.skill_ids, role_experience = excluded.role_experience,
         transition_experience = excluded.transition_experience, languages = excluded.languages,
         session_formats = excluded.session_formats,
         availability_hours_per_week = excluded.availability_hours_per_week,
         capacity_remaining = excluded.capacity_remaining`,
      [m.id, m.display_name, m.headline, m.bio, m.skill_ids, m.role_experience, m.transition_experience,
        m.languages, m.session_formats, m.availability_hours_per_week, m.capacity_remaining],
    );
  }

  for (const o of OPPORTUNITIES) {
    await q.query(
      `insert into public.opportunities (id, role_id, org_id, title, employer_name, location, work_mode, salary_band_text,
         source_type, source_url, last_checked_at, status, is_simulated)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'simulated', null, null, 'simulated_open', true)
       on conflict (id) do update set role_id = excluded.role_id, org_id = excluded.org_id, title = excluded.title,
         employer_name = excluded.employer_name, location = excluded.location, work_mode = excluded.work_mode,
         salary_band_text = excluded.salary_band_text`,
      [o.id, o.role_id, o.org_id, o.title, o.employer_name, o.location, o.work_mode, o.salary_band_text],
    );
  }
}
