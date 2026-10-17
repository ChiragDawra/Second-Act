/**
 * Public client configuration. Only EXPO_PUBLIC_* values are bundled, so
 * nothing here may be secret: the Supabase URL, the publishable (anon) key
 * and the API URL. Passwords and the service-role key never reach the app.
 */
export const config = {
  supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim(),
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, ''),
};

export const missingConfig = Object.entries({
  EXPO_PUBLIC_SUPABASE_URL: config.supabaseUrl,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: config.supabaseAnonKey,
  EXPO_PUBLIC_API_URL: config.apiUrl,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);
