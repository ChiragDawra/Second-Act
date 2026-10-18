import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { readMigrations } from '../../src/db/migrations.ts';
import { jwtClaimsFor, type Db, type Queryable } from '../../src/db/types.ts';
import { MENTOR_IDS, ORG_IDS, PROFILE_IDS, type DemoAccountKey } from '../../src/data/demo-v1.ts';
import { demoAccountLinks, linkAccounts, upsertWorkerProfiles } from '../../src/seed/accounts.ts';
import { upsertCatalog } from '../../src/seed/catalog.ts';
import { resetScenario } from '../../src/seed/scenario.ts';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Test identities: the four demo accounts plus "intruders" used to prove
 * isolation (another worker, another mentor, a recruiter at another org).
 */
export const USERS = {
  worker: '00000000-0000-4000-a000-000000000001',
  mentor: '00000000-0000-4000-a000-000000000002',
  recruiter: '00000000-0000-4000-a000-000000000003',
  admin: '00000000-0000-4000-a000-000000000004',
  otherWorker: '00000000-0000-4000-a000-000000000011',
  otherMentor: '00000000-0000-4000-a000-000000000012',
  otherRecruiter: '00000000-0000-4000-a000-000000000013',
  unprovisioned: '00000000-0000-4000-a000-000000000099',
  // Self-service (Google) sign-ins with no Second Act account until they onboard.
  newSeeker: '00000000-0000-4000-a000-000000000101',
  newSeeker2: '00000000-0000-4000-a000-000000000106',
  newMentor: '00000000-0000-4000-a000-000000000102',
  newRecruiter: '00000000-0000-4000-a000-000000000103',
  newAdmin: '00000000-0000-4000-a000-000000000104',
  unverified: '00000000-0000-4000-a000-000000000105',
} as const;
export type TestUser = keyof typeof USERS;

function pgliteDb(pg: PGlite): Db {
  const run = <T>(setup: string[], params: unknown[][], fn: (q: Queryable) => Promise<T>) =>
    pg.transaction(async (tx) => {
      for (let i = 0; i < setup.length; i++) {
        await tx.query(setup[i]!, params[i] ?? []);
      }
      return fn({
        query: async (text, values) => {
          const r = await tx.query(text, values as unknown[] | undefined);
          return { rows: r.rows as never[] };
        },
      });
    });

  return {
    asUser: (userId, fn) =>
      run(
        ['set local role authenticated', "select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)"],
        [[], [jwtClaimsFor(userId), userId]],
        fn,
      ),
    asService: (fn) => run(['set local role service_role'], [[]], fn),
    ping: async () => {
      const t = performance.now();
      await pg.query('select 1');
      return Math.round(performance.now() - t);
    },
    close: () => pg.close(),
  };
}

export interface TestDatabase {
  db: Db;
  pg: PGlite;
  reset(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const pg = new PGlite();
  await pg.exec(readFileSync(join(here, 'supabase-shim.sql'), 'utf8'));
  for (const m of readMigrations()) {
    try {
      await pg.exec(m.sql);
    } catch (error) {
      throw new Error(`Migration ${m.name} failed: ${(error as Error).message}`);
    }
  }

  for (const [key, id] of Object.entries(USERS)) {
    await pg.query('insert into auth.users (id, email) values ($1, $2)', [id, `${key}@test.local`]);
  }

  const db = pgliteDb(pg);
  await db.asService(async (q) => {
    await upsertCatalog(q);
    await upsertWorkerProfiles(q);
    const demo: Record<DemoAccountKey, string> = {
      worker: USERS.worker,
      mentor: USERS.mentor,
      recruiter: USERS.recruiter,
      admin: USERS.admin,
    };
    await linkAccounts(q, [
      ...demoAccountLinks(demo),
      { userId: USERS.otherWorker, role: 'worker', displayName: 'Priya Nair', orgId: null, profileId: PROFILE_IDS.priya },
      { userId: USERS.otherMentor, role: 'mentor', displayName: 'Arjun Mehta', orgId: null, mentorId: MENTOR_IDS.arjun },
      { userId: USERS.otherRecruiter, role: 'recruiter', displayName: 'Contoso recruiter', orgId: ORG_IDS.contoso },
    ]);
  });
  await resetScenario(db, { userId: null, role: 'test' });

  return { db, pg, reset: async () => void (await resetScenario(db, { userId: null, role: 'test' })) };
}
