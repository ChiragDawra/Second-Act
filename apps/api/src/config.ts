import { z } from 'zod';

/**
 * Server configuration from environment variables (backend/.env, never
 * committed). The service-role key is NOT needed by the API at runtime; it is
 * only read by the seed script.
 */
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_DB_URL: z.string().startsWith('postgres'),
  /** Comma-separated verified emails allowed to onboard as admin (Google sign-in). */
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:8081,http://localhost:19006')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid or missing environment variables: ${fields}. Copy apps/api/.env.example to apps/api/.env and fill it in.`);
  }
  return parsed.data;
}
