/**
 * Backend authorization matrix: for every role, the operations it may perform
 * succeed and the ones it may not are rejected by the API (and audited).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ASSESSMENT_ID, MENTOR_IDS, ORG_IDS, PROFILE_IDS } from '../src/data/demo-v1.ts';
import { CONSENT_VERSION } from '../src/engine/vocabulary.ts';
import { createTestApi, type TestApi } from './support/test-app.ts';

const H = PROFILE_IDS.harpreet;
const P = PROFILE_IDS.priya;
const consent = { approved: true, statement_version: CONSENT_VERSION };
let api: TestApi;

const mentorRequestBody = (overrides: object = {}) => ({
  profile_id: H,
  mentor_id: MENTOR_IDS.meera,
  target_role_id: 'qa-automation-engineer-bfsi',
  shared_fields: ['display_name', 'career_goal', 'gap_areas', 'skills_summary'],
  consent,
  ...overrides,
});
const shareBody = (overrides: object = {}) => ({
  recipient: { type: 'recruiter_org', org_id: ORG_IDS.northwind },
  target_role_id: 'qa-automation-engineer-bfsi',
  fields: ['display_name', 'skills_summary', 'role_suitability'],
  consent,
  ...overrides,
});

async function createRequest() {
  const res = await api.as('worker').post('/api/v1/mentorships', mentorRequestBody());
  expect(res.status).toBe(201);
  return res.body.request.id as string;
}
async function createShare() {
  const res = await api.as('worker').post(`/api/v1/profiles/${H}/share-approval`, shareBody());
  expect(res.status).toBe(201);
  return res.body.grant.id as string;
}
async function deniedCount() {
  const r = await api.t.db.asService((q) => q.query<{ n: number }>("select count(*)::int as n from public.audit_events where action = 'authz.denied'"));
  return r.rows[0]!.n;
}

beforeAll(async () => {
  api = await createTestApi();
});
afterAll(async () => {
  await api.t.db.close();
});
beforeEach(async () => {
  await api.t.reset();
});

describe('unauthenticated and unprovisioned callers', () => {
  it('health is public; everything else needs a valid session', async () => {
    expect((await api.anon.get('/api/v1/health')).status).toBe(200);
    expect((await api.anon.get('/api/v1/me')).status).toBe(401);
    const bad = await api.anon.get('/api/v1/me').set('authorization', 'Bearer not-a-real-token');
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('invalid_session');
  });

  it('a valid identity without an app role may only see that it must onboard', async () => {
    const me = await api.as('unprovisioned').get('/api/v1/me');
    expect(me.status).toBe(200);
    expect(me.body.status).toBe('needs_onboarding');
    expect(me.body.role).toBeUndefined();
    for (const path of ['/api/v1/roles', '/api/v1/organizations', '/api/v1/mentor/requests', '/api/v1/admin/overview']) {
      const res = await api.as('unprovisioned').get(path);
      expect(res.status, path).toBe(403);
      expect(res.body.error.code).toBe('onboarding_required');
    }
  });

  it('errors are safe and carry a request id', async () => {
    const res = await api.as('worker').get('/api/v1/profiles/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.request_id).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/stack|select|postgres/i);
  });
});

describe('worker', () => {
  it('role is resolved server-side from the identity', async () => {
    const me = await api.as('worker').get('/api/v1/me');
    expect(me.body).toMatchObject({ role: 'worker', profile_id: H, is_synthetic: true });
  });

  it('may read and update their own profile data', async () => {
    expect((await api.as('worker').get(`/api/v1/profiles/${H}`)).status).toBe(200);
    expect((await api.as('worker').get(`/api/v1/profiles/${H}/skills`)).status).toBe(200);
    expect((await api.as('worker').get(`/api/v1/recommendations/latest?profile_id=${H}`)).status).toBe(200);
    expect((await api.as('worker').get(`/api/v1/roles/qa-automation-engineer-bfsi/gaps?profile_id=${H}`)).status).toBe(200);
    expect((await api.as('worker').get(`/api/v1/mentors/matches?profile_id=${H}&role_id=qa-automation-engineer-bfsi`)).status).toBe(200);
    expect((await api.as('worker').get(`/api/v1/audit/${H}`)).status).toBe(200);
    const patch = await api.as('worker').patch(`/api/v1/profiles/${H}/skills`, { updates: [{ skill_id: 'sql-querying', action: 'confirm' }] });
    expect(patch.status).toBe(200);
  });

  it('is denied another worker’s profile, skills, recommendations and actions — and the attempt is audited', async () => {
    const before = await deniedCount();
    const attempts = [
      api.as('worker').get(`/api/v1/profiles/${P}`),
      api.as('worker').get(`/api/v1/profiles/${P}/skills`),
      api.as('worker').get(`/api/v1/recommendations/latest?profile_id=${P}`),
      api.as('worker').get(`/api/v1/audit/${P}`),
      api.as('worker').patch(`/api/v1/profiles/${P}/skills`, { updates: [{ skill_id: 'sql-querying', action: 'confirm' }] }),
      api.as('worker').post(`/api/v1/assessments/${ASSESSMENT_ID}/results`, { profile_id: P, answers: { q1: 'b', q2: 'c', q3: 'a', q4: 'd', q5: 'b' } }),
      api.as('worker').post('/api/v1/mentorships', mentorRequestBody({ profile_id: P })),
      api.as('worker').post(`/api/v1/profiles/${P}/share-approval`, shareBody()),
    ];
    for (const res of await Promise.all(attempts)) expect(res.status).toBe(403);
    expect(await deniedCount()).toBe(before + attempts.length);
  });

  it('cannot use mentor, recruiter or admin endpoints', async () => {
    for (const path of ['/api/v1/mentor/requests', '/api/v1/recruiter/candidates', '/api/v1/admin/overview', '/api/v1/admin/audit']) {
      expect((await api.as('worker').get(path)).status).toBe(403);
    }
    expect((await api.as('worker').post('/api/v1/admin/demo/reset', { confirm: 'RESET' })).status).toBe(403);
  });

  it('cannot share without explicit approval or outside the field vocabulary', async () => {
    const noConsent = await api.as('worker').post('/api/v1/mentorships', mentorRequestBody({ consent: undefined }));
    expect(noConsent.status).toBe(400);
    expect(noConsent.body.error.code).toBe('consent_required');
    const truthyString = await api.as('worker').post('/api/v1/mentorships', mentorRequestBody({ consent: { approved: 'true', statement_version: CONSENT_VERSION } }));
    expect(truthyString.body.error.code).toBe('consent_required');
    const shareNoConsent = await api.as('worker').post(`/api/v1/profiles/${H}/share-approval`, shareBody({ consent: { approved: false } }));
    expect(shareNoConsent.body.error.code).toBe('consent_required');
    const badField = await api.as('worker').post('/api/v1/mentorships', mentorRequestBody({ shared_fields: ['display_name', 'salary_floor'] }));
    expect(badField.status).toBe(400);
    const none = await api.t.db.asService((q) => q.query<{ n: number }>('select count(*)::int as n from public.mentor_requests'));
    expect(none.rows[0]!.n).toBe(0);
  });

  it('cannot request an unavailable mentor', async () => {
    const full = await api.as('worker').post('/api/v1/mentorships', mentorRequestBody({ mentor_id: MENTOR_IDS.daniel }));
    expect(full.status).toBe(409);
    const noLanguage = await api.as('worker').post('/api/v1/mentorships', mentorRequestBody({ mentor_id: MENTOR_IDS.kavya }));
    expect(noLanguage.status).toBe(409);
  });

  it('cannot mark a skill verified by editing it', async () => {
    const res = await api.as('worker').patch(`/api/v1/profiles/${H}/skills`, {
      updates: [{ skill_id: 'test-automation-scripting', action: 'edit', proficiency: 4, status: 'verified' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.applied[0].to_status).toBe('self_reported');
    const bad = await api.as('worker').patch(`/api/v1/profiles/${H}/skills`, { updates: [{ skill_id: 'test-automation-scripting', action: 'verify' }] });
    expect(bad.status).toBe(400);
  });

  it('cannot hand-edit a skill once it has been assessed', async () => {
    await api.as('worker').post(`/api/v1/assessments/${ASSESSMENT_ID}/results`, { profile_id: H, answers: { q1: 'b', q2: 'c', q3: 'a', q4: 'd', q5: 'b' } });
    const res = await api.as('worker').patch(`/api/v1/profiles/${H}/skills`, { updates: [{ skill_id: 'test-automation-scripting', action: 'edit', proficiency: 4 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('skill_locked');
  });

  it('cannot revoke someone else’s share', async () => {
    const grantId = await createShare();
    expect((await api.as('otherWorker').post(`/api/v1/shares/${grantId}/revoke`)).status).toBe(403);
    expect((await api.as('recruiter').post(`/api/v1/shares/${grantId}/revoke`)).status).toBe(403);
  });
});

describe('mentor', () => {
  it('sees only requests addressed to them and only the shared fields', async () => {
    const id = await createRequest();
    const list = await api.as('mentor').get('/api/v1/mentor/requests');
    expect(list.status).toBe(200);
    expect(list.body.requests).toHaveLength(1);
    const detail = await api.as('mentor').get(`/api/v1/mentor/requests/${id}`);
    expect(detail.status).toBe(200);
    expect(Object.keys(detail.body.shared).sort()).toEqual(['career_goal', 'display_name', 'gap_areas', 'is_synthetic', 'skills_summary']);
    expect(JSON.stringify(detail.body)).not.toContain('Selenium IDE');
  });

  it('may accept and record notes; cannot add notes before accepting', async () => {
    const id = await createRequest();
    const early = await api.as('mentor').post(`/api/v1/mentor/requests/${id}/notes`, { kind: 'feedback', body: 'Too early' });
    expect(early.status).toBe(409);
    expect((await api.as('mentor').post(`/api/v1/mentor/requests/${id}/respond`, { decision: 'accept' })).status).toBe(200);
    expect((await api.as('mentor').post(`/api/v1/mentor/requests/${id}/respond`, { decision: 'decline' })).status).toBe(409);
    expect((await api.as('mentor').post(`/api/v1/mentor/requests/${id}/notes`, { kind: 'progress', body: 'Session 1 done' })).status).toBe(201);
  });

  it('is denied worker data, other mentors’ requests and other roles’ endpoints', async () => {
    const id = await createRequest();
    for (const path of [
      `/api/v1/profiles/${H}`,
      `/api/v1/profiles/${H}/skills`,
      `/api/v1/recommendations/latest?profile_id=${H}`,
      `/api/v1/audit/${H}`,
      '/api/v1/recruiter/candidates',
      '/api/v1/admin/overview',
    ]) {
      expect((await api.as('mentor').get(path)).status).toBe(403);
    }
    expect((await api.as('otherMentor').get(`/api/v1/mentor/requests/${id}`)).status).toBe(403);
    expect((await api.as('otherMentor').post(`/api/v1/mentor/requests/${id}/respond`, { decision: 'accept' })).status).toBe(403);
    expect((await api.as('mentor').post('/api/v1/mentorships', mentorRequestBody())).status).toBe(403);
  });

  it('loses the worker’s data when the worker revokes', async () => {
    const id = await createRequest();
    expect((await api.as('worker').post(`/api/v1/mentorships/${id}/revoke`)).status).toBe(200);
    const detail = await api.as('mentor').get(`/api/v1/mentor/requests/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.shared).toBeNull();
    expect(detail.body.request.status).toBe('revoked');
  });
});

describe('recruiter', () => {
  it('sees only candidates who shared with their organisation', async () => {
    expect((await api.as('recruiter').get('/api/v1/recruiter/candidates')).body.candidates).toEqual([]);
    const grantId = await createShare();
    const list = await api.as('recruiter').get('/api/v1/recruiter/candidates');
    expect(list.body.candidates).toHaveLength(1);
    const detail = await api.as('recruiter').get(`/api/v1/recruiter/candidates/${grantId}`);
    expect(detail.status).toBe(200);
    expect(Object.keys(detail.body.shared).sort()).toEqual(['display_name', 'is_synthetic', 'role_suitability', 'skills_summary']);
    expect(detail.body.withheld_field_labels).toContain('Full work-history text');
    expect((await api.as('otherRecruiter').get('/api/v1/recruiter/candidates')).body.candidates).toEqual([]);
  });

  it('is denied other organisations’ candidates, revoked shares and other roles’ endpoints', async () => {
    const grantId = await createShare();
    expect((await api.as('otherRecruiter').get(`/api/v1/recruiter/candidates/${grantId}`)).status).toBe(403);
    for (const path of [`/api/v1/profiles/${H}`, `/api/v1/profiles/${H}/skills`, '/api/v1/mentor/requests', '/api/v1/admin/audit']) {
      expect((await api.as('recruiter').get(path)).status).toBe(403);
    }
    expect((await api.as('recruiter').post(`/api/v1/profiles/${H}/share-approval`, shareBody())).status).toBe(403);
    await api.as('worker').post(`/api/v1/shares/${grantId}/revoke`);
    expect((await api.as('recruiter').get(`/api/v1/recruiter/candidates/${grantId}`)).status).toBe(403);
  });

  it('may explore opportunities, all labelled as simulated', async () => {
    const res = await api.as('recruiter').get('/api/v1/opportunities');
    expect(res.status).toBe(200);
    expect(res.body.opportunities.length).toBe(5);
    expect(res.body.opportunities.every((o: { is_simulated: boolean }) => o.is_simulated)).toBe(true);
  });
});

describe('admin', () => {
  it('may view system health, versions, synthetic status and audit events', async () => {
    const overview = await api.as('admin').get('/api/v1/admin/overview');
    expect(overview.status).toBe(200);
    expect(overview.body.database.status).toBe('ok');
    expect(overview.body.synthetic_data.synthetic_worker_profiles).toBe(2);
    expect(overview.body.integrations.find((i: { name: string }) => i.name.startsWith('SAP')).status).toBe('planned');
    const audit = await api.as('admin').get('/api/v1/admin/audit?limit=50');
    expect(audit.status).toBe(200);
    expect(audit.body.events.length).toBeGreaterThan(0);
  });

  it('never receives worker work history or skills through admin views', async () => {
    await createRequest();
    const overview = await api.as('admin').get('/api/v1/admin/overview');
    const audit = await api.as('admin').get('/api/v1/admin/audit?limit=200');
    for (const body of [overview.body, audit.body]) {
      const text = JSON.stringify(body);
      expect(text).not.toContain('Selenium');
      expect(text).not.toContain('ledger balances');
    }
  });

  it('is denied worker, mentor and recruiter data endpoints', async () => {
    const requestId = await createRequest();
    const grantId = await createShare();
    for (const path of [
      `/api/v1/profiles/${H}`,
      `/api/v1/profiles/${H}/skills`,
      `/api/v1/audit/${H}`,
      `/api/v1/mentor/requests/${requestId}`,
      `/api/v1/recruiter/candidates/${grantId}`,
    ]) {
      expect((await api.as('admin').get(path)).status).toBe(403);
    }
  });

  it('may reset the synthetic scenario only with explicit confirmation', async () => {
    await createRequest();
    expect((await api.as('admin').post('/api/v1/admin/demo/reset', {})).status).toBe(400);
    expect((await api.as('admin').post('/api/v1/admin/demo/reset', { confirm: 'yes' })).status).toBe(400);
    const ok = await api.as('admin').post('/api/v1/admin/demo/reset', { confirm: 'RESET' });
    expect(ok.status).toBe(200);
    expect(ok.body.profiles_reset).toBe(2);
    const open = await api.t.db.asService((q) => q.query<{ n: number }>('select count(*)::int as n from public.mentor_requests'));
    expect(open.rows[0]!.n).toBe(0);
  });
});
