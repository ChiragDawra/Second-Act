/**
 * Read-only setup diagnosis: env, database, migrations, role switching used
 * for RLS, Supabase Auth reachability and demo-account provisioning.
 * Usage: npm run demo:check
 */
import pg from 'pg';
import { readMigrations } from '../src/db/migrations.ts';

let problems = 0;
const ok = (label: string) => console.log(`  ✓ ${label}`);
const bad = (label: string, hint: string) => {
  problems++;
  console.log(`  ✗ ${label}\n      → ${hint}`);
};

console.log('Environment');
for (const name of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_DB_URL']) {
  if (process.env[name]?.trim()) ok(name);
  else bad(`${name} missing`, 'Fill in apps/api/.env (see .env.example).');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  console.log('  · SUPABASE_SERVICE_ROLE_KEY not set (only needed for "npm run demo:seed")');
}

const url = process.env.SUPABASE_URL?.trim();
const anon = process.env.SUPABASE_ANON_KEY?.trim();
if (url && anon) {
  console.log('Supabase Auth');
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } }).catch(() => null);
  if (res?.ok) ok('Auth reachable with the anon/publishable key');
  else bad('Auth not reachable', 'Check SUPABASE_URL and SUPABASE_ANON_KEY.');
}

const dbUrl = process.env.SUPABASE_DB_URL?.trim();
if (dbUrl) {
  console.log('Database');
  const client = new pg.Client({ connectionString: dbUrl, ssl: dbUrl.includes('localhost') ? undefined : { rejectUnauthorized: false } });
  try {
    await client.connect();
    ok('Connected');
    const applied = await client
      .query<{ version: string }>('select version from app_meta.schema_migrations')
      .then((r) => new Set(r.rows.map((x) => x.version)))
      .catch(() => new Set<string>());
    const pending = readMigrations().filter((m) => !applied.has(m.version));
    if (pending.length === 0) ok('All migrations applied');
    else bad(`${pending.length} migration(s) pending`, 'Run "npm run db:migrate".');

    for (const role of ['authenticated', 'service_role']) {
      try {
        await client.query('begin');
        await client.query(`set local role ${role}`);
        await client.query('rollback');
        ok(`Can switch to role ${role} (needed for RLS-scoped queries)`);
      } catch {
        await client.query('rollback').catch(() => undefined);
        bad(`Cannot switch to role ${role}`, 'Use the "postgres" user connection string from Supabase (Session pooler or direct).');
      }
    }

    if (pending.length === 0) {
      const roles = await client.query<{ role: string; n: number }>('select role, count(*)::int as n from public.app_users group by role');
      const byRole = Object.fromEntries(roles.rows.map((r) => [r.role, r.n]));
      for (const r of ['worker', 'mentor', 'recruiter', 'admin']) {
        if (byRole[r]) ok(`Demo ${r} account linked`);
        else bad(`No ${r} account`, 'Run "npm run demo:seed".');
      }
    }
  } catch (e) {
    bad(`Database connection failed: ${(e as Error).message}`, 'Check SUPABASE_DB_URL (use the Session pooler string if your network has no IPv6).');
  } finally {
    await client.end().catch(() => undefined);
  }
}

console.log(problems === 0 ? '\nSetup looks good.' : `\n${problems} problem(s) found.`);
process.exit(problems === 0 ? 0 : 1);
