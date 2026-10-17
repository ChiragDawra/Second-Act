import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string) => new ApiError(400, code, message);
export const forbidden = (message = 'You are not authorized to access this resource.') => new ApiError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new ApiError(404, 'not_found', message);
export const conflict = (code: string, message: string) => new ApiError(409, code, message);

/** Maps PostgreSQL error codes raised by RLS, triggers and constraints. */
function fromDatabase(error: unknown): ApiError | null {
  const code = (error as { code?: unknown })?.code;
  if (typeof code !== 'string' || !/^[0-9A-Z]{5}$/.test(code)) return null;
  switch (code) {
    case '42501':
      return forbidden();
    case 'P0002':
      return notFound();
    case '23505':
      return conflict('conflict', 'That action conflicts with an existing record.');
    case '23514':
    case '23502':
    case '23503':
      return conflict('invariant_violation', 'That change would break a data rule and was rejected.');
    case '22P02':
      return badRequest('invalid_input', 'Invalid identifier or value.');
    default:
      return null;
  }
}

/** Consistent, safe error body: { error: { code, message, request_id } }. Never leaks internals. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = res.locals.requestId as string | undefined;
  let api: ApiError;
  if (err instanceof ApiError) {
    api = err;
  } else if (err instanceof ZodError) {
    api = badRequest('validation_failed', err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
  } else if ((err as { type?: string })?.type === 'entity.too.large') {
    api = new ApiError(413, 'payload_too_large', 'Request body is too large.');
  } else if ((err as { type?: string })?.type === 'entity.parse.failed') {
    api = badRequest('invalid_json', 'Request body is not valid JSON.');
  } else {
    api = fromDatabase(err) ?? new ApiError(500, 'internal_error', 'Something went wrong. Try again.');
  }
  if (api.status >= 500) {
    // Log the code and route only — never request bodies, tokens or profile text.
    console.error(`[${requestId}] ${req.method} ${req.path} -> ${api.status} ${(err as { code?: string })?.code ?? (err as Error)?.name}`);
  }
  res.status(api.status).json({ error: { code: api.code, message: api.message, request_id: requestId } });
};
