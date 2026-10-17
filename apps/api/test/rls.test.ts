/**
 * Database defence in depth: these tests talk to PostgreSQL as each role
 * would through the Supabase Data API (role "authenticated" + JWT claims),
 * bypassing the Express API entirely.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MENTOR_IDS, ORG_IDS, PROFILE_IDS } from '../src/data/demo-v1.ts';
import type { Queryable } from '../src/db/types.ts';
import { createTestDatabase, USERS, type TestDatabase } from './support/test-db.ts';

let t: TestDatabase;
const HARPREET = PROFILE_IDS.harpreet;
const PRIYA = PROFILE_IDS.priya;

const as = <T>(user: keyof typeof USERS, fn: (q: Queryable) => Promise<T>) => t.db.asUser(USERS[user], fn);
const count = async (user: keyof typeof USERS, sql: string, params: unknown[] = []) =>
  as(user, async (q) => Number((await q.query<{ n: number }>(`select count(*)::int as n from (${sql}) s`, params)).rows[0]!.n));

async function createMentorRequest(fields: string[], status = 'requested', mentorId: string = MENTOR_IDS.meera) {
  return t.db.asService(async (q) => {
    const consent = await q.query<{ id: string }>(
      `insert into public.consent_events (profile_id, purpose, recipient_type, recipient_id, fields, consent_version, statement, granted)
       values ($1, 'mentor_request', 'mentor', $2, $3, 'share-consent-v1', 'test', true) returning id`,
      [HARPREET, mentorId, fields],
    );
    const req = await q.query<{ id: string }>(
      `insert into public.mentor_requests (profile_id, mentor_id, target_role_id, shared_fields, consent_event_id, status)
       values ($1, $2, 'qa-automation-engineer-bfsi', $3, $4, $5) returning id`,
      [HARPREET, mentorId, fields, consent.rows[0]!.id, status],
    );
    return req.rows[0]!.id;
  });
}

async function createGrant(fields: string[], orgId: string = ORG_IDS.northwind) {
  return t.db.asService(async (q) => {
    const consent = await q.query<{ id: string }>(
      `insert into public.consent_events (profile_id, purpose, recipient_type, recipient_id, fields, consent_version, statement, granted)
       values ($1, 'recruiter_share', 'recruiter_org', $2, $3, 'share-consent-v1', 'test', true) returning id`,
      [HARPREET, orgId, fields],
    );
    const g = await q.query<{ id: string }>(
      `insert into public.share_grants (profile_id, org_id, target_role_id, fields, consent_event_id)
       values ($1, $2, 'qa-automation-engineer-bfsi', $3, $4) returning id`,
      [HARPREET, orgId, fields, consent.rows[0]!.id],
    );
    return g.rows[0]!.id;
  });
}

beforeAll(async () => {
  t = await createTestDatabase();
});
afterAll(async () => {
  await t.db.close();
});
beforeEach(async () => {
  await t.reset();
});

describe('anonymous (anon key without a session)', () => {
  it('cannot read any application table', async () => {
    for (const table of ['profiles', 'worker_skills', 'roles', 'skills', 'audit_events', 'mentor_profiles']) {
      await expect(
        t.pg.transaction(async (tx) => {
          await tx.query('set local role anon');
          await tx.query(`select * from public.${table} limit 1`);
        }),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe('worker (Harpreet)', () => {
  it('reads own profile, skills, recommendations and the shared catalogue', async () => {
    expect(await count('worker', 'select * from public.profiles')).toBe(1);
    expect(await count('worker', 'select * from public.worker_skills where profile_id = $1', [HARPREET])).toBeGreaterThan(10);
    expect(await count('worker', 'select * from public.recommendation_runs')).toBe(1);
    expect(await count('worker', 'select * from public.roles')).toBe(11);
    expect(await count('worker', 'select * from public.app_users')).toBe(1);
  });

  it('cannot read another worker’s profile or skills', async () => {
    expect(await count('worker', 'select * from public.profiles where id = $1', [PRIYA])).toBe(0);
    expect(await count('worker', 'select * from public.worker_skills where profile_id = $1', [PRIYA])).toBe(0);
    expect(await count('otherWorker', 'select * from public.worker_skills where profile_id = $1', [HARPREET])).toBe(0);
  });

  it('cannot write any table directly, including promoting a skill to verified', async () => {
    await expect(
      as('worker', (q) => q.query("update public.worker_skills set status = 'self_reported' where profile_id = $1", [HARPREET])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as('worker', (q) =>
        q.query(
          `insert into public.mentor_requests (profile_id, mentor_id, target_role_id, shared_fields, consent_event_id)
           values ($1, $2, 'uat-lead-fintech', array['display_name'], gen_random_uuid())`,
          [HARPREET, MENTOR_IDS.meera],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as('worker', (q) => q.query("insert into public.audit_events (action, object_type) values ('forged', 'x')")),
    ).rejects.toThrow(/permission denied/);
  });

  it('cannot read assessment answer keys, mentor identities or internal helpers', async () => {
    await expect(as('worker', (q) => q.query('select * from public.assessment_keys'))).rejects.toThrow(/permission denied/);
    await expect(as('worker', (q) => q.query('select user_id from public.mentor_profiles'))).rejects.toThrow(/permission denied/);
    await expect(
      as('worker', (q) => q.query("select app_private.build_shared_projection($1, array['experience_summary'], null)", [PRIYA])),
    ).rejects.toThrow(/permission denied/);
  });

  it('cannot call mentor, recruiter or admin projections', async () => {
    await expect(as('worker', (q) => q.query('select public.mentor_request_list()'))).rejects.toThrow(/mentor account required/);
    await expect(as('worker', (q) => q.query('select public.recruiter_candidate_list()'))).rejects.toThrow(/recruiter account required/);
    await expect(as('worker', (q) => q.query('select public.admin_synthetic_status()'))).rejects.toThrow(/admin account required/);
    expect(await count('worker', 'select * from public.demo_state')).toBe(0);
  });

  it('cannot see a mentor’s private progress notes, only shared feedback', async () => {
    const requestId = await createMentorRequest(['display_name'], 'accepted');
    await t.db.asService((q) =>
      q.query(
        `insert into public.mentor_notes (request_id, author_user_id, kind, body) values
           ($1, $2, 'progress', 'private working note'), ($1, $2, 'feedback', 'shared feedback')`,
        [requestId, USERS.mentor],
      ),
    );
    const notes = await as('worker', (q) => q.query<{ kind: string }>('select kind from public.mentor_notes'));
    expect(notes.rows.map((n) => n.kind)).toEqual(['feedback']);
    const mentorNotes = await as('mentor', (q) => q.query<{ kind: string }>('select kind from public.mentor_notes order by kind'));
    expect(mentorNotes.rows.map((n) => n.kind)).toEqual(['feedback', 'progress']);
  });
});

describe('mentor (Meera)', () => {
  it('sees only consented fields of a request addressed to her', async () => {
    const id = await createMentorRequest(['display_name', 'career_goal', 'gap_areas']);
    const list = await as('mentor', (q) => q.query<{ l: Array<{ id: string; worker_display_name: string }> }>('select public.mentor_request_list() as l'));
    expect(list.rows[0]!.l).toHaveLength(1);
    expect(list.rows[0]!.l[0]!.worker_display_name).toBe('Harpreet Singh');

    const view = await as('mentor', (q) => q.query<{ v: { shared: Record<string, unknown>; request: { withheld_fields: string[] } } }>('select public.mentor_request_view($1) as v', [id]));
    const shared = view.rows[0]!.v.shared;
    expect(Object.keys(shared).sort()).toEqual(['career_goal', 'display_name', 'gap_areas', 'is_synthetic']);
    expect(shared).not.toHaveProperty('experience_summary');
    expect(shared).not.toHaveProperty('skills_summary');
    expect(view.rows[0]!.v.request.withheld_fields).toContain('experience_summary');
  });

  it('hides the display name in the list when it was not shared', async () => {
    await createMentorRequest(['gap_areas']);
    const list = await as('mentor', (q) => q.query<{ l: Array<{ worker_display_name: string | null }> }>('select public.mentor_request_list() as l'));
    expect(list.rows[0]!.l[0]!.worker_display_name).toBeNull();
  });

  it('cannot read worker tables directly', async () => {
    await createMentorRequest(['display_name', 'skills_summary']);
    expect(await count('mentor', 'select * from public.profiles')).toBe(0);
    expect(await count('mentor', 'select * from public.worker_skills')).toBe(0);
    expect(await count('mentor', 'select * from public.assessment_results')).toBe(0);
  });

  it('cannot open a request addressed to another mentor', async () => {
    const id = await createMentorRequest(['display_name']);
    await expect(as('otherMentor', (q) => q.query('select public.mentor_request_view($1)', [id]))).rejects.toThrow(/not authorized/);
    const list = await as('otherMentor', (q) => q.query<{ l: unknown[] }>('select public.mentor_request_list() as l'));
    expect(list.rows[0]!.l).toEqual([]);
  });

  it('loses access to worker data once a request is revoked or declined', async () => {
    const revoked = await createMentorRequest(['display_name', 'experience_summary'], 'revoked');
    const view = await as('mentor', (q) => q.query<{ v: { shared: unknown } }>('select public.mentor_request_view($1) as v', [revoked]));
    expect(view.rows[0]!.v.shared).toBeNull();
  });

  it('cannot call recruiter or admin projections', async () => {
    await expect(as('mentor', (q) => q.query('select public.recruiter_candidate_list()'))).rejects.toThrow(/recruiter account required/);
    await expect(as('mentor', (q) => q.query('select public.admin_synthetic_status()'))).rejects.toThrow(/admin account required/);
  });
});

describe('recruiter (Northwind)', () => {
  it('sees nobody until a worker shares with the organisation', async () => {
    const list = await as('recruiter', (q) => q.query<{ l: unknown[] }>('select public.recruiter_candidate_list() as l'));
    expect(list.rows[0]!.l).toEqual([]);
  });

  it('sees only granted fields and fit for its own simulated openings', async () => {
    const grantId = await createGrant(['display_name', 'skills_summary', 'role_suitability']);
    const view = await as('recruiter', (q) =>
      q.query<{ v: { shared: Record<string, unknown>; opportunity_fit: Array<{ opportunity_id: string; is_simulated: boolean }> } }>(
        'select public.recruiter_candidate_view($1) as v',
        [grantId],
      ),
    );
    const v = view.rows[0]!.v;
    expect(Object.keys(v.shared).sort()).toEqual(['display_name', 'is_synthetic', 'role_suitability', 'skills_summary']);
    expect(v.shared).not.toHaveProperty('experience_summary');
    expect(v.shared).not.toHaveProperty('career_preferences');
    expect(v.opportunity_fit.map((o) => o.opportunity_id).every((id) => id.startsWith('nw-'))).toBe(true);
    expect(v.opportunity_fit.every((o) => o.is_simulated)).toBe(true);
  });

  it('never receives the salary floor, even when preferences are shared', async () => {
    const grantId = await createGrant(['career_preferences']);
    const view = await as('recruiter', (q) => q.query<{ v: { shared: { career_preferences: Record<string, unknown> } } }>('select public.recruiter_candidate_view($1) as v', [grantId]));
    expect(view.rows[0]!.v.shared.career_preferences).not.toHaveProperty('salary_floor_lpa');
  });

  it('cannot see grants made to another organisation or revoked grants', async () => {
    const grantId = await createGrant(['display_name']);
    await expect(as('otherRecruiter', (q) => q.query('select public.recruiter_candidate_view($1)', [grantId]))).rejects.toThrow(/not authorized/);
    await t.db.asService((q) => q.query('update public.share_grants set revoked_at = now() where id = $1', [grantId]));
    await expect(as('recruiter', (q) => q.query('select public.recruiter_candidate_view($1)', [grantId]))).rejects.toThrow(/not authorized/);
    expect(await count('recruiter', 'select * from public.share_grants')).toBe(0);
  });

  it('cannot read worker tables or mentor projections directly', async () => {
    await createGrant(['display_name', 'skills_summary']);
    expect(await count('recruiter', 'select * from public.profiles')).toBe(0);
    expect(await count('recruiter', 'select * from public.worker_skills')).toBe(0);
    await expect(as('recruiter', (q) => q.query('select public.mentor_request_list()'))).rejects.toThrow(/mentor account required/);
  });

  it('records each view of shared data in the audit trail', async () => {
    const grantId = await createGrant(['display_name']);
    await as('recruiter', (q) => q.query('select public.recruiter_candidate_view($1)', [grantId]));
    const events = await t.db.asService((q) =>
      q.query<{ actor_role: string }>("select actor_role from public.audit_events where action = 'share.viewed' and object_id = $1", [grantId]),
    );
    expect(events.rows).toEqual([{ actor_role: 'recruiter' }]);
  });
});

describe('admin', () => {
  it('reads audit events, demo state, dataset versions and aggregate counts', async () => {
    expect(await count('admin', 'select * from public.audit_events')).toBeGreaterThan(0);
    expect(await count('admin', 'select * from public.demo_state')).toBe(1);
    expect(await count('admin', 'select * from public.dataset_versions')).toBeGreaterThan(5);
    const status = await as('admin', (q) => q.query<{ s: { synthetic_worker_profiles: number } }>('select public.admin_synthetic_status() as s'));
    expect(status.rows[0]!.s.synthetic_worker_profiles).toBe(2);
  });

  it('cannot read worker profiles, work history, skills or shared projections', async () => {
    const requestId = await createMentorRequest(['display_name', 'experience_summary']);
    const grantId = await createGrant(['display_name', 'experience_summary']);
    expect(await count('admin', 'select * from public.profiles')).toBe(0);
    expect(await count('admin', 'select * from public.worker_skills')).toBe(0);
    expect(await count('admin', 'select * from public.recommendation_runs')).toBe(0);
    await expect(as('admin', (q) => q.query('select public.mentor_request_view($1)', [requestId]))).rejects.toThrow(/not authorized/);
    await expect(as('admin', (q) => q.query('select public.recruiter_candidate_view($1)', [grantId]))).rejects.toThrow(/not authorized/);
    await expect(as('admin', (q) => q.query('select * from public.assessment_keys'))).rejects.toThrow(/permission denied/);
  });

  it('cannot alter the audit trail', async () => {
    await expect(as('admin', (q) => q.query('delete from public.audit_events'))).rejects.toThrow(/permission denied/);
  });
});

describe('database invariants (apply even to the service role)', () => {
  it('rejects "verified" without a passed assessment of that skill', async () => {
    await expect(
      t.db.asService((q) =>
        q.query("update public.worker_skills set status = 'verified' where profile_id = $1 and skill_id = 'test-case-design'", [HARPREET]),
      ),
    ).rejects.toThrow(/verified/);
  });

  it('keeps unknown distinct from a zero level', async () => {
    await expect(
      t.db.asService((q) =>
        q.query("update public.worker_skills set status = 'unknown', proficiency = 0 where profile_id = $1 and skill_id = 'test-case-design'", [HARPREET]),
      ),
    ).rejects.toThrow(/unknown_has_no_level/);
  });

  it('keeps the audit trail append-only and assessment results immutable', async () => {
    await expect(t.db.asService((q) => q.query("update public.audit_events set action = 'x'"))).rejects.toThrow(/append-only/);
    await expect(t.db.asService((q) => q.query('delete from public.audit_events'))).rejects.toThrow(/append-only/);
  });

  it('rejects sharing fields outside the consent vocabulary', async () => {
    await expect(createMentorRequest(['display_name', 'salary_floor'])).rejects.toThrow(/consent_fields_valid|shared_fields_valid/);
  });

  it('refuses to present a simulated opening as an open live vacancy', async () => {
    await expect(
      t.db.asService((q) => q.query("update public.opportunities set status = 'open' where id = 'nw-uat-lead-chandigarh'")),
    ).rejects.toThrow(/simulated_status/);
    await expect(
      t.db.asService((q) => q.query("update public.opportunities set is_simulated = false where id = 'nw-uat-lead-chandigarh'")),
    ).rejects.toThrow(/simulated_is_labelled|live_requires_provenance/);
  });
});
