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

async function call<T>(path: string, init: { method: Method; contentType?: string; body?: BodyInit }): Promise<T> {
  if (!supabase) throw new ApiError(0, 'not_configured', 'The app is not configured. See apps/mobile/.env.example.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'unauthenticated', 'Sign in to continue.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/api/v1${path}`, {
      method: init.method,
      headers: { authorization: `Bearer ${token}`, ...(init.contentType ? { 'content-type': init.contentType } : {}) },
      body: init.body,
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

/**
 * Calls the Second Act API with the signed-in user's Supabase access token.
 * The API decides every permission; the app never sends a role.
 */
export function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  return call<T>(path, {
    method: options.method ?? 'GET',
    contentType: 'application/json',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** Sends a file or text as the raw request body (resume upload). The server reads the type from the bytes. */
export function apiUpload<T>(path: string, body: string | ArrayBuffer | Blob, contentType: string): Promise<T> {
  return call<T>(path, { method: 'POST', contentType, body: body as BodyInit });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.requestId ? `${error.message} (ref ${error.requestId.slice(0, 8)})` : error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
