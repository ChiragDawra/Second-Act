import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { config, missingConfig } from './config';

const isWeb = Platform.OS === 'web';
const hasWindow = typeof window !== 'undefined';

/**
 * On the web each browser tab keeps its own Supabase session, so a presenter
 * can run worker, mentor, recruiter and admin side by side in four tabs.
 * sessionStorage is per tab, and a per-tab storage key keeps supabase-js's
 * BroadcastChannel (named after the key) from syncing sessions across tabs.
 * On iOS/Android the session persists in AsyncStorage on that device.
 */
function tabScopedKey(): string {
  if (!isWeb || !hasWindow) return 'second-act-auth';
  try {
    let id = window.sessionStorage.getItem('second-act-tab-id');
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      window.sessionStorage.setItem('second-act-tab-id', id);
    }
    return `second-act-auth-${id}`;
  } catch {
    return 'second-act-auth';
  }
}

const webSessionStorage = {
  getItem: (key: string) => (hasWindow ? window.sessionStorage.getItem(key) : null),
  setItem: (key: string, value: string) => {
    if (hasWindow) window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (hasWindow) window.sessionStorage.removeItem(key);
  },
};

export const supabase: SupabaseClient | null =
  missingConfig.length === 0
    ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storage: isWeb ? webSessionStorage : AsyncStorage,
          storageKey: tabScopedKey(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Refresh tokens only while the app is in the foreground (Supabase guidance for React Native).
if (supabase && !isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
