import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.ts';
import { identityOf, type Account, type Actor, type Deps } from '../http/context.ts';
import { ApiError, badRequest, conflict, forbidden } from '../http/errors.ts';
import { toDbId } from '../ncr/catalogue.ts';
import { getNcrDataset, NCR_SECTORS } from '../ncr/dataset.ts';
import { recordAudit } from '../services/audit.ts';
import { recompute } from '../services/recommendations.ts';
import { userLimiter } from './worker.ts';

/**
 * Account lifecycle for self-service (Google) sign-in.
 *
 *   GET  /me          - who am I, and what state is my account in
 *   POST /onboarding  - one-time: choose job seeker, mentor or recruiter
 *
 * The role is chosen once, by the user, and stored server-side. Job seekers become active
 * immediately. Mentors and recruiters wait for an admin decision; until then every other
 * route refuses them (requireActiveAccount) and the database role helpers return nothing.
 * Admin can only be chosen by a verified email on the server's allowlist.
 */

const name = z.string().trim().min(2).max(80);
const sector = z.enum(NCR_SECTORS);

const Onboarding = z.discriminatedUnion('account_type', [
  z.object({
    account_type: z.literal('worker'),
    display_name: name,
    sector,
    headline: z.string().trim().max(120).optional(),
    city: z.string().trim().max(40).optional(),
  }),
  z.object({
    account_type: z.literal('mentor'),
    display_name: name,
    headline: z.string().trim().min(5).max(120),
    bio: z.string().trim().min(20).max(1000),
    sectors: z.array(sector).min(1).max(4),
    skill_ids: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).min(1).max(15),
    availability_hours_per_week: z.number().int().min(1).max(20),
    languages: z.array(z.string().trim().min(2).max(30)).min(1).max(5),
  }),
  z.object({
    account_type: z.literal('recruiter'),
    display_name: name,
    organization_name: z.string().trim().min(2).max(100),
  }),
  z.object({
    account_type: z.literal('admin'),
    display_name: name,
  }),
]);

const isAllowlistedAdmin = (deps: Deps, email: string | null, verified: boolean) =>
  verified && !!email && (deps.adminEmails ?? []).some((a) => a.trim().toLowerCase() === email.toLowerCase());

async function activeMe(db: Db, actor: Actor, email: string | null) {
  const extra = actor.profileId
    ? await db.asUser(actor.userId, (q) =>
        q.query<{ sector: string | null; catalogue: string }>('select sector, catalogue from public.profiles where id = $1', [actor.profileId]),
      )
    : null;
  const p = extra?.rows[0];
  return {
    status: 'active' as const,
    user_id: actor.userId,
    role: actor.role,
    display_name: actor.displayName,
    email,
    org: actor.orgId ? { id: actor.orgId, name: actor.orgName } : null,
    profile_id: actor.profileId,
    mentor_id: actor.mentorId,
    is_synthetic: actor.isSynthetic,
    sector: p?.sector ?? null,
    catalogue: p?.catalogue ?? null,
  };
}

