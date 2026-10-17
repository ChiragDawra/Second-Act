/**
 * Database access contract.
 *
 * Every query runs inside a transaction in one of two contexts:
 *   - asUser: `SET LOCAL ROLE authenticated` with the caller's JWT claims, so
 *     PostgreSQL row-level security applies exactly as it would for the
 *     Supabase Data API. Used for all reads on behalf of a signed-in user.
 *   - asService: `SET LOCAL ROLE service_role`. Used only for writes after the
 *     API has made its own authorization decision, and for seed/maintenance.
 */
export interface QueryResult<T> {
  rows: T[];
}

export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export interface Db {
  asUser<T>(userId: string, fn: (q: Queryable) => Promise<T>): Promise<T>;
  asService<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  /** Round-trip latency in milliseconds. */
  ping(): Promise<number>;
  close(): Promise<void>;
}

export function jwtClaimsFor(userId: string): string {
  return JSON.stringify({ sub: userId, role: 'authenticated' });
}
