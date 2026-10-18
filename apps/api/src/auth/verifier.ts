import { createClient } from '@supabase/supabase-js';
import { sha256 } from '../engine/hash.ts';

/** Who the token belongs to, as asserted by Supabase Auth. Never trusted for authorization by itself. */
export interface VerifiedIdentity {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  /** Display name from the identity provider (Google), used only as a suggestion. */
  name: string | null;
}

/** Resolves a bearer token to a Supabase Auth identity, or null if invalid. */
export interface AuthVerifier {
  verify(token: string): Promise<VerifiedIdentity | null>;
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
  const cache = new Map<string, { identity: VerifiedIdentity; until: number }>();

  return {
    async verify(token) {
      if (!JWT_SHAPE.test(token) || token.length > 4096) return null;
      const key = sha256(token);
      const hit = cache.get(key);
      const now = Date.now();
      if (hit && hit.until > now) return hit.identity;

      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) {
        cache.delete(key);
        return null;
      }
      const meta = (data.user.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
      const rawName = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : null;
      const identity: VerifiedIdentity = {
        userId: data.user.id,
        email: data.user.email ?? null,
        emailVerified: Boolean(data.user.email_confirmed_at),
        name: rawName ? rawName.slice(0, 80) : null,
      };
      if (cache.size > 1000) cache.clear();
      cache.set(key, { identity, until: now + CACHE_MS });
      return identity;
    },
  };
}

/** Test verifier: fixed token → identity map. Never wired into the server. */
export function createStaticVerifier(tokens: Record<string, string | VerifiedIdentity>): AuthVerifier {
  return {
    async verify(token) {
      const entry = tokens[token];
      if (!entry) return null;
      return typeof entry === 'string' ? { userId: entry, email: null, emailVerified: false, name: null } : entry;
    },
  };
}
