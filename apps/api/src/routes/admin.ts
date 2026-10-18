import { Router } from 'express';
import { z } from 'zod';
import { EVIDENCE_FACTORS, EXTRACTION_VERSION, MENTOR_MATCH_VERSION, SCORING_VERSION } from '../engine/vocabulary.ts';
import type { Deps } from '../http/context.ts';
import { badRequest, conflict, notFound } from '../http/errors.ts';
import { requireRole } from '../http/guards.ts';
import { resetScenario } from '../seed/scenario.ts';
import { recordAudit } from '../services/audit.ts';
import { userLimiter } from './worker.ts';

const startedAt = Date.now();

/** What is live, synthetic, simulated or planned — shown verbatim in the admin console. */
export const INTEGRATIONS = [
  { name: 'Supabase Auth', status: 'live', detail: 'Google sign-in for real users; email and password only for the four demo accounts.' },
  { name: 'Account approval', status: 'live', detail: 'Job seekers are active at once. Mentors and recruiters wait for an admin decision.' },
  { name: 'Supabase PostgreSQL + RLS', status: 'live', detail: 'Persistent state. Row-level security is enforced on every user-context query.' },
  { name: 'Adjacency Engine (fit-v1)', status: 'live', detail: 'Deterministic, versioned scoring computed by this API.' },
  { name: 'Skill extraction', status: 'live', detail: 'Deterministic phrase/alias matcher. No LLM is called.' },
  { name: 'Demo worker, mentor and employer records', status: 'synthetic', detail: 'Fictional demo data, labelled in every view. Self-service accounts are real users.' },
  { name: 'Delhi-NCR roles and skills', status: 'live', detail: 'Team-drafted pilot catalogue (17 roles, 62 skills), not yet reviewed by a domain expert.' },
  { name: 'Job openings', status: 'simulated', detail: 'No live vacancy feed. Demo openings are simulated; approved recruiters can post their own, labelled as employer-posted.' },
  { name: 'SAP SuccessFactors / Joule', status: 'planned', detail: 'Not connected. No SAP API is called; any SAP mention describes a planned adapter.' },
] as const;

