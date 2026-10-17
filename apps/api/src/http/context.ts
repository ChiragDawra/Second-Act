import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthVerifier } from '../auth/verifier.ts';
import type { Db } from '../db/types.ts';
import { ApiError } from './errors.ts';

export type AppRole = 'worker' | 'mentor' | 'recruiter' | 'admin';

export interface Actor {
  userId: string;
  role: AppRole;
  displayName: string;
  orgId: string | null;
  orgName: string | null;
  profileId: string | null;
  mentorId: string | null;
  isSynthetic: boolean;
}

export interface Deps {
  db: Db;
  auth: AuthVerifier;
}

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.header('x-request-id');
    const id = incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    res.locals.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  };
}

export function accessLog(): RequestHandler {
  return (req, res, next) => {
    const started = performance.now();
    res.on('finish', () => {
      // Method, path, status, timing and request id only.
      console.log(`${res.locals.requestId} ${req.method} ${req.path} ${res.statusCode} ${Math.round(performance.now() - started)}ms`);
    });
    next();
  };
}

/**
 * Authenticates the bearer token with Supabase Auth, then resolves the
 * application role from public.app_users in the caller's own RLS context.
 * The role is never taken from the client or from editable JWT metadata.
 */
export function authenticate({ db, auth }: Deps): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      return next(new ApiError(401, 'unauthenticated', 'Sign in to continue.'));
    }
    const verified = await auth.verify(token).catch(() => null);
    if (!verified) {
      return next(new ApiError(401, 'invalid_session', 'Your session is invalid or has expired. Sign in again.'));
    }

    const rows = await db.asUser(verified.userId, (q) =>
      q.query<{
        role: AppRole; display_name: string; org_id: string | null; org_name: string | null;
        profile_id: string | null; mentor_id: string | null; is_synthetic: boolean;
      }>(
        `select u.role, u.display_name, u.org_id, o.name as org_name, u.is_synthetic,
                app_private.my_profile_id() as profile_id, app_private.my_mentor_id() as mentor_id
         from public.app_users u
         left join public.organizations o on o.id = u.org_id
         where u.user_id = auth.uid()`,
      ),
    );
    const row = rows.rows[0];
    if (!row) {
      return next(new ApiError(403, 'account_not_provisioned', 'This account has no Second Act role. Ask the facilitator to run the demo seed.'));
    }
    res.locals.actor = {
      userId: verified.userId,
      role: row.role,
      displayName: row.display_name,
      orgId: row.org_id,
      orgName: row.org_name,
      profileId: row.profile_id,
      mentorId: row.mentor_id,
      isSynthetic: row.is_synthetic,
    } satisfies Actor;
    next();
  };
}

export function actorOf(res: Response): Actor {
  const actor = res.locals.actor as Actor | undefined;
  if (!actor) throw new ApiError(401, 'unauthenticated', 'Sign in to continue.');
  return actor;
}
