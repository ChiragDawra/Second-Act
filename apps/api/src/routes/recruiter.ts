import { Router } from 'express';
import { z } from 'zod';
import { SHAREABLE_FIELD_LABELS } from '../engine/vocabulary.ts';
import type { Deps } from '../http/context.ts';
import { deny, requireRole } from '../http/guards.ts';

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
      notice: 'Synthetic candidate. Scores are estimated skill fit, not hiring probability. Openings are simulated.',
    });
  });

  return r;
}
