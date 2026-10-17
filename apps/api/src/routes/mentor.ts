import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Actor, Deps } from '../http/context.ts';
import { conflict } from '../http/errors.ts';
import { deny, requireRole } from '../http/guards.ts';
import { recordAudit } from '../services/audit.ts';
import { userLimiter } from './worker.ts';

const uuid = z.uuid();

/** Mentor workspace. Worker data is only reachable through public.mentor_request_view. */
export function mentorRoutes({ db }: Deps): Router {
  const r = Router();
  const writeLimiter = userLimiter(60);

  /** Backend check first; the database function re-checks independently. */
  async function ownedRequest(res: Response, actor: Actor, id: string) {
    const rows = await db.asUser(actor.userId, (q) =>
      q.query<{ id: string; mentor_id: string; profile_id: string; status: string }>(
        'select id, mentor_id, profile_id, status from public.mentor_requests where id = $1',
        [id],
      ),
    );
    const request = rows.rows[0];
    if (!request || !actor.mentorId || request.mentor_id !== actor.mentorId) {
      throw await deny(db, res, 'not_request_mentor', request?.profile_id);
    }
    return request;
  }

  r.get('/mentor/requests', async (_req, res) => {
    const actor = await requireRole(db, res, 'mentor');
    const rows = await db.asUser(actor.userId, (q) => q.query<{ list: unknown[] }>('select public.mentor_request_list() as list'));
    res.json({ requests: rows.rows[0]!.list });
  });

  r.get('/mentor/requests/:id', async (req, res) => {
    const id = uuid.parse(req.params.id);
    const actor = await requireRole(db, res, 'mentor');
    await ownedRequest(res, actor, id);
    const data = await db.asUser(actor.userId, async (q) => {
      const view = await q.query<{ v: unknown }>('select public.mentor_request_view($1) as v', [id]);
      const notes = await q.query(
        'select id, kind, body, action_items, created_at from public.mentor_notes where request_id = $1 order by created_at desc',
        [id],
      );
      return { view: view.rows[0]!.v, notes: notes.rows };
    });
    res.json({ ...(data.view as object), notes: data.notes });
  });

  r.post('/mentor/requests/:id/respond', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { decision } = z.object({ decision: z.enum(['accept', 'decline']) }).parse(req.body);
    const actor = await requireRole(db, res, 'mentor');
    const request = await ownedRequest(res, actor, id);
    if (request.status !== 'requested') throw conflict('already_responded', `This request is already ${request.status}.`);
    const status = decision === 'accept' ? 'accepted' : 'declined';
    await db.asService(async (q) => {
      await q.query('update public.mentor_requests set status = $2, responded_at = now() where id = $1', [id, status]);
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: `mentorship.${status}`, objectType: 'mentor_request', objectId: id,
        subjectProfileId: request.profile_id, requestId: res.locals.requestId as string,
      });
    });
    res.json({ id, status });
  });

  const Note = z.object({
    kind: z.enum(['progress', 'feedback']),
    body: z.string().trim().min(1).max(1000),
    action_items: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
  });

  r.post('/mentor/requests/:id/notes', writeLimiter, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const note = Note.parse(req.body);
    const actor = await requireRole(db, res, 'mentor');
    const request = await ownedRequest(res, actor, id);
    if (request.status !== 'accepted') throw conflict('request_not_active', 'Notes can only be added to an accepted mentorship.');
    const created = await db.asService(async (q) => {
      const row = await q.query<{ id: string; created_at: Date | string }>(
        `insert into public.mentor_notes (request_id, author_user_id, kind, body, action_items)
         values ($1, $2, $3, $4, $5) returning id, created_at`,
        [id, actor.userId, note.kind, note.body, note.action_items],
      );
      // The note text itself is never copied into the audit trail.
      await recordAudit(q, {
        actorUserId: actor.userId, actorRole: actor.role, action: 'mentor_note.created', objectType: 'mentor_note', objectId: row.rows[0]!.id,
        subjectProfileId: request.profile_id, requestId: res.locals.requestId as string,
        metadata: { kind: note.kind, visible_to_worker: note.kind === 'feedback', action_items: note.action_items.length },
      });
      return row.rows[0]!;
    });
    res.status(201).json({ note: { id: created.id, ...note, created_at: new Date(created.created_at).toISOString(), visible_to_worker: note.kind === 'feedback' } });
  });

  return r;
}
