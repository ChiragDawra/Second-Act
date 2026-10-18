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
  if (!supabase) throw new ApiError(0, 'not_configured', 'The website is not configured. Copy frontend/.env.example to frontend/.env.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'unauthenticated', 'Sign in to continue.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/api/v1${path}`, {
      method: init.method,
      headers: { authorization: `Bearer ${token}`, ...(init.contentType ? { 'content-type': init.contentType } : {}) },
      body: init.body,
      signal: controller.signal,
    });
  } catch {
    // The browser reports a CORS rejection exactly like a server that is down.
    throw new ApiError(
      0,
      'network',
      `Cannot reach the Second Act API at ${config.apiUrl}. Is it running, and is ${window.location.origin} listed in its CORS_ORIGINS?`,
    );
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; request_id?: string } } | null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? 'http_error', json?.error?.message ?? `Request failed (${res.status}).`, json?.error?.request_id);
  }
  return json as T;
}

/** Calls the API with the signed-in user's access token. The API decides every permission. */
export function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  return call<T>(path, {
    method: options.method ?? 'GET',
    contentType: 'application/json',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** Sends a file or text as the raw body (resume upload). The server reads the type from the bytes. */
export function apiUpload<T>(path: string, body: Blob | string, contentType: string): Promise<T> {
  return call<T>(path, { method: 'POST', contentType, body });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.requestId ? `${error.message} (ref ${error.requestId.slice(0, 8)})` : error.message;
  return error instanceof Error ? error.message : 'Something went wrong.';
}
