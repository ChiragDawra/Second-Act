import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AppRole } from '../lib/types';
import { colors } from '../lib/theme';
import { Loading } from '../ui/states';
import { useAuth } from './AuthProvider';

/**
 * Navigation guard for a role's screens. This only decides what to SHOW;
 * every request is still authorized by the API and by database RLS.
 */
export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const { session, initializing, me } = useAuth();
  if (initializing || (session && me.isPending)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <Loading label="Checking your account…" />
      </View>
    );
  }
  if (!session || !me.data || me.data.role !== role) return <Redirect href="/" />;
  return <>{children}</>;
}
