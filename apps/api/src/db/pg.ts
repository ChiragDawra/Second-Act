import pg from 'pg';
import { jwtClaimsFor, type Db, type Queryable } from './types.ts';

/**
 * node-postgres implementation for Supabase (use the Session pooler or a
 * direct connection string; both support SET LOCAL inside transactions).
 */
export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

  async function inTransaction<T>(setup: (c: pg.PoolClient) => Promise<void>, fn: (q: Queryable) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await setup(client);
      const result = await fn({
        query: async (text, params) => {
          const r = await client.query(text, params as unknown[] | undefined);
          return { rows: r.rows };
        },
      });
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    asUser: (userId, fn) =>
      inTransaction(async (c) => {
        await c.query('set local role authenticated');
        await c.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
          jwtClaimsFor(userId),
          userId,
        ]);
      }, fn),
    asService: (fn) =>
      inTransaction(async (c) => {
        await c.query('set local role service_role');
      }, fn),
    ping: async () => {
      const started = performance.now();
      await pool.query('select 1');
      return Math.round(performance.now() - started);
    },
    close: () => pool.end(),
  };
}
