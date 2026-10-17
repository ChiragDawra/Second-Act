import request from 'supertest';
import { createApp } from '../../src/app.ts';
import { createStaticVerifier } from '../../src/auth/verifier.ts';
import { createTestDatabase, USERS, type TestDatabase, type TestUser } from './test-db.ts';

/** Bearer tokens accepted by the static verifier: `token-<user key>`. */
export const tokenFor = (user: TestUser) => `token-${user}`;

export interface TestApi {
  t: TestDatabase;
  /** Request helpers authenticated as the given test user. */
  as(user: TestUser): {
    get(path: string): request.Test;
    post(path: string, body?: object): request.Test;
    patch(path: string, body?: object): request.Test;
  };
  anon: ReturnType<typeof request>;
}

export async function createTestApi(): Promise<TestApi> {
  const t = await createTestDatabase();
  const tokens = Object.fromEntries(Object.entries(USERS).map(([k, id]) => [tokenFor(k as TestUser), id]));
  const app = createApp({ db: t.db, auth: createStaticVerifier(tokens), corsOrigins: [] });
  const agent = request(app);
  return {
    t,
    anon: agent,
    as: (user) => {
      const auth = `Bearer ${tokenFor(user)}`;
      return {
        get: (path) => agent.get(path).set('authorization', auth),
        post: (path, body = {}) => agent.post(path).set('authorization', auth).send(body),
        patch: (path, body = {}) => agent.patch(path).set('authorization', auth).send(body),
      };
    },
  };
}
