import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { SHAREABLE_FIELD_LABELS } from '../engine/vocabulary.ts';
import type { Deps } from '../http/context.ts';
import { notFound } from '../http/errors.ts';
import { deny, requireRole } from '../http/guards.ts';
import { recordAudit } from '../services/audit.ts';
import { userLimiter } from './worker.ts';

const uuid = z.uuid();

/** Recruiter workspace: only consent-authorized candidates, via public.recruiter_candidate_view. */
export function recruiterRoutes({ db }: Deps): Router {
  const r = Router();

  r.get('/recruiter/candidates', async (_req, res) => {
    const actor = await requireRole(db, res, 'recruiter');
    const rows = await db.asUser(actor.userId, (q) => q.query<{ list: unknown[] }>('select public.recruiter_candidate_list() as list'));
    res.json({
      organization: { id: actor.orgId, name: actor.orgName },
      eligibility_rule: 'Only workers who explicitly approved sharing with your organisation appear here. Revoked approvals disappear immediately.',
      candidates: rows.rows[0]!.list,
    });
  });

  r.get('/recruiter/candidates/:grantId', async (req, res) => {
    const grantId = uuid.parse(req.params.grantId);
    const actor = await requireRole(db, res, 'recruiter');
    const visible = await db.asUser(actor.userId, (q) =>
      q.query<{ org_id: string; profile_id: string }>('select org_id, profile_id from public.share_grants where id = $1', [grantId]),
    );
    const grant = visible.rows[0];
    if (!grant || grant.org_id !== actor.orgId) {
      throw await deny(db, res, 'grant_not_for_organisation');
    }
    const view = await db.asUser(actor.userId, (q) => q.query<{ v: { grant: { withheld_fields: string[] } } }>('select public.recruiter_candidate_view($1) as v', [grantId]));
    const v = view.rows[0]!.v;
    res.json({
      ...v,
      withheld_field_labels: v.grant.withheld_fields.map((f) => SHAREABLE_FIELD_LABELS[f as keyof typeof SHAREABLE_FIELD_LABELS] ?? f),
      notice: 'Scores are estimated skill fit, not hiring probability. Synthetic candidates and simulated openings are labelled.',
    });
  });

  // ------------------------------------------------------------- openings
  // An approved recruiter posts openings for their own organisation. They are labelled
  // "posted by employer": real, but not checked against any external listing.
  const Opening = z.object({
    role_id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: z.string().trim().min(3).max(120),
    location: z.string().trim().min(2).max(60),
    work_mode: z.enum(['remote', 'hybrid', 'onsite']),
    salary_band_text: z.string().trim().max(60).optional(),
  });
  const writeLimiter = userLimiter(30);

  r.get('/recruiter/openings', async (_req, res) => {
    const actor = await requireRole(db, res, 'recruiter');
    const rows = await db.asUser(actor.userId, (q) =>
      q.query(
        `select o.id, o.title, o.role_id, r.title as role_title, o.location, o.work_mode, o.salary_band_text, o.source_type,
                o.status, o.is_simulated, o.posted_at
         from public.opportunities o join public.roles r on r.id = o.role_id
         where o.org_id = $1 order by o.posted_at desc nulls last, o.title`,
        [actor.orgId],
      ),
    );
    res.json({ organization: { id: actor.orgId, name: actor.orgName }, openings: rows.rows });
  });

  r.post('/recruiter/openings', writeLimiter, async (req, res) => {
    const actor = await requireRole(db, res, 'recruiter');
    const body = Opening.parse(req.body);
    const created = await db.asService(async (q) => {
      const role = await q.query('select 1 from public.roles where id = $1', [body.role_id]);
      if (!role.rows[0]) throw notFound('Role not found.');
      const id = `post-${randomUUID().slice(0, 12)}`;
      const row = await q.query(
        `insert into public.opportunities (id, role_id, org_id, title, employer_name, location, work_mode, salary_band_text,
           source_type, status, is_simulated, posted_by, posted_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, 'employer_posted', 'open', false, $9, now())
         returning id, title, role_id, location, work_mode, salary_band_text, source_type, status, is_simulated, posted_at`,
        [id, body.role_id, actor.orgId, body.title, actor.orgName ?? 'Employer', body.location, body.work_mode, body.salary_band_text ?? null, actor.userId],
      );
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'opening.posted', objectType: 'opportunity', objectId: id,
        requestId: res.locals.requestId as string, metadata: { role_id: body.role_id },
      });
      return row.rows[0];
    });
    res.status(201).json({ opening: created });
  });

  r.post('/recruiter/openings/:id/close', writeLimiter, async (req, res) => {
    const actor = await requireRole(db, res, 'recruiter');
    const id = z.string().regex(/^[a-z0-9-]{1,80}$/).parse(req.params.id);
    const out = await db.asService(async (q) => {
      const row = await q.query<{ id: string }>(
        `update public.opportunities set status = 'closed' where id = $1 and org_id = $2 and source_type = 'employer_posted' returning id`,
        [id, actor.orgId],
      );
      if (!row.rows[0]) return null;
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'opening.closed', objectType: 'opportunity', objectId: id,
        requestId: res.locals.requestId as string,
      });
      return row.rows[0];
    });
    if (!out) throw await deny(db, res, 'opening_not_for_organisation');
    res.json({ id: out.id, status: 'closed' });
  });

  return r;
}
