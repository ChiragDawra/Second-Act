import type { Response } from 'express';
import type { Db } from '../db/types.ts';
import { recordAudit } from '../services/audit.ts';
import { actorOf, type Actor, type AppRole } from './context.ts';
import { forbidden } from './errors.ts';

/**
 * Records a denied request (no request body, no tokens) and returns the error
 * to throw. Failed authorization attempts are visible to the admin.
 */
export async function deny(db: Db, res: Response, reason: string, subjectProfileId?: string | null) {
  const actor = res.locals.actor as Actor | undefined;
  const route = `${res.req.method} ${res.req.baseUrl}${res.req.route?.path ?? ''}`;
  await db
    .asService((q) =>
      recordAudit(q, {
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        action: 'authz.denied',
        objectType: 'route',
        objectId: route,
        subjectProfileId: subjectProfileId && /^[0-9a-f-]{36}$/i.test(subjectProfileId) ? subjectProfileId : null,
        outcome: 'denied',
        requestId: res.locals.requestId as string,
        metadata: { reason },
      }),
    )
    .catch(() => undefined);
  return forbidden();
}

export async function requireRole(db: Db, res: Response, ...roles: AppRole[]): Promise<Actor> {
  const actor = actorOf(res);
  if (!roles.includes(actor.role)) {
    throw await deny(db, res, `role_${actor.role}_not_permitted`);
  }
  return actor;
}

/** Only the worker who owns the profile may act on it. A profile id alone grants nothing. */
export async function requireOwnProfile(db: Db, res: Response, profileId: string): Promise<Actor> {
  const actor = actorOf(res);
  if (actor.role !== 'worker' || !actor.profileId || actor.profileId !== profileId) {
    throw await deny(db, res, actor.role === 'worker' ? 'not_profile_owner' : `role_${actor.role}_not_permitted`, profileId);
  }
  return actor;
}
