import { createClient } from '@supabase/supabase-js';
import { sha256 } from '../engine/hash.ts';

/** Resolves a bearer token to a Supabase Auth user id, or null if invalid. */
export interface AuthVerifier {
  verify(token: string): Promise<{ userId: string } | null>;
}

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const CACHE_MS = 30_000;

/**
 * Verifies access tokens with Supabase Auth itself, so signed-out or revoked
 * sessions stop working. Results are cached briefly by token hash; the token
 * is never logged or stored.
 */
export function createSupabaseVerifier(url: string, anonKey: string): AuthVerifier {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const cache = new Map<string, { userId: string; until: number }>();

  return {
    async verify(token) {
      if (!JWT_SHAPE.test(token) || token.length > 4096) return null;
      const key = sha256(token);
      const hit = cache.get(key);
      const now = Date.now();
      if (hit && hit.until > now) return { userId: hit.userId };

      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) {
        cache.delete(key);
        return null;
      }
      if (cache.size > 1000) cache.clear();
      cache.set(key, { userId: data.user.id, until: now + CACHE_MS });
      return { userId: data.user.id };
    },
  };
}

/** Test verifier: fixed token → user id map. Never wired into the server. */
export function createStaticVerifier(tokens: Record<string, string>): AuthVerifier {
  return {
    async verify(token) {
      const userId = tokens[token];
      return userId ? { userId } : null;
    },
  };
}
