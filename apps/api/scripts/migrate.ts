/**
 * Applies db/migrations/*.sql to the Supabase database in order, once each.
 * Usage: npm run db:migrate
 */
import pg from 'pg';
import { readMigrations } from '../src/db/migrations.ts';
import { requireEnv, step } from './lib.ts';

const { SUPABASE_DB_URL } = requireEnv('SUPABASE_DB_URL');
const client = new pg.Client({ connectionString: SUPABASE_DB_URL, ssl: SUPABASE_DB_URL.includes('localhost') ? undefined : { rejectUnauthorized: false } });

await client.connect();
try {
  await client.query('create schema if not exists app_meta');
  await client.query('create table if not exists app_meta.schema_migrations (version text primary key, name text not null, applied_at timestamptz not null default now())');
  const applied = new Set((await client.query<{ version: string }>('select version from app_meta.schema_migrations')).rows.map((r) => r.version));

  for (const m of readMigrations()) {
    if (applied.has(m.version)) {
      console.log(`  = ${m.name} (already applied)`);
      continue;
    }
    step(`Applying ${m.name}`);
    await client.query('begin');
    try {
      await client.query(m.sql);
      await client.query('insert into app_meta.schema_migrations (version, name) values ($1, $2)', [m.version, m.name]);
      await client.query('commit');
      console.log('  ✓ applied');
    } catch (error) {
      await client.query('rollback');
      console.error(`  ✗ ${m.name} failed: ${(error as Error).message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
