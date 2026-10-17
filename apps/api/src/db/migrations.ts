import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../db/migrations');

export interface MigrationFile {
  version: string;
  name: string;
  sql: string;
}

/** Migration files in filename (timestamp) order. */
export function readMigrations(dir = MIGRATIONS_DIR): MigrationFile[] {
  return readdirSync(dir)
    .filter((f) => /^\d{14}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: f.slice(0, 14), name: f.replace(/\.sql$/, ''), sql: readFileSync(join(dir, f), 'utf8') }));
}
