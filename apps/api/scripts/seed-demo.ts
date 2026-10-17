/**
 * Creates (or updates) the four Supabase Auth demo identities, links them to
 * application roles, loads the synthetic catalogue and resets the Harpreet
 * scenario. Passwords are written only to the gitignored
 * demo-credentials.local.{json,md} at the repository root.
 *
 * Usage: npm run demo:seed
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_DEMO_EMAIL_DOMAIN, DEMO_ACCOUNTS, type DemoAccountKey } from '../src/data/demo-v1.ts';
import { demoAccountLinks, linkAccounts, upsertWorkerProfiles } from '../src/seed/accounts.ts';
import { upsertCatalog } from '../src/seed/catalog.ts';
import { resetScenario } from '../src/seed/scenario.ts';
import { CREDENTIALS_MD, connectDb, requireEnv, step, writeCredentials, type DemoCredential } from './lib.ts';

const env = requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL');
const domain = process.env.DEMO_EMAIL_DOMAIN?.trim() || DEFAULT_DEMO_EMAIL_DOMAIN;

const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Listing users failed: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

const passwordFor = (key: DemoAccountKey) =>
  process.env[`DEMO_PASSWORD_${key.toUpperCase()}`]?.trim() || `SecondAct-${randomBytes(3).toString('hex')}-${key.slice(0, 3)}`;

step('Creating or updating Supabase Auth identities');
const userIds = {} as Record<DemoAccountKey, string>;
const credentials: DemoCredential[] = [];
for (const account of DEMO_ACCOUNTS) {
  const email = `${account.email_local}@${domain}`.toLowerCase();
  const password = passwordFor(account.key);
  const existing = await findUserId(email);
  let id: string;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing, { password, email_confirm: true });
    if (error) throw new Error(`Updating ${email} failed: ${error.message}`);
    id = existing;
    console.log(`  = ${account.role.padEnd(9)} ${email} (password reset)`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: account.display_name },
    });
    if (error || !data.user) throw new Error(`Creating ${email} failed: ${error?.message ?? 'no user returned'}`);
    id = data.user.id;
    console.log(`  + ${account.role.padEnd(9)} ${email}`);
  }
  userIds[account.key] = id;
  credentials.push({ key: account.key, role: account.role, display_name: account.display_name, email, password });
}

const db = connectDb();
try {
  step('Loading synthetic catalogue and linking identities to roles');
  await db.asService(async (q) => {
    await upsertCatalog(q);
    await upsertWorkerProfiles(q);
    await linkAccounts(q, demoAccountLinks(userIds));
  });

  step('Resetting the Harpreet scenario');
  const summary = await resetScenario(db, { userId: null, role: 'cli' });
  console.log(`  ✓ ${summary.profiles_reset} synthetic profiles reset, ${summary.skills_seeded} inferred skills seeded`);
} finally {
  await db.close();
}

writeCredentials(credentials);
step(`Done. Demo sign-in details: ${CREDENTIALS_MD}`);
console.log('  Keep that file private. It is gitignored and is not bundled into the app.');
