import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Me } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  initializing: boolean;
  /** Server-resolved identity and role. The client never chooses its role. */
  me: UseQueryResult<Me>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  // Without configuration there is no session to restore.
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
    queryFn: () => api<Me>('/me'),
    enabled: !!session,
    retry: 1,
    staleTime: 60_000,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      me,
      async signIn(email, password) {
        if (!supabase) throw new Error('App not configured.');
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message);
      },
      async signOut() {
        queryClient.clear();
        await supabase?.auth.signOut({ scope: 'local' });
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

/** The signed-in identity; only call inside role-guarded screens. */
export function useMe(): Me {
  const { me } = useAuth();
  if (!me.data) throw new Error('No resolved identity');
  return me.data;
}
