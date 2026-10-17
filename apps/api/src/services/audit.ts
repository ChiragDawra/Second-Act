import type { Queryable } from '../db/types.ts';

export interface AuditEvent {
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  subjectProfileId?: string | null;
  outcome?: 'success' | 'denied' | 'error';
  requestId?: string | null;
  /** IDs, enums and counts only — never free text, answers, notes or tokens. */
  metadata?: Record<string, string | number | boolean | null | string[]>;
}

export async function recordAudit(q: Queryable, e: AuditEvent): Promise<void> {
  await q.query(
    `insert into public.audit_events
       (actor_user_id, actor_role, action, object_type, object_id, subject_profile_id, outcome, request_id, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      e.actorUserId,
      e.actorRole,
      e.action,
      e.objectType,
      e.objectId ?? null,
      e.subjectProfileId ?? null,
      e.outcome ?? 'success',
      e.requestId ?? null,
      JSON.stringify(e.metadata ?? {}),
    ],
  );
}
