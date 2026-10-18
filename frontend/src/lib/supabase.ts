import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { config, missingConfig } from './config';

/**
 * Sessions live in localStorage, so a Google sign-in survives new tabs. A tab that signs in with a
 * demo account switches itself to sessionStorage, so a facilitator can run the four demo roles in
 * four tabs without one sign-in replacing another.
 */
const DEMO_TAB_FLAG = 'second-act.demo-tab';

export const isDemoTab = () => {
  try {
    return window.sessionStorage.getItem(DEMO_TAB_FLAG) === '1';
  } catch {
    return false;
  }
};

export const markDemoTab = (on: boolean) => {
  try {
    if (on) window.sessionStorage.setItem(DEMO_TAB_FLAG, '1');
    else window.sessionStorage.removeItem(DEMO_TAB_FLAG);
  } catch {
    // Storage blocked (private mode): the session simply will not persist.
  }
};

const store = (): Storage => (isDemoTab() ? window.sessionStorage : window.localStorage);

const tabAwareStorage: SupportedStorage = {
  getItem: (key) => {
    try {
      return store().getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      store().setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key) => {
    try {
      store().removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const supabase =
  missingConfig.length === 0
    ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: tabAwareStorage },
      })
    : null;
