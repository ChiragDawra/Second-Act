import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPgDb } from '../src/db/pg.ts';
import type { DemoAccountKey } from '../src/data/demo-v1.ts';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
/** Gitignored. Holds the demo passwords for the facilitator only. */
export const CREDENTIALS_JSON = resolve(REPO_ROOT, 'demo-credentials.local.json');
export const CREDENTIALS_MD = resolve(REPO_ROOT, 'demo-credentials.local.md');

export function requireEnv<K extends string>(...names: K[]): Record<K, string> {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    console.error('Copy apps/api/.env.example to apps/api/.env and fill in the values from your Supabase project.');
    process.exit(1);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]!.trim()])) as Record<K, string>;
}

export function connectDb() {
  const { SUPABASE_DB_URL } = requireEnv('SUPABASE_DB_URL');
  return createPgDb(SUPABASE_DB_URL);
}

export interface DemoCredential {
  key: DemoAccountKey;
  role: string;
  display_name: string;
  email: string;
  password: string;
}

export function readCredentials(): DemoCredential[] {
  if (!existsSync(CREDENTIALS_JSON)) {
    console.error(`No ${CREDENTIALS_JSON}. Run "npm run demo:seed" first.`);
    process.exit(1);
  }
  return (JSON.parse(readFileSync(CREDENTIALS_JSON, 'utf8')) as { accounts: DemoCredential[] }).accounts;
}

export function writeCredentials(accounts: DemoCredential[]) {
  writeFileSync(CREDENTIALS_JSON, JSON.stringify({ generated_at: new Date().toISOString(), accounts }, null, 2));
  const rows = accounts.map((a) => `| ${a.role} | ${a.display_name} | \`${a.email}\` | \`${a.password}\` |`).join('\n');
  writeFileSync(
    CREDENTIALS_MD,
    `# Second Act demo credentials (LOCAL ONLY — never commit or share)\n\n` +
      `Generated ${new Date().toISOString()} by \`npm run demo:seed\`. Re-running the seed rotates these passwords ` +
      `unless DEMO_PASSWORD_* variables are set in apps/api/.env.\n\n` +
      `| Role | Account | Email | Password |\n|---|---|---|---|\n${rows}\n`,
  );
}

export function step(message: string) {
  console.log(`\n▸ ${message}`);
}
