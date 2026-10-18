/**
 * Public website configuration. Vite bundles every VITE_* value into the page, so nothing here
 * may be secret: the Supabase URL, the publishable (anon) key and the API URL only.
 */
export const config = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? '').trim(),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').trim().replace(/\/$/, ''),
};

export const missingConfig = Object.entries({
  VITE_SUPABASE_URL: config.supabaseUrl,
  VITE_SUPABASE_ANON_KEY: config.supabaseAnonKey,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);
