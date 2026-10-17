/**
 * Pre-show rehearsal against the REAL stack: signs in the four demo accounts
 * with Supabase Auth and runs the Harpreet journey through the running API,
 * including forbidden-access checks. Resets the scenario at the end unless
 * --keep is passed.
 *
 * Usage: (API running) npm run demo:smoke [-- --keep]
 */
import { createClient } from '@supabase/supabase-js';
import { ASSESSMENT_ID, ASSESSMENTS, MENTOR_IDS, ORG_IDS, PROFILE_IDS } from '../src/data/demo-v1.ts';
import { CONSENT_VERSION } from '../src/engine/vocabulary.ts';
import { readCredentials, requireEnv, step } from './lib.ts';

const env = requireEnv('SUPABASE_URL', 'SUPABASE_ANON_KEY');
const API = (process.env.API_URL?.trim() || `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, '');
const keep = process.argv.includes('--keep');
const H = PROFILE_IDS.harpreet;
const QA = 'qa-automation-engineer-bfsi';
const consent = { approved: true, statement_version: CONSENT_VERSION };

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function signIn(email: string, password: string): Promise<string> {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return data.session.access_token;
}

function caller(token: string) {
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${API}/api/v1${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, any>;
    return { status: res.status, body: json };
  };
  return {
    get: (p: string) => call('GET', p),
    post: (p: string, b: unknown = {}) => call('POST', p, b),
    patch: (p: string, b: unknown) => call('PATCH', p, b),
  };
}

step(`Checking API at ${API}`);
const health = await fetch(`${API}/api/v1/health`).then((r) => r.ok).catch(() => false);
check('API health', health, 'start it with "npm run dev" in apps/api');
if (!health) process.exit(1);

step('Signing in four independent Supabase identities');
const creds = Object.fromEntries(readCredentials().map((c) => [c.key, c]));
const worker = caller(await signIn(creds.worker!.email, creds.worker!.password));
const mentor = caller(await signIn(creds.mentor!.email, creds.mentor!.password));
const recruiter = caller(await signIn(creds.recruiter!.email, creds.recruiter!.password));
const admin = caller(await signIn(creds.admin!.email, creds.admin!.password));
for (const [name, c, role] of [['worker', worker, 'worker'], ['mentor', mentor, 'mentor'], ['recruiter', recruiter, 'recruiter'], ['admin', admin, 'admin']] as const) {
  const me = await c.get('/me');
  check(`${name} resolves to role "${role}"`, me.body.role === role, JSON.stringify(me.body.error ?? me.body.role));
}

step('Starting from a clean scenario');
check('admin reset', (await admin.post('/admin/demo/reset', { confirm: 'RESET' })).status === 200);

step('Worker: review skills, assess, request mentor, share with recruiter');
const skills = (await worker.get(`/profiles/${H}/skills`)).body.skills as Array<{ skill_id: string }>;
check('extracted skills present', skills?.length > 10);
const review = await worker.patch(`/profiles/${H}/skills`, {
  updates: skills.map((s) =>
    s.skill_id === 'programming-fundamentals' ? { skill_id: s.skill_id, action: 'reject' } : { skill_id: s.skill_id, action: 'confirm' },
  ),
});
check('skill review saved', review.status === 200, review.body.error?.message);
const assess = await worker.post(`/assessments/${ASSESSMENT_ID}/results`, { profile_id: H, answers: ASSESSMENTS[0]!.answer_key });
check('assessment verifies only the tested skill', assess.status === 201 && assess.body.skills_changed?.join() === 'test-automation-scripting');
const request = await worker.post('/mentorships', {
  profile_id: H, mentor_id: MENTOR_IDS.meera, target_role_id: QA,
  shared_fields: ['display_name', 'career_goal', 'gap_areas', 'assessment_results'], consent,
});
check('mentor request with consent', request.status === 201, request.body.error?.message);
const share = await worker.post(`/profiles/${H}/share-approval`, {
  recipient: { type: 'recruiter_org', org_id: ORG_IDS.northwind }, target_role_id: QA,
  fields: ['display_name', 'career_goal', 'skills_summary', 'role_suitability'], consent,
});
check('recruiter share with consent', share.status === 201, share.body.error?.message);
check('share without consent rejected', (await worker.post('/mentorships', { profile_id: H, mentor_id: MENTOR_IDS.meera, target_role_id: QA, shared_fields: ['display_name'] })).status === 400);
check('other worker profile rejected', (await worker.get(`/profiles/${PROFILE_IDS.priya}`)).status === 403);

step('Mentor: sees authorized fields only, accepts, records feedback');
const requestId = request.body.request?.id as string;
const detail = await mentor.get(`/mentor/requests/${requestId}`);
check('mentor sees shared request', detail.status === 200 && detail.body.shared?.display_name === 'Harpreet Singh');
check('work history withheld from mentor', detail.body.shared && !('experience_summary' in detail.body.shared));
check('mentor accepts', (await mentor.post(`/mentor/requests/${requestId}/respond`, { decision: 'accept' })).status === 200);
check('mentor feedback saved', (await mentor.post(`/mentor/requests/${requestId}/notes`, { kind: 'feedback', body: 'Smoke-test feedback.' })).status === 201);
check('mentor cannot read worker profile', (await mentor.get(`/profiles/${H}`)).status === 403);

step('Recruiter: consented candidate only');
const list = await recruiter.get('/recruiter/candidates');
check('recruiter sees one consented candidate', list.body.candidates?.length === 1);
const grantId = share.body.grant?.id as string;
check('recruiter sees role suitability', (await recruiter.get(`/recruiter/candidates/${grantId}`)).body.shared?.role_suitability != null);
check('recruiter cannot read mentor request', (await recruiter.get(`/mentor/requests/${requestId}`)).status === 403);

step('Admin: health, datasets and audit — no private worker content');
const overview = await admin.get('/admin/overview');
check('database healthy', overview.body.database?.status === 'ok');
check('admin cannot read worker skills', (await admin.get(`/profiles/${H}/skills`)).status === 403);
const audit = await admin.get('/admin/audit?limit=200');
check('audit trail recorded', (audit.body.events?.length ?? 0) > 5);
check('audit has no work-history text', !JSON.stringify(audit.body).includes('Selenium IDE'));

step('Worker sees persisted cross-account state');
const mine = await worker.get(`/mentorships?profile_id=${H}`);
check('mentor acceptance visible to worker', mine.body.requests?.[0]?.status === 'accepted' && mine.body.requests[0].feedback.length === 1);

if (!keep) {
  step('Resetting for the live demo');
  check('final reset', (await admin.post('/admin/demo/reset', { confirm: 'RESET' })).status === 200);
}

console.log(failures === 0 ? '\nSMOKE TEST PASSED' : `\nSMOKE TEST FAILED (${failures} check(s))`);
process.exit(failures === 0 ? 0 : 1);
