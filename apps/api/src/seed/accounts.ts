import type { Queryable } from '../db/types.ts';
import { DEMO_ACCOUNTS, MENTOR_IDS, PROFILE_IDS, WORKER_PROFILES, type DemoAccountKey } from '../data/demo-v1.ts';

export interface AccountLink {
  userId: string;
  role: 'worker' | 'mentor' | 'recruiter' | 'admin';
  displayName: string;
  orgId: string | null;
  /** Worker profile this identity owns. */
  profileId?: string;
  /** Mentor catalogue entry this identity operates. */
  mentorId?: string;
}

export function demoAccountLinks(userIds: Record<DemoAccountKey, string>): AccountLink[] {
  return DEMO_ACCOUNTS.map((a) => ({
    userId: userIds[a.key],
    role: a.role,
    displayName: a.display_name,
    orgId: a.org_id,
    profileId: a.key === 'worker' ? PROFILE_IDS.harpreet : undefined,
    mentorId: a.key === 'mentor' ? MENTOR_IDS.meera : undefined,
  }));
}

/** Upserts synthetic worker profiles (identity links are set by linkAccounts). */
export async function upsertWorkerProfiles(q: Queryable): Promise<void> {
  for (const p of WORKER_PROFILES) {
    await q.query(
      `insert into public.profiles (id, display_name, headline, current_role_title, experience_summary, preferences, is_synthetic)
       values ($1, $2, $3, $4, $5, $6::jsonb, true)
       on conflict (id) do update set display_name = excluded.display_name, headline = excluded.headline,
         current_role_title = excluded.current_role_title, experience_summary = excluded.experience_summary,
         preferences = excluded.preferences, is_synthetic = true, updated_at = now()`,
      [p.id, p.display_name, p.headline, p.current_role_title, p.experience_summary, JSON.stringify(p.preferences)],
    );
  }
}

/**
 * Binds Supabase Auth identities to application roles. The role lives only in
 * public.app_users — never in user-editable auth metadata.
 */
export async function linkAccounts(q: Queryable, links: AccountLink[]): Promise<void> {
  for (const l of links) {
    await q.query(
      `insert into public.app_users (user_id, role, display_name, org_id, is_synthetic)
       values ($1, $2, $3, $4, true)
       on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name, org_id = excluded.org_id`,
      [l.userId, l.role, l.displayName, l.orgId],
    );
    if (l.profileId) {
      await q.query('update public.profiles set user_id = null where user_id = $1 and id <> $2', [l.userId, l.profileId]);
      await q.query('update public.profiles set user_id = $1 where id = $2', [l.userId, l.profileId]);
    }
    if (l.mentorId) {
      await q.query('update public.mentor_profiles set user_id = null where user_id = $1 and id <> $2', [l.userId, l.mentorId]);
      await q.query('update public.mentor_profiles set user_id = $1 where id = $2', [l.userId, l.mentorId]);
    }
  }
}
