import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { AppRole } from '../lib/types';
import { Button, ErrorState, FullPageLoader } from '../ui/kit';
import { ROLE_HOME, useAuth } from './AuthProvider';

/** Signed in at all? Otherwise go to /login and come back afterwards. */
export function RequireSession() {
  const { session, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageLoader label="Checking your session…" />;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}

/**
 * Routes by account state, as decided by the API:
 * not onboarded -> /onboarding, pending or rejected -> /pending, active -> the page.
 */
export function RequireAccount() {
  const { me, signOut } = useAuth();
  if (me.isPending) return <FullPageLoader label="Loading your account…" />;
  if (me.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-subtle">
        <div className="max-w-md w-full space-y-3">
          <ErrorState error={me.error} onRetry={() => void me.refetch()} />
          <Button kind="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }
  const state = me.data;
  if (state.status === 'needs_onboarding') return <Navigate to="/onboarding" replace />;
  if (state.status === 'pending' || state.status === 'rejected') return <Navigate to="/pending" replace />;
  return <Outlet />;
}

/** Only the given role may see this branch; anyone else is sent to their own dashboard. */
export function RequireRole({ role }: { role: AppRole }) {
  const { me } = useAuth();
  if (me.data?.status !== 'active') return <Navigate to="/app" replace />;
  if (me.data.role !== role) return <Navigate to={ROLE_HOME[me.data.role]} replace />;
  return <Outlet />;
}

/** /app -> the signed-in role's home. */
export function RoleRedirect() {
  const { me } = useAuth();
  if (me.data?.status !== 'active') return <FullPageLoader />;
  return <Navigate to={ROLE_HOME[me.data.role]} replace />;
}