/** Admin console: system health, versions, synthetic-data status, audit — never worker content. */
export function adminRoutes({ db }: Deps): Router {
  const r = Router();
  const resetLimiter = userLimiter(5);
  const decisionLimiter = userLimiter(60);

  r.get('/admin/overview', async (_req, res) => {
    const actor = await requireRole(db, res, 'admin');
    const latency = await db.ping().catch(() => null);
    const data = await db.asUser(actor.userId, async (q) => {
      const versions = await q.query('select id, kind, description, source, released_at, is_synthetic from public.dataset_versions order by kind, id');
      const synthetic = await q.query<{ s: unknown }>('select public.admin_synthetic_status() as s');
      const state = await q.query<{ key: string; value: unknown; updated_at: string }>('select key, value, updated_at from public.demo_state');
      const denied = await q.query<{ n: number }>(
        "select count(*)::int as n from public.audit_events where outcome = 'denied' and created_at > now() - interval '24 hours'",
      );
      return { versions: versions.rows, synthetic: synthetic.rows[0]!.s, state: state.rows, denied: denied.rows[0]!.n };
    });
    const pending = await db.asService((q) =>
      q.query<{ n: number }>("select count(*)::int as n from public.app_users where status = 'pending' and not is_synthetic"),
    );
    res.json({
      api: { status: 'ok', uptime_seconds: Math.round((Date.now() - startedAt) / 1000), node: process.version },
      database: { status: latency === null ? 'unreachable' : 'ok', latency_ms: latency },
      engine: {
        scoring_version: SCORING_VERSION,
        mentor_match_version: MENTOR_MATCH_VERSION,
        extraction_version: EXTRACTION_VERSION,
        evidence_factors: EVIDENCE_FACTORS,
      },
      dataset_versions: data.versions,
      synthetic_data: data.synthetic,
      demo_state: data.state,
      denied_requests_24h: data.denied,
      pending_accounts: pending.rows[0]!.n,
      integrations: INTEGRATIONS,
      access_note: 'Admins see aggregate counts and audit metadata. Worker profiles, work history and skills are not readable from this account.',
    });
  });

  r.get('/admin/audit', async (req, res) => {
    const actor = await requireRole(db, res, 'admin');
    const { limit, outcome } = z
      .object({ limit: z.coerce.number().int().min(1).max(200).default(100), outcome: z.enum(['success', 'denied', 'error']).optional() })
      .parse(req.query);
    const rows = await db.asUser(actor.userId, (q) =>
      q.query(
        `select id::text as id, created_at, actor_role, action, object_type, object_id, subject_profile_id, outcome, request_id, metadata
         from public.audit_events
         where $2::text is null or outcome = $2
         order by created_at desc, id desc limit $1`,
        [limit, outcome ?? null],
      ),
    );
    res.json({ events: rows.rows });
  });

  // ------------------------------------------------------------ approvals
  // Self-service mentors and recruiters wait here. The admin sees what is needed to decide
  // (name, email, organisation, mentor headline and skills) and never any worker profile data.
  r.get('/admin/accounts', async (req, res) => {
    await requireRole(db, res, 'admin');
    const { status } = z.object({ status: z.enum(['pending', 'active', 'rejected', 'all']).default('pending') }).parse(req.query);
    const rows = await db.asService((q) =>
      q.query(
        `select u.user_id, u.role, u.status, u.display_name, u.email, u.created_at, u.onboarded_at, u.decided_at,
                case when o.id is null then null else jsonb_build_object('id', o.id, 'name', o.name, 'status', o.status) end as org,
                case when m.id is null then null else jsonb_build_object(
                  'headline', m.headline, 'bio', m.bio, 'availability_hours_per_week', m.availability_hours_per_week,
                  'languages', m.languages,
                  'skills', (select coalesce(jsonb_agg(s.canonical_name order by s.canonical_name), '[]'::jsonb)
                             from public.skills s where s.id = any (m.skill_ids))) end as mentor
         from public.app_users u
         left join public.organizations o on o.id = u.org_id
         left join public.mentor_profiles m on m.user_id = u.user_id
         where not u.is_synthetic and ($1 = 'all' or u.status = $1)
         order by u.created_at desc
         limit 200`,
        [status],
      ),
    );
    res.json({ accounts: rows.rows });
  });

  r.post('/admin/accounts/:userId/decision', decisionLimiter, async (req, res) => {
    const actor = await requireRole(db, res, 'admin');
    const userId = z.uuid().parse(req.params.userId);
    const { decision } = z.object({ decision: z.enum(['approve', 'reject']) }).parse(req.body);
    const out = await db.asService(async (q) => {
      const u = await q.query<{ role: string; status: string; is_synthetic: boolean; org_id: string | null }>(
        'select role, status, is_synthetic, org_id from public.app_users where user_id = $1 for update',
        [userId],
      );
      const row = u.rows[0];
      if (!row || row.is_synthetic) throw notFound('Account not found.');
      if (row.status !== 'pending') throw conflict('already_decided', `This account is already ${row.status}.`);
      const next = decision === 'approve' ? 'active' : 'rejected';
      await q.query('update public.app_users set status = $2, decided_at = now(), decided_by = $3 where user_id = $1', [userId, next, actor.userId]);
      if (row.role === 'mentor') {
        await q.query('update public.mentor_profiles set verification_status = $2 where user_id = $1', [userId, decision === 'approve' ? 'verified' : 'rejected']);
      }
      if (row.role === 'recruiter' && row.org_id && decision === 'approve') {
        await q.query("update public.organizations set status = 'active' where id = $1 and status = 'pending'", [row.org_id]);
      }
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: decision === 'approve' ? 'account.approved' : 'account.rejected',
        objectType: 'app_user', objectId: userId, requestId: res.locals.requestId as string, metadata: { role: row.role },
      });
      return { user_id: userId, role: row.role, status: next };
    });
    res.json(out);
  });

  r.post('/admin/demo/reset', resetLimiter, async (req, res) => {
    const actor = await requireRole(db, res, 'admin');
    const { confirm } = z.object({ confirm: z.string() }).parse(req.body);
    if (confirm !== 'RESET') throw badRequest('confirmation_required', 'Send {"confirm":"RESET"} to reset the synthetic scenario.');
    const summary = await resetScenario(db, { userId: actor.userId, role: actor.role, requestId: res.locals.requestId as string });
    res.json(summary);
  });

  return r;
}
