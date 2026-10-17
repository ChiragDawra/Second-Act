import { Router } from 'express';
import { z } from 'zod';
import { EVIDENCE_FACTORS, EXTRACTION_VERSION, MENTOR_MATCH_VERSION, SCORING_VERSION } from '../engine/vocabulary.ts';
import type { Deps } from '../http/context.ts';
import { badRequest } from '../http/errors.ts';
import { requireRole } from '../http/guards.ts';
import { resetScenario } from '../seed/scenario.ts';
import { userLimiter } from './worker.ts';

const startedAt = Date.now();

/** What is live, synthetic, simulated or planned — shown verbatim in the admin console. */
export const INTEGRATIONS = [
  { name: 'Supabase Auth', status: 'live', detail: 'Real sign-in. Each demo account is a separate Supabase identity.' },
  { name: 'Supabase PostgreSQL + RLS', status: 'live', detail: 'Persistent state. Row-level security is enforced on every user-context query.' },
  { name: 'Adjacency Engine (fit-v1)', status: 'live', detail: 'Deterministic, versioned scoring computed by this API.' },
  { name: 'Skill extraction', status: 'live', detail: 'Deterministic phrase/alias matcher. No LLM is called.' },
  { name: 'Worker, mentor and employer records', status: 'synthetic', detail: 'Fictional demo data, labelled in every view.' },
  { name: 'Job openings', status: 'simulated', detail: 'No live vacancy feed. Every opening is simulated.' },
  { name: 'SAP SuccessFactors / Joule', status: 'planned', detail: 'Not connected. No SAP API is called; any SAP mention describes a planned adapter.' },
] as const;

/** Admin console: system health, versions, synthetic-data status, audit — never worker content. */
export function adminRoutes({ db }: Deps): Router {
  const r = Router();
  const resetLimiter = userLimiter(5);

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

  r.post('/admin/demo/reset', resetLimiter, async (req, res) => {
    const actor = await requireRole(db, res, 'admin');
    const { confirm } = z.object({ confirm: z.string() }).parse(req.body);
    if (confirm !== 'RESET') throw badRequest('confirmation_required', 'Send {"confirm":"RESET"} to reset the synthetic scenario.');
    const summary = await resetScenario(db, { userId: actor.userId, role: actor.role, requestId: res.locals.requestId as string });
    res.json(summary);
  });

  return r;
}
