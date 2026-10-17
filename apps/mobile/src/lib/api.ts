import { config } from './config';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PATCH';

/**
 * Calls the Second Act API with the signed-in user's Supabase access token.
 * The API decides every permission; the app never sends a role.
 */
export async function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  if (!supabase) throw new ApiError(0, 'not_configured', 'The app is not configured. See apps/mobile/.env.example.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'unauthenticated', 'Sign in to continue.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      'network',
      `Cannot reach the Second Act API at ${config.apiUrl}. Check that it is running and reachable from this device.`,
    );
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; request_id?: string } } | null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'http_error',
      json?.error?.message ?? `Request failed (${res.status}).`,
      json?.error?.request_id,
    );
  }
  return json as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.requestId ? `${error.message} (ref ${error.requestId.slice(0, 8)})` : error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
