import { Router } from 'express';
import { z } from 'zod';
import { SHAREABLE_FIELD_LABELS, SHAREABLE_FIELDS } from '../engine/vocabulary.ts';
import { actorOf, type Deps } from '../http/context.ts';
import { notFound } from '../http/errors.ts';

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);

/** Catalogue and identity endpoints available to every signed-in role. */
export function commonRoutes({ db }: Deps): Router {
  const r = Router();

  r.get('/me', (_req, res) => {
    const a = actorOf(res);
    res.json({
      user_id: a.userId,
      role: a.role,
      display_name: a.displayName,
      org: a.orgId ? { id: a.orgId, name: a.orgName } : null,
      profile_id: a.profileId,
      mentor_id: a.mentorId,
      is_synthetic: a.isSynthetic,
    });
  });

  r.get('/share-fields', (_req, res) => {
    res.json({ fields: SHAREABLE_FIELDS.map((id) => ({ id, label: SHAREABLE_FIELD_LABELS[id] })) });
  });

  r.get('/roles', async (_req, res) => {
    const a = actorOf(res);
    const rows = await db.asUser(a.userId, (q) =>
      q.query('select id, title, family, employment_type, work_mode, locations, dataset_version from public.roles order by title'),
    );
    res.json({ roles: rows.rows });
  });

  r.get('/roles/:id', async (req, res) => {
    const id = slug.parse(req.params.id);
    const a = actorOf(res);
    const data = await db.asUser(a.userId, async (q) => {
      const role = await q.query(
        `select id, title, family, description, employment_type, work_mode, locations, salary_min_lpa, salary_max_lpa,
                salary_note, demand_note, source, dataset_version, last_reviewed_at
         from public.roles where id = $1`,
        [id],
      );
      const reqs = await q.query(
        `select rr.skill_id, s.canonical_name as name, rr.importance_weight, rr.required_level, rr.is_mandatory, rr.evidence_rubric
         from public.role_requirements rr join public.skills s on s.id = rr.skill_id
         where rr.role_id = $1 order by rr.is_mandatory desc, rr.importance_weight desc, s.canonical_name`,
        [id],
      );
      const opps = await q.query(
        `select id, title, employer_name, location, work_mode, salary_band_text, source_type, status, is_simulated
         from public.opportunities where role_id = $1 order by title`,
        [id],
      );
      return { role: role.rows[0], requirements: reqs.rows, opportunities: opps.rows };
    });
    if (!data.role) throw notFound('Role not found.');
    res.json({ ...data.role, requirements: data.requirements, opportunities: data.opportunities });
  });

  r.get('/opportunities', async (_req, res) => {
    const a = actorOf(res);
    const rows = await db.asUser(a.userId, (q) =>
      q.query(
        `select o.id, o.title, o.employer_name, o.org_id, o.location, o.work_mode, o.salary_band_text, o.source_type,
                o.source_url, o.last_checked_at, o.status, o.is_simulated, o.role_id, r.title as role_title
         from public.opportunities o join public.roles r on r.id = o.role_id
         order by o.employer_name, o.title`,
      ),
    );
    res.json({
      opportunities: rows.rows.map((o) => ({
        ...o,
        provenance_label: (o as { is_simulated: boolean }).is_simulated
          ? 'Simulated opening — no current vacancy verified'
          : 'Live listing',
      })),
    });
  });

  r.get('/organizations', async (_req, res) => {
    const a = actorOf(res);
    const rows = await db.asUser(a.userId, (q) => q.query('select id, name, kind, is_synthetic from public.organizations order by name'));
    res.json({ organizations: rows.rows });
  });

  r.get('/assessments', async (req, res) => {
    const a = actorOf(res);
    const skillId = req.query.skill_id === undefined ? null : slug.parse(req.query.skill_id);
    const rows = await db.asUser(a.userId, (q) =>
      q.query(
        `select a.id, a.skill_id, s.canonical_name as skill_name, a.title, a.description, a.version, a.pass_threshold,
                a.level_on_pass, a.time_estimate_minutes, a.is_demo, jsonb_array_length(a.items) as item_count
         from public.assessments a join public.skills s on s.id = a.skill_id
         where $1::text is null or a.skill_id = $1 order by a.title`,
        [skillId],
      ),
    );
    res.json({ assessments: rows.rows });
  });

  r.get('/assessments/:id', async (req, res) => {
    const id = slug.parse(req.params.id);
    const a = actorOf(res);
    const rows = await db.asUser(a.userId, (q) =>
      q.query(
        `select a.id, a.skill_id, s.canonical_name as skill_name, a.title, a.description, a.version, a.items,
                a.pass_threshold, a.level_on_pass, a.time_estimate_minutes, a.is_demo
         from public.assessments a join public.skills s on s.id = a.skill_id where a.id = $1`,
        [id],
      ),
    );
    if (!rows.rows[0]) throw notFound('Assessment not found.');
    res.json(rows.rows[0]);
  });

  r.get('/learning-resources', async (req, res) => {
    const a = actorOf(res);
    const skillId = req.query.skill_id === undefined ? null : slug.parse(req.query.skill_id);
    const rows = await db.asUser(a.userId, (q) =>
      q.query(
        `select id, skill_id, title, provider, url, format, cost_band, checked_at, verified
         from public.learning_resources where $1::text is null or skill_id = $1 order by title`,
        [skillId],
      ),
    );
    res.json({ resources: rows.rows });
  });

  return r;
}
