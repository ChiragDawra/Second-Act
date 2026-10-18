import { Clock, LogOut, RefreshCw, XCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button, Card, FullPageLoader } from '../ui/kit';

const ROLE: Record<string, string> = { mentor: 'mentor', recruiter: 'recruiter', worker: 'job seeker', admin: 'administrator' };

/** Shown while a mentor or recruiter account waits for an admin decision (or was not approved). */
export default function Pending() {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  if (me.isPending) return <FullPageLoader />;
  const state = me.data;
  if (!state || state.status === 'active') return <Navigate to="/app" replace />;
  if (state.status === 'needs_onboarding') return <Navigate to="/onboarding" replace />;

  const rejected = state.status === 'rejected';
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-subtle">
      <Card className="max-w-md w-full text-center p-8">
        <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${rejected ? 'bg-red-50 text-red-600' : 'bg-gapAmber-50 text-gapAmber-600'}`}>
          {rejected ? <XCircle className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
        </div>
        <h1 className="text-xl font-extrabold text-ink-950 mt-5">{rejected ? 'Your account was not approved' : 'Waiting for approval'}</h1>
        <p className="text-sm text-ink-500 mt-2 leading-relaxed">
          {rejected
            ? 'An administrator did not approve this account. If you think this is a mistake, contact the Second Act team.'
            : `Thanks, ${state.display_name.split(' ')[0]}. An administrator checks every ${ROLE[state.role] ?? state.role} account before it can see anyone's information. This page updates when you are approved.`}
        </p>
        <div className="flex gap-2 justify-center mt-6">
          {!rejected ? (
            <Button kind="secondary" icon={<RefreshCw className="w-4 h-4" />} loading={me.isFetching} onClick={() => void me.refetch()}>
              Check again
            </Button>
          ) : null}
          <Button
            kind="ghost"
            icon={<LogOut className="w-4 h-4" />}
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}
