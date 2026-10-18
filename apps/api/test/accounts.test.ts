/**
 * Self-service accounts (Google sign-in): onboarding by account type and sector, admin approval
 * for mentors and recruiters, the Delhi-NCR catalogue for new job seekers, and what an account
 * may do in each state. Runs against the real migrations in an in-process PostgreSQL.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONSENT_VERSION } from '../src/engine/vocabulary.ts';
import { createTestApi, type TestApi } from './support/test-app.ts';
import { USERS } from './support/test-db.ts';

let api: TestApi;
beforeAll(async () => {
  api = await createTestApi();
});
afterAll(async () => {
  await api.t.db.close();
});

const consent = { approved: true, statement_version: CONSENT_VERSION };
const seekerBody = { account_type: 'worker', display_name: 'Asha Verma', sector: 'banking-ba', city: 'Gurugram' };
const mentorBody = {
  account_type: 'mentor',
  display_name: 'Kabir Rao',
  headline: 'Business analyst, 12 years in BFSI',
  bio: 'I moved from branch operations to business analysis and now coach others making the same move.',
  sectors: ['banking-ba'],
  skill_ids: ['requirements-analysis', 'requirements-documentation', 'process-modeling', 'stakeholder-management'],
  availability_hours_per_week: 3,
  languages: ['English', 'Hindi'],
};
const recruiterBody = { account_type: 'recruiter', display_name: 'Neha Kapoor', organization_name: 'Aravali Fintech' };

describe('before onboarding', () => {
  it('tells a new Google user to onboard, suggests their name and offers the options', async () => {
    const me = await api.as('newSeeker').get('/api/v1/me');
    expect(me.body).toMatchObject({ status: 'needs_onboarding', email: 'newseeker@test.local', suggested_name: 'Test newSeeker', admin_eligible: false });
    const options = await api.as('newSeeker').get('/api/v1/onboarding/options');
    expect(options.status).toBe(200);
    expect(options.body.sectors.map((s: { id: string }) => s.id)).toEqual(['qa', 'banking-ba', 'support', 'data']);
    expect(options.body.cities).toContain('Noida');
  });

  it('refuses onboarding without a verified email', async () => {
    const res = await api.as('unverified').post('/api/v1/onboarding', seekerBody);
    expect(res.status).toBe(403);
  });

  it('never lets a user choose admin unless their verified email is allowlisted', async () => {
    const res = await api.as('newSeeker').post('/api/v1/onboarding', { account_type: 'admin', display_name: 'Me' });
    expect(res.status).toBe(403);
    expect((await api.as('newAdmin').get('/api/v1/me')).body.admin_eligible).toBe(true);
  });

  it('validates the chosen sector and city', async () => {
    expect((await api.as('newSeeker').post('/api/v1/onboarding', { ...seekerBody, sector: 'astronomy' })).status).toBe(400);
    expect((await api.as('newSeeker').post('/api/v1/onboarding', { ...seekerBody, city: 'Mumbai' })).status).toBe(400);
  });
});

describe('job seeker', () => {
  let profileId: string;

  it('is active at once, on the Delhi-NCR catalogue, with the chosen sector', async () => {
    const res = await api.as('newSeeker').post('/api/v1/onboarding', seekerBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'active', role: 'worker', sector: 'banking-ba', catalogue: 'ncr', is_synthetic: false });
    profileId = res.body.profile_id;
    expect(profileId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('cannot onboard twice', async () => {
    const res = await api.as('newSeeker').post('/api/v1/onboarding', seekerBody);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('already_onboarded');
  });

  it('saves reviewed resume skills as self-reported and gets Delhi-NCR roles', async () => {
    const res = await api.as('newSeeker').post(`/api/v1/profiles/${profileId}/skills/import`, {
      skills: [
        { skill_id: 'banking-payments-domain', level: 3, mention_type: 'explicit_current', evidence: 'Retail banking operations, NEFT / RTGS' },
        { skill_id: 'reconciliation', level: 3, mention_type: 'explicit_current', evidence: 'Reconcile daily NEFT and RTGS settlement files' },
        { skill_id: 'regulatory-compliance', level: 3, mention_type: 'explicit_current' },
        { skill_id: 'excel-spreadsheets', level: 3, mention_type: 'explicit_current' },
        { skill_id: 'process-documentation', level: 3, mention_type: 'explicit_current' },
        { skill_id: 'operational-reporting', level: 3, mention_type: 'explicit_current' },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.imported).toContain('ncr-reconciliation');
    expect(JSON.stringify(res.body.recommendations)).toContain('ncr-banking-operations-associate');

    const skills = await api.as('newSeeker').get(`/api/v1/profiles/${profileId}/skills`);
    const rec = skills.body.skills.find((s: { skill_id: string }) => s.skill_id === 'ncr-reconciliation');
    expect(rec).toMatchObject({ status: 'self_reported', proficiency: 3, evidence_snippet: 'Reconcile daily NEFT and RTGS settlement files' });
  });

  it('refuses to save a future goal as a current skill', async () => {
    const res = await api.as('newSeeker').post(`/api/v1/profiles/${profileId}/skills/import`, {
      skills: [{ skill_id: 'python-programming', level: 2, mention_type: 'future_goal' }],
    });
    expect(res.status).toBe(422);
  });

  it('cannot add a skill from the other catalogue', async () => {
    const res = await api.as('newSeeker').patch(`/api/v1/profiles/${profileId}/skills`, {
      updates: [{ skill_id: 'uat-coordination', action: 'edit', proficiency: 3 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unknown_skill');
  });

  it('updates preferences and recomputes', async () => {
    const res = await api.as('newSeeker').patch(`/api/v1/profiles/${profileId}/preferences`, { locations: ['Gurugram', 'Noida'], weekly_learning_hours: 6 });
    expect(res.status).toBe(200);
    const profile = await api.as('newSeeker').get(`/api/v1/profiles/${profileId}`);
    expect(profile.body.profile.preferences).toMatchObject({ locations: ['Gurugram', 'Noida'], weekly_learning_hours: 6 });
    expect(profile.body.profile).toMatchObject({ catalogue: 'ncr', sector: 'banking-ba' });
  });

  it('cannot read anyone else, and the demo worker cannot read them', async () => {
    // Another id: change the last character, never to the one it already is.
    const otherId = profileId.slice(0, -1) + (profileId.endsWith('0') ? '1' : '0');
    expect((await api.as('newSeeker').get('/api/v1/profiles/' + otherId)).status).toBe(403);
    expect((await api.as('worker').get(`/api/v1/profiles/${profileId}`)).status).toBe(403);
  });
});

describe('mentor and recruiter wait for approval', () => {
  it('a new mentor is pending and can do nothing but read /me', async () => {
    const res = await api.as('newMentor').post('/api/v1/onboarding', mentorBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'pending', role: 'mentor' });
    const blocked = await api.as('newMentor').get('/api/v1/mentor/requests');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('account_pending');
  });

  it('a pending mentor is not offered to job seekers', async () => {
    const me = (await api.as('newSeeker').get('/api/v1/me')).body;
    const res = await api.as('newSeeker').get(`/api/v1/mentors/matches?profile_id=${me.profile_id}&role_id=ncr-junior-business-analyst`);
    expect(res.status).toBe(200);
    expect(res.body.matches.map((m: { mentor: { display_name: string } }) => m.mentor.display_name)).not.toContain('Kabir Rao');
  });

  it('a pending database role carries no row-level access', async () => {
    const rows = await api.t.db.asUser(USERS.newMentor, (q) =>
      q.query<{ role: string | null; mentor: string | null }>('select app_private.current_app_role() as role, app_private.my_mentor_id() as mentor'),
    );
    expect(rows.rows[0]).toEqual({ role: null, mentor: null });
  });

  it('a new recruiter is pending and their organisation is not a share target yet', async () => {
    const res = await api.as('newRecruiter').post('/api/v1/onboarding', recruiterBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'pending', role: 'recruiter' });
    const orgs = await api.as('newSeeker').get('/api/v1/organizations');
    expect(orgs.body.organizations.map((o: { name: string }) => o.name)).not.toContain('Aravali Fintech');
  });

  it('a recruiter cannot claim a demo organisation', async () => {
    const res = await api.as('newSeeker2').post('/api/v1/onboarding', { ...recruiterBody, organization_name: 'Northwind Fintech (synthetic employer)' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('organization_reserved');
  });
});

describe('admin approval', () => {
  it('an allowlisted admin onboards as admin and sees the queue (no worker data)', async () => {
    const res = await api.as('newAdmin').post('/api/v1/onboarding', { account_type: 'admin', display_name: 'Ops Admin' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'active', role: 'admin' });
    const queue = await api.as('newAdmin').get('/api/v1/admin/accounts');
    expect(queue.status).toBe(200);
    const names = queue.body.accounts.map((a: { display_name: string }) => a.display_name);
    expect(names).toEqual(expect.arrayContaining(['Kabir Rao', 'Neha Kapoor']));
    expect(names).not.toContain('Asha Verma');
    const mentor = queue.body.accounts.find((a: { display_name: string }) => a.display_name === 'Kabir Rao');
    expect(mentor.mentor.skills).toContain('Requirements analysis');
    expect((await api.as('admin').get('/api/v1/admin/overview')).body.pending_accounts).toBe(2);
  });

  it('only admins can decide', async () => {
    const res = await api.as('newSeeker').post(`/api/v1/admin/accounts/${USERS.newMentor}/decision`, { decision: 'approve' });
    expect(res.status).toBe(403);
  });

  it('approving a mentor makes them active and offered to job seekers in their sector', async () => {
    const res = await api.as('newAdmin').post(`/api/v1/admin/accounts/${USERS.newMentor}/decision`, { decision: 'approve' });
    expect(res.status).toBe(200);
    expect((await api.as('newMentor').get('/api/v1/mentor/requests')).status).toBe(200);
    expect((await api.as('newMentor').get('/api/v1/me')).body).toMatchObject({ status: 'active', role: 'mentor' });

    const me = (await api.as('newSeeker').get('/api/v1/me')).body;
    const matches = await api.as('newSeeker').get(`/api/v1/mentors/matches?profile_id=${me.profile_id}&role_id=ncr-junior-business-analyst`);
    const kabir = matches.body.matches.find((m: { mentor: { display_name: string } }) => m.mentor.display_name === 'Kabir Rao');
    expect(kabir).toBeDefined();

    const req = await api.as('newSeeker').post('/api/v1/mentorships', {
      profile_id: me.profile_id,
      mentor_id: kabir.mentor.id,
      target_role_id: 'ncr-junior-business-analyst',
      shared_fields: ['display_name', 'career_goal', 'skills_summary'],
      consent,
    });
    expect(req.status).toBe(201);
    expect(JSON.stringify(req.body)).not.toContain('synthetic demo mentor');
    const inbox = await api.as('newMentor').get('/api/v1/mentor/requests');
    expect(JSON.stringify(inbox.body)).toContain('Asha Verma');
  });

  it('a decision cannot be repeated', async () => {
    const res = await api.as('newAdmin').post(`/api/v1/admin/accounts/${USERS.newMentor}/decision`, { decision: 'reject' });
    expect(res.status).toBe(409);
  });

  it('approving a recruiter activates their organisation; shared candidates and posted openings follow', async () => {
    expect((await api.as('newAdmin').post(`/api/v1/admin/accounts/${USERS.newRecruiter}/decision`, { decision: 'approve' })).status).toBe(200);
    const orgs = await api.as('newSeeker').get('/api/v1/organizations');
    const org = orgs.body.organizations.find((o: { name: string }) => o.name === 'Aravali Fintech');
    expect(org).toMatchObject({ is_synthetic: false });

    const opening = await api.as('newRecruiter').post('/api/v1/recruiter/openings', {
      role_id: 'ncr-banking-operations-associate',
      title: 'Payments Operations Associate',
      location: 'Gurugram',
      work_mode: 'onsite',
    });
    expect(opening.status).toBe(201);
    expect(opening.body.opening).toMatchObject({ source_type: 'employer_posted', is_simulated: false, status: 'open' });

    const me = (await api.as('newSeeker').get('/api/v1/me')).body;
    const share = await api.as('newSeeker').post(`/api/v1/profiles/${me.profile_id}/share-approval`, {
      recipient: { type: 'recruiter_org', org_id: org.id },
      fields: ['display_name', 'skills_summary', 'role_suitability'],
      consent,
    });
    expect(share.status).toBe(201);

    const list = await api.as('newRecruiter').get('/api/v1/recruiter/candidates');
    expect(list.body.candidates).toHaveLength(1);
    const view = await api.as('newRecruiter').get(`/api/v1/recruiter/candidates/${list.body.candidates[0].grant_id}`);
    expect(view.status).toBe(200);
    const fit = view.body.opportunity_fit[0];
    expect(fit).toMatchObject({ title: 'Payments Operations Associate', is_simulated: false });
    expect(fit.evaluation.role_fit_score).toBeGreaterThan(0);
    expect(view.body.shared.preferences).toBeUndefined();
  });

  it('a recruiter cannot close another organisation’s opening', async () => {
    const mine = await api.as('newRecruiter').get('/api/v1/recruiter/openings');
    const id = mine.body.openings[0].id;
    expect((await api.as('otherRecruiter').post(`/api/v1/recruiter/openings/${id}/close`)).status).toBe(403);
    expect((await api.as('newRecruiter').post(`/api/v1/recruiter/openings/${id}/close`)).status).toBe(200);
  });

  it('a rejected account stays locked out', async () => {
    await api.as('newSeeker2').post('/api/v1/onboarding', { ...recruiterBody, organization_name: 'Unknown Staffing' });
    expect((await api.as('newAdmin').post(`/api/v1/admin/accounts/${USERS.newSeeker2}/decision`, { decision: 'reject' })).status).toBe(200);
    const res = await api.as('newSeeker2').get('/api/v1/recruiter/candidates');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('account_rejected');
  });

  it('every step is in the audit trail', async () => {
    const audit = await api.as('newAdmin').get('/api/v1/admin/audit?limit=200');
    const actions = audit.body.events.map((e: { action: string }) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['account.onboarded', 'account.approved', 'account.rejected', 'skills.imported', 'opening.posted']));
  });
});

describe('the demo scenario is untouched', () => {
  it('a demo reset leaves self-service accounts alone', async () => {
    const before = (await api.as('newSeeker').get('/api/v1/me')).body.profile_id;
    expect((await api.as('admin').post('/api/v1/admin/demo/reset', { confirm: 'RESET' })).status).toBe(200);
    const skills = await api.as('newSeeker').get(`/api/v1/profiles/${before}/skills`);
    expect(skills.body.skills.length).toBeGreaterThan(5);
  });

  it('Harpreet still ranks on the demo catalogue only', async () => {
    const me = (await api.as('worker').get('/api/v1/me')).body;
    const recs = await api.as('worker').get(`/api/v1/recommendations/latest?profile_id=${me.profile_id}`);
    expect(JSON.stringify(recs.body)).not.toContain('ncr-');
  });
});
