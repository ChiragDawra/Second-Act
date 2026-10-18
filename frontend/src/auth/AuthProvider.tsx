import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { markDemoTab, supabase } from '../lib/supabase';
import type { AppRole, Me, MeState } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  initializing: boolean;
  /** Server-resolved account state. The website never decides a role itself. */
  me: UseQueryResult<MeState>;
  signInWithGoogle(next?: string): Promise<void>;
  signInDemo(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(supabase !== null);
  const currentUser = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const apply = (next: Session | null) => {
      const nextUser = next?.user.id ?? null;
      // Never let one account's cached data survive into another account's session.
      if (nextUser !== currentUser.current) queryClient.clear();
      currentUser.current = nextUser;
      setSession(next);
    };
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session);
      setInitializing(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => apply(next));
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const me = useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: () => api<MeState>('/me'),
    enabled: !!session,
    retry: 1,
    staleTime: 30_000,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      me,
      async signInWithGoogle(next) {
        if (!supabase) throw new Error('Website not configured.');
        markDemoTab(false);
        const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
        if (error) throw new Error(error.message);
      },
      async signInDemo(email, password) {
        if (!supabase) throw new Error('Website not configured.');
        markDemoTab(true);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          markDemoTab(false);
          throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message);
        }
      },
      async signOut() {
        queryClient.clear();
        await supabase?.auth.signOut({ scope: 'local' });
        markDemoTab(false);
      },
    }),
    [session, initializing, me, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** The active account; only call inside routes guarded by RequireAccount. */
export function useMe(): Me {
  const { me } = useAuth();
  if (!me.data || me.data.status !== 'active') throw new Error('No active account');
  return me.data;
}

export const ROLE_HOME: Record<AppRole, string> = {
  worker: '/app/seeker',
  mentor: '/app/mentor',
  recruiter: '/app/recruiter',
  admin: '/app/admin',
};
