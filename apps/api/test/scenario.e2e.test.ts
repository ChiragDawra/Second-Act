/**
 * The live demo, end to end: four independent identities take part in one
 * Harpreet career-transition journey against one persistent database.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ASSESSMENT_ID, ASSESSMENTS, MENTOR_IDS, ORG_IDS, PROFILE_IDS } from '../src/data/demo-v1.ts';
import { CONSENT_VERSION } from '../src/engine/vocabulary.ts';
import { createTestApi, type TestApi } from './support/test-app.ts';

const H = PROFILE_IDS.harpreet;
const QA = 'qa-automation-engineer-bfsi';
const consent = { approved: true, statement_version: CONSENT_VERSION };
let api: TestApi;

type Skill = { skill_id: string; status: string; proficiency: number | null; review_state: string };
const skillsOf = async () => (await api.as('worker').get(`/api/v1/profiles/${H}/skills`)).body.skills as Skill[];

beforeAll(async () => {
  api = await createTestApi();
});
afterAll(async () => {
  await api.t.db.close();
});

describe('Harpreet transition journey across four accounts', () => {
  let requestId = '';
  let grantId = '';

  it('1. worker reviews extracted skills; corrections persist and drive the ranking', async () => {
    const me = await api.as('worker').get('/api/v1/me');
    expect(me.body).toMatchObject({ role: 'worker', profile_id: H });

    const initial = await skillsOf();
    expect(initial.every((s) => s.status === 'inferred' && s.review_state === 'pending')).toBe(true);

    const updates = initial.map((s) =>
      s.skill_id === 'programming-fundamentals'
        ? { skill_id: s.skill_id, action: 'reject' }
        : s.skill_id === 'test-case-design'
          ? { skill_id: s.skill_id, action: 'edit', proficiency: 4 }
          : { skill_id: s.skill_id, action: 'confirm' },
    );
    const res = await api.as('worker').patch(`/api/v1/profiles/${H}/skills`, { updates });
    expect(res.status).toBe(200);
    expect(res.body.recommendations.top.map((r: { role_id: string }) => r.role_id)).toEqual([
      'uat-lead-fintech',
      'release-coordinator',
      'api-test-analyst',
    ]);
    expect(res.body.recommendations.score_type).toBe('estimated_skill_fit_not_hiring_probability');

    const after = await skillsOf();
    expect(after.find((s) => s.skill_id === 'programming-fundamentals')).toMatchObject({ status: 'unknown', proficiency: null });
    expect(after.filter((s) => s.status === 'verified')).toEqual([]);
  });

  it('2. engine explains why QA Automation is a stretch role and what to prove next', async () => {
    const gaps = await api.as('worker').get(`/api/v1/roles/${QA}/gaps?profile_id=${H}`);
    expect(gaps.status).toBe(200);
    expect(gaps.body.evaluation.eligibility).toBe('stretch');
    expect(gaps.body.next_action).toMatchObject({ kind: 'prove', skill_id: 'test-automation-scripting' });
    expect(gaps.body.assessments.map((a: { id: string }) => a.id)).toContain(ASSESSMENT_ID);
  });

  it('3. the assessment changes only the tested skill and re-ranks roles', async () => {
    const before = await skillsOf();
    const res = await api.as('worker').post(`/api/v1/assessments/${ASSESSMENT_ID}/results`, {
      profile_id: H,
      answers: ASSESSMENTS[0]!.answer_key,
    });
    expect(res.status).toBe(201);
    expect(res.body.result).toMatchObject({ passed: true, score: 5, max_score: 5 });
    expect(res.body.skills_changed).toEqual(['test-automation-scripting']);
    expect(res.body.skill_after).toEqual({ status: 'verified', proficiency: 2 });
    expect(res.body.recommendations.top.map((r: { role_id: string }) => r.role_id)).toContain(QA);
    expect(res.body.role_changes.map((c: { role_id: string }) => c.role_id)).toContain(QA);

    const after = await skillsOf();
    const changed = after.filter((a) => {
      const b = before.find((x) => x.skill_id === a.skill_id)!;
      return b.status !== a.status || b.proficiency !== a.proficiency;
    });
    expect(changed.map((c) => c.skill_id)).toEqual(['test-automation-scripting']);
  });

  it('4. worker picks a mentor and explicitly approves what is shared', async () => {
    const matches = await api.as('worker').get(`/api/v1/mentors/matches?profile_id=${H}&role_id=${QA}`);
    expect(matches.body.matches[0].mentor).toMatchObject({ id: MENTOR_IDS.meera, has_demo_login: true, is_synthetic: true });

    const res = await api.as('worker').post('/api/v1/mentorships', {
      profile_id: H,
      mentor_id: MENTOR_IDS.meera,
      target_role_id: QA,
      shared_fields: ['display_name', 'career_goal', 'skills_summary', 'gap_areas', 'assessment_results'],
      message: 'Looking for help with CI and API testing.',
      consent,
    });
    expect(res.status).toBe(201);
    expect(res.body.request.consent_statement).toContain('Meera Iyer');
    requestId = res.body.request.id;
  });

  it('5. mentor signs in separately, sees only the authorized information and responds', async () => {
    const list = await api.as('mentor').get('/api/v1/mentor/requests');
    expect(list.body.requests).toHaveLength(1);
    expect(list.body.requests[0]).toMatchObject({ id: requestId, status: 'requested', worker_display_name: 'Harpreet Singh' });

    const detail = await api.as('mentor').get(`/api/v1/mentor/requests/${requestId}`);
    expect(detail.body.shared.assessment_results[0]).toMatchObject({ skill_id: 'test-automation-scripting', passed: true });
    expect(detail.body.shared).not.toHaveProperty('experience_summary');
    expect(detail.body.shared).not.toHaveProperty('skill_evidence');
    expect(detail.body.request.withheld_fields).toEqual(
      expect.arrayContaining(['experience_summary', 'skill_evidence', 'career_preferences', 'role_suitability']),
    );

    expect((await api.as('mentor').post(`/api/v1/mentor/requests/${requestId}/respond`, { decision: 'accept' })).status).toBe(200);
    expect(
      (await api.as('mentor').post(`/api/v1/mentor/requests/${requestId}/notes`, {
        kind: 'feedback',
        body: 'Strong test design instincts. Next: wire the Playwright suite into GitHub Actions.',
        action_items: ['Run the suite in CI', 'Add one API test'],
      })).status,
    ).toBe(201);
    expect((await api.as('mentor').post(`/api/v1/mentor/requests/${requestId}/notes`, { kind: 'progress', body: 'Private: check CI basics next week.' })).status).toBe(201);
  });

  it('6. worker sees the accepted request and shared feedback, never the private note', async () => {
    const mine = await api.as('worker').get(`/api/v1/mentorships?profile_id=${H}`);
    const request = mine.body.requests[0];
    expect(request.status).toBe('accepted');
    expect(request.feedback).toHaveLength(1);
    expect(JSON.stringify(mine.body)).not.toContain('Private: check CI');
  });

  it('7. recruiter sees nobody until the worker shares, then only consented fields', async () => {
    expect((await api.as('recruiter').get('/api/v1/recruiter/candidates')).body.candidates).toEqual([]);

    const noConsent = await api.as('worker').post(`/api/v1/profiles/${H}/share-approval`, {
      recipient: { type: 'recruiter_org', org_id: ORG_IDS.northwind },
      fields: ['display_name'],
    });
    expect(noConsent.status).toBe(400);
    expect((await api.as('recruiter').get('/api/v1/recruiter/candidates')).body.candidates).toEqual([]);

    const share = await api.as('worker').post(`/api/v1/profiles/${H}/share-approval`, {
      recipient: { type: 'recruiter_org', org_id: ORG_IDS.northwind },
      target_role_id: QA,
      fields: ['display_name', 'career_goal', 'skills_summary', 'assessment_results', 'career_preferences', 'role_suitability'],
      consent,
    });
    expect(share.status).toBe(201);
    grantId = share.body.grant.id;

    const list = await api.as('recruiter').get('/api/v1/recruiter/candidates');
    expect(list.body.candidates).toHaveLength(1);
    const detail = await api.as('recruiter').get(`/api/v1/recruiter/candidates/${grantId}`);
    const qaOpening = detail.body.opportunity_fit.find((o: { opportunity_id: string }) => o.opportunity_id === 'nw-qa-automation-mohali');
    expect(qaOpening).toMatchObject({ is_simulated: true });
    expect(qaOpening.evaluation.eligibility).toBe('eligible');
    expect(detail.body.shared.skills_summary.find((s: { skill_id: string }) => s.skill_id === 'test-automation-scripting').status).toBe('verified');
    expect(detail.body.shared.career_preferences).not.toHaveProperty('salary_floor_lpa');
    expect(detail.body.shared).not.toHaveProperty('experience_summary');
  });

  it('8. cross-role access is still refused mid-journey', async () => {
    expect((await api.as('recruiter').get(`/api/v1/mentor/requests/${requestId}`)).status).toBe(403);
    expect((await api.as('mentor').get(`/api/v1/recruiter/candidates/${grantId}`)).status).toBe(403);
    expect((await api.as('admin').get(`/api/v1/profiles/${H}/skills`)).status).toBe(403);
    expect((await api.as('otherRecruiter').get(`/api/v1/recruiter/candidates/${grantId}`)).status).toBe(403);
  });

  it('9. admin inspects health, dataset status and audit events without worker content', async () => {
    const overview = await api.as('admin').get('/api/v1/admin/overview');
    expect(overview.body.synthetic_data).toMatchObject({ open_mentor_requests: 1, active_share_grants: 1, assessment_results: 1 });
    const audit = await api.as('admin').get('/api/v1/admin/audit?limit=200');
    const actions = new Set(audit.body.events.map((e: { action: string }) => e.action));
    for (const a of ['skill.reviewed', 'assessment.submitted', 'skill.status_changed', 'consent.granted', 'mentorship.accepted', 'mentor_note.created', 'share.viewed', 'authz.denied']) {
      expect(actions).toContain(a);
    }
    const text = JSON.stringify(audit.body);
    expect(text).not.toContain('Playwright suite');
    expect(text).not.toContain('Selenium IDE');
  });

  it('10. worker sees who viewed the shared data', async () => {
    const audit = await api.as('worker').get(`/api/v1/audit/${H}`);
    const viewers = audit.body.events.filter((e: { action: string }) => e.action === 'share.viewed').map((e: { actor_role: string }) => e.actor_role);
    expect(new Set(viewers)).toEqual(new Set(['mentor', 'recruiter']));
  });

  it('11. revoking sharing removes access immediately', async () => {
    expect((await api.as('worker').post(`/api/v1/shares/${grantId}/revoke`)).status).toBe(200);
    expect((await api.as('recruiter').get('/api/v1/recruiter/candidates')).body.candidates).toEqual([]);
    expect((await api.as('recruiter').get(`/api/v1/recruiter/candidates/${grantId}`)).status).toBe(403);
  });

  it('12. admin reset restores the scenario for the next run', async () => {
    expect((await api.as('admin').post('/api/v1/admin/demo/reset', { confirm: 'RESET' })).status).toBe(200);
    expect((await skillsOf()).every((s) => s.status === 'inferred')).toBe(true);
    expect((await api.as('mentor').get('/api/v1/mentor/requests')).body.requests).toEqual([]);
    expect((await api.as('recruiter').get('/api/v1/recruiter/candidates')).body.candidates).toEqual([]);
  });
});