export function accountRoutes(deps: Deps): Router {
  const { db } = deps;
  const r = Router();
  const onboardingLimiter = userLimiter(10);

  const meFor = async (res: Response) => {
    const identity = identityOf(res);
    const actor = res.locals.actor as Actor | undefined;
    if (actor) return activeMe(db, actor, identity.email);
    const account = res.locals.account as Account | null;
    if (account) {
      return { status: account.status, user_id: identity.userId, role: account.role, display_name: account.displayName, email: identity.email };
    }
    return {
      status: 'needs_onboarding' as const,
      user_id: identity.userId,
      email: identity.email,
      email_verified: identity.emailVerified,
      suggested_name: identity.name,
      admin_eligible: isAllowlistedAdmin(deps, identity.email, identity.emailVerified),
    };
  };

  r.get('/me', async (_req, res) => {
    res.json(await meFor(res));
  });

  r.get('/onboarding/options', (_req, res) => {
    const ds = getNcrDataset();
    res.json({
      sectors: NCR_SECTORS.map((id) => ({ id, label: ds.config.sectors[id].label, roles: ds.config.sectors[id].roles.map((rid) => ds.roles.find((x) => x.id === rid)?.title ?? rid) })),
      cities: ds.config.cities,
      skills: ds.skills.map((s) => ({ id: s.id, name: s.name, category: s.category })),
    });
  });

  r.post('/onboarding', onboardingLimiter, async (req, res) => {
    const identity = identityOf(res);
    if (res.locals.account) throw conflict('already_onboarded', 'This account is already set up.');
    if (!identity.email || !identity.emailVerified) {
      throw forbidden('Sign in with a verified email address (for example Google) before setting up an account.');
    }
    const body = Onboarding.parse(req.body);
    const ds = getNcrDataset();

    if (body.account_type === 'admin' && !isAllowlistedAdmin(deps, identity.email, identity.emailVerified)) {
      throw forbidden('Administrator accounts are assigned by the Second Act team, not chosen.');
    }
    if (body.account_type === 'worker' && body.city && !ds.config.cities.includes(body.city)) {
      throw badRequest('unknown_city', `City must be one of: ${ds.config.cities.join(', ')}.`);
    }
    if (body.account_type === 'mentor') {
      const known = new Set(ds.skills.map((s) => s.id));
      const bad = body.skill_ids.filter((id) => !known.has(id));
      if (bad.length > 0) throw badRequest('unknown_skill', `Unknown skill(s): ${bad.join(', ')}`);
    }

    const userId = identity.userId;
    const email = identity.email;
    const status = body.account_type === 'mentor' || body.account_type === 'recruiter' ? 'pending' : 'active';

    const created = await db.asService(async (q) => {
      const exists = await q.query('select 1 from public.app_users where user_id = $1', [userId]);
      if (exists.rows[0]) throw conflict('already_onboarded', 'This account is already set up.');

      let orgId: string | null = null;
      if (body.account_type === 'recruiter') {
        const org = await q.query<{ id: string; is_synthetic: boolean }>(
          'select id, is_synthetic from public.organizations where lower(name) = lower($1)',
          [body.organization_name],
        );
        if (org.rows[0]?.is_synthetic) {
          throw conflict('organization_reserved', 'That name belongs to a demo organisation. Use your real organisation name.');
        }
        orgId =
          org.rows[0]?.id ??
          (
            await q.query<{ id: string }>(
              `insert into public.organizations (name, kind, is_synthetic, status, created_by) values ($1, 'employer', false, 'pending', $2) returning id`,
              [body.organization_name, userId],
            )
          ).rows[0]!.id;
      }

      await q.query(
        `insert into public.app_users (user_id, role, display_name, org_id, is_synthetic, status, email, onboarded_at)
         values ($1, $2, $3, $4, false, $5, $6, now())`,
        [userId, body.account_type, body.display_name, orgId, status, email],
      );

      let profileId: string | null = null;
      if (body.account_type === 'worker') {
        const label = ds.config.sectors[body.sector].label;
        const p = await q.query<{ id: string }>(
          `insert into public.profiles (user_id, display_name, headline, preferences, is_synthetic, catalogue, sector)
           values ($1, $2, $3, $4::jsonb, false, 'ncr', $5) returning id`,
          [userId, body.display_name, body.headline || `Job seeker · ${label}`, JSON.stringify(body.city ? { locations: [body.city] } : {}), body.sector],
        );
        profileId = p.rows[0]!.id;
      }

      if (body.account_type === 'mentor') {
        const roleIds = body.sectors.flatMap((s) => ds.config.sectors[s].roles).map(toDbId);
        await q.query(
          `insert into public.mentor_profiles (user_id, display_name, headline, bio, skill_ids, role_experience, transition_experience,
             languages, session_formats, availability_hours_per_week, capacity_remaining, verification_status, is_synthetic, catalogue)
           values ($1, $2, $3, $4, $5, $6, false, $7, '{video,chat}', $8, 3, 'pending', false, 'ncr')`,
          [userId, body.display_name, body.headline, body.bio, body.skill_ids.map(toDbId), roleIds, body.languages, body.availability_hours_per_week],
        );
      }

      await recordAudit(q, {
        actorUserId: userId,
        actorRole: body.account_type,
        action: 'account.onboarded',
        objectType: 'app_user',
        objectId: userId,
        subjectProfileId: profileId,
        requestId: res.locals.requestId as string,
        metadata: { account_type: body.account_type, status, ...(body.account_type === 'worker' ? { sector: body.sector } : {}) },
      });
      return { profileId };
    });

    if (created.profileId) {
      await recompute(db, { actorUserId: null, actorRole: 'worker', profileId: created.profileId, trigger: 'onboarding', requestId: res.locals.requestId as string });
    }

    // Re-resolve the account the same way authenticate() does, so the response matches GET /me.
    res.locals.account = { role: body.account_type, status, displayName: body.display_name } satisfies Account;
    if (status === 'active') {
      const row = await db.asUser(userId, (q) =>
        q.query<{ org_id: string | null; org_name: string | null; profile_id: string | null; mentor_id: string | null }>(
          `select u.org_id, o.name as org_name, app_private.my_profile_id() as profile_id, app_private.my_mentor_id() as mentor_id
           from public.app_users u left join public.organizations o on o.id = u.org_id where u.user_id = auth.uid()`,
        ),
      );
      const x = row.rows[0];
      if (!x) throw new ApiError(500, 'internal_error', 'Account was not created.');
      res.locals.actor = {
        userId, role: body.account_type, displayName: body.display_name, orgId: x.org_id, orgName: x.org_name,
        profileId: x.profile_id, mentorId: x.mentor_id, isSynthetic: false,
      } satisfies Actor;
    }
    res.status(201).json(await meFor(res));
  });

  return r;
}
