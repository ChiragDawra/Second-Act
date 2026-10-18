import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthVerifier, VerifiedIdentity } from '../auth/verifier.ts';
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

export type AccountStatus = 'active' | 'pending' | 'rejected';

/** The caller's Second Act account as stored, whatever its status. Null before onboarding. */
export interface Account {
  role: AppRole;
  status: AccountStatus;
  displayName: string;
}

export interface Deps {
  db: Db;
  auth: AuthVerifier;
  /** Verified emails that may onboard as admin. Empty means nobody can self-onboard as admin. */
  adminEmails?: string[];
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
        role: AppRole; status: AccountStatus; display_name: string; org_id: string | null; org_name: string | null;
        profile_id: string | null; mentor_id: string | null; is_synthetic: boolean;
      }>(
        `select u.role, u.status, u.display_name, u.org_id, o.name as org_name, u.is_synthetic,
                app_private.my_profile_id() as profile_id, app_private.my_mentor_id() as mentor_id
         from public.app_users u
         left join public.organizations o on o.id = u.org_id
         where u.user_id = auth.uid()`,
      ),
    );
    const row = rows.rows[0];
    res.locals.identity = verified satisfies VerifiedIdentity;
    res.locals.account = row ? ({ role: row.role, status: row.status, displayName: row.display_name } satisfies Account) : null;
    // Only an active account acts with its role. Others may only read /me and onboard.
    if (!row || row.status !== 'active') return next();
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

/**
 * Blocks every route below it unless the caller has an active account.
 * Not onboarded: 403 onboarding_required. Waiting for approval: 403 account_pending.
 */
export function requireActiveAccount(): RequestHandler {
  return (_req, res, next) => {
    if (res.locals.actor) return next();
    const account = res.locals.account as Account | null | undefined;
    if (!account) return next(new ApiError(403, 'onboarding_required', 'Finish setting up your account first.'));
    if (account.status === 'pending') {
      return next(new ApiError(403, 'account_pending', 'Your account is waiting for an administrator to approve it.'));
    }
    return next(new ApiError(403, 'account_rejected', 'This account was not approved. Contact the Second Act team.'));
  };
}

export function identityOf(res: Response): VerifiedIdentity {
  const identity = res.locals.identity as VerifiedIdentity | undefined;
  if (!identity) throw new ApiError(401, 'unauthenticated', 'Sign in to continue.');
  return identity;
}

export function actorOf(res: Response): Actor {
  const actor = res.locals.actor as Actor | undefined;
  if (!actor) throw new ApiError(401, 'unauthenticated', 'Sign in to continue.');
  return actor;
}
