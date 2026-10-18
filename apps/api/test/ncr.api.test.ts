/**
 * Delhi-NCR pilot over HTTP: upload -> extraction -> worker review -> role matching -> explanations,
 * plus who may and may not call it. Runs against the real migrations in an in-process PostgreSQL.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApi, tokenFor, type TestApi } from './support/test-app.ts';
import type { TestUser } from './support/test-db.ts';

const MARKER = 'ZEBRAFISH-UNIQUE-MARKER-4821';
const RESUME = [
  'PRIYA TEST',
  'Noida | priya.test@example.test',
  '',
  'KEY SKILLS',
  '- Manual testing, test case design, regression testing',
  '- Defect tracking in Jira; TestRail',
  '- SQL (Basic) for data checks',
  '- Core banking and KYC checks',
  '',
  'EXPERIENCE',
  `- Executed functional testing for the payments release ${MARKER}.`,
  '',
  'GOALS',
  '- Intends to learn Python and Selenium for test automation.',
  '- Has not worked on any API testing tools so far.',
].join('\n');

let api: TestApi;
beforeAll(async () => {
  api = await createTestApi();
});
afterAll(async () => {
  await api.t.db.close();
});

const upload = (user: TestUser, body: Buffer | string, type = 'text/plain') =>
  api.anon.post('/api/v1/ncr/resume/extract').set('authorization', `Bearer ${tokenFor(user)}`).set('content-type', type).send(body);

describe('worker journey: upload, review, role matching, explanations', () => {
  it('extracts suggestions that are pending review and never verified', async () => {
    const res = await upload('worker', RESUME);
    expect(res.status).toBe(200);
    expect(res.body.review_required).toBe(true);
    const skills = res.body.extraction.skills as Array<{ skill_id: string; mention_type: string; status: string; review_status: string; evidence: string }>;
    const byId = new Map(skills.map((s) => [s.skill_id, s]));

    expect(byId.get('manual-testing')?.mention_type).toBe('explicit_current');
    expect(byId.get('test-automation')?.mention_type).toBe('future_goal');
    expect(byId.get('python-programming')?.mention_type).toBe('future_goal');
    expect(byId.get('api-testing')?.mention_type).toBe('negated_or_no_experience');
    for (const s of skills) {
      expect(['self_reported', 'inferred', 'unknown']).toContain(s.status);
      expect(s.review_status).toBe('pending');
      expect(s.evidence.length).toBeGreaterThan(0);
    }
  });

  it('turns only reviewed, accepted skills into role matches with explanations', async () => {
    const extracted = await upload('worker', RESUME);
    const accepted = (extracted.body.extraction.skills as Array<{ skill_id: string; mention_type: string; suggested_level: number | null; evidence: string }>)
      .filter((s) => s.mention_type === 'explicit_current')
      .map((s) => ({ skill_id: s.skill_id, mention_type: s.mention_type, level: s.suggested_level ?? 2, evidence: s.evidence }));
    expect(accepted.length).toBeGreaterThan(4);

    const res = await api.as('worker').post('/api/v1/ncr/recommend', { skills: accepted, preferences: { cities: ['Noida'] } });
    expect(res.status).toBe(200);
    expect(res.body.top_roles.length).toBeGreaterThan(0);
    expect(res.body.top_roles.length).toBeLessThanOrEqual(3);
    const top = res.body.top_roles[0];
    expect(top.score_type).toBe('estimated_skill_fit_not_hiring_probability');
    expect(top.matching_skills.every((m: { status: string }) => m.status === 'self_reported')).toBe(true);
    expect(top.matching_skills.some((m: { evidence: string | null }) => m.evidence)).toBe(true);
    expect(top.vacancies.status).toBe('none_connected');
    expect(top.demand_signal.kind).toBe('simulated_sample');
    expect(res.body.dataset_version).toBe('ncr-roles-v1');
    expect(res.body.limitations.join(' ')).toMatch(/simulated/i);

    // The goals the worker did not accept are absent from the profile that was scored.
    const everyMatched = res.body.top_roles.flatMap((r: { matching_skills: Array<{ skill_id: string }> }) => r.matching_skills.map((m) => m.skill_id));
    expect(everyMatched).not.toContain('test-automation');
    expect(everyMatched).not.toContain('python-programming');
  });

  it('refuses to accept a future goal or a negated skill as a current skill', async () => {
    const res = await api.as('worker').post('/api/v1/ncr/recommend', {
      skills: [{ skill_id: 'python-programming', mention_type: 'future_goal', level: 3 }],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('not_a_current_skill');
  });

  it('ignores a client-supplied status: nothing a client sends can make a skill verified', async () => {
    const res = await api.as('worker').post('/api/v1/ncr/recommend', {
      skills: [
        { skill_id: 'manual-testing', mention_type: 'explicit_current', level: 4, status: 'verified' },
        { skill_id: 'test-case-design', mention_type: 'explicit_current', level: 4, status: 'verified' },
        { skill_id: 'functional-testing', mention_type: 'explicit_current', level: 4, verified: true },
      ],
    });
    expect(res.status).toBe(200);
    const statuses = res.body.top_roles.flatMap((r: { matching_skills: Array<{ status: string }> }) => r.matching_skills.map((m) => m.status));
    expect(new Set(statuses)).toEqual(new Set(['self_reported']));
  });

  it('rejects unknown skills, bad levels and duplicates', async () => {
    const post = (skills: object[]) => api.as('worker').post('/api/v1/ncr/recommend', { skills });
    expect((await post([{ skill_id: 'made-up', mention_type: 'explicit_current', level: 2 }])).status).toBe(422);
    expect((await post([{ skill_id: 'sql-querying', mention_type: 'explicit_current', level: 9 }])).status).toBe(400);
    expect(
      (
        await post([
          { skill_id: 'sql-querying', mention_type: 'explicit_current', level: 2 },
          { skill_id: 'sql-querying', mention_type: 'explicit_current', level: 3 },
        ])
      ).status,
    ).toBe(422);
  });

  it('says so when nothing clears the bar, and when preferences exclude everything', async () => {
    const none = await api.as('worker').post('/api/v1/ncr/recommend', { skills: [{ skill_id: 'git-version-control', mention_type: 'explicit_current', level: 2 }] });
    expect(none.body.top_roles).toEqual([]);
    expect(none.body.message).toMatch(/No role in the Delhi-NCR pilot dataset/);

    const remote = await api.as('worker').post('/api/v1/ncr/recommend', {
      skills: [{ skill_id: 'manual-testing', mention_type: 'explicit_current', level: 3 }],
      preferences: { work_modes: ['remote'] },
    });
    expect(remote.body.top_roles).toEqual([]);
    expect(remote.body.excluded_roles.length).toBeGreaterThan(10);
  });

  it('serves the dataset description with its limitations', async () => {
    const res = await api.as('worker').get('/api/v1/ncr/meta');
    expect(res.status).toBe(200);
    expect(res.body.skills.length).toBeGreaterThan(50);
    expect(res.body.labels.listings).toMatch(/SIMULATED/);
  });
});

describe('document handling', () => {
  it('rejects binary garbage, empty bodies and files that are too large', async () => {
    const bin = await upload('worker', Buffer.from([1, 2, 0, 3, 4]), 'application/octet-stream');
    expect(bin.status).toBe(422);
    expect(bin.body.error.code).toBe('document_unsupported');

    const empty = await upload('worker', Buffer.alloc(0));
    expect(empty.status).toBe(400);

    const big = await upload('worker', Buffer.alloc(5 * 1024 * 1024 + 10, 65), 'application/octet-stream');
    expect(big.status).toBe(413);
  });

  it('does not trust the declared content type', async () => {
    const res = await upload('worker', Buffer.from('%PDF-1.4 not really a pdf'), 'text/plain');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('document_unreadable');
  });

  it('never echoes parser internals or resume text in an error', async () => {
    const res = await upload('worker', Buffer.from(`%PDF-1.4 ${MARKER}`), 'application/pdf');
    expect(JSON.stringify(res.body)).not.toContain(MARKER);
  });
});

describe('who may use the pilot', () => {
  it.each(['mentor', 'recruiter', 'admin'] as const)('%s cannot read the dataset, upload a resume or run matching', async (user) => {
    expect((await api.as(user).get('/api/v1/ncr/meta')).status).toBe(403);
    expect((await upload(user, RESUME)).status).toBe(403);
    expect((await api.as(user).post('/api/v1/ncr/recommend', { skills: [] })).status).toBe(403);
  });

  it('requires a session', async () => {
    expect((await api.anon.get('/api/v1/ncr/meta')).status).toBe(401);
    expect((await api.anon.post('/api/v1/ncr/resume/extract').set('content-type', 'text/plain').send(RESUME)).status).toBe(401);
  });

  it('records refused attempts in the audit trail', async () => {
    await upload('recruiter', RESUME);
    const rows = await api.t.db.asService((q) => q.query<{ action: string; outcome: string }>("select action, outcome from public.audit_events where action = 'authz.denied' and object_id like '%ncr%'"));
    expect(rows.rows.length).toBeGreaterThan(0);
  });
});

describe('privacy: the resume is processed in memory only', () => {
  it('stores counts and enums in the audit trail, never resume text', async () => {
    await upload('worker', RESUME);
    const res = await api.as('worker').post('/api/v1/ncr/recommend', { skills: [{ skill_id: 'manual-testing', mention_type: 'explicit_current', level: 3, evidence: `Executed testing ${MARKER}` }] });
    expect(res.status).toBe(200);

    const audit = await api.t.db.asService((q) => q.query<{ action: string; metadata: unknown }>("select action, metadata from public.audit_events where action like 'ncr.%'"));
    expect(audit.rows.map((r) => r.action)).toEqual(expect.arrayContaining(['ncr.resume.extract', 'ncr.recommend']));
    expect(JSON.stringify(audit.rows)).not.toContain(MARKER);
    expect(JSON.stringify(audit.rows)).not.toContain('priya.test@example.test');

    const anywhere = await api.t.db.asService((q) => q.query<{ n: number }>(`select count(*)::int as n from public.audit_events where metadata::text like '%${MARKER}%'`));
    expect(anywhere.rows[0]!.n).toBe(0);
  });
});
