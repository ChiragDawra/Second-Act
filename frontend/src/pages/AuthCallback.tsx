import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { safeNext, useAuth } from '../auth/AuthProvider';
import { FullPageLoader, Notice } from '../ui/kit';

/**
 * Google returns here. The Supabase client exchanges the one-time code for a session on page
 * load (PKCE); this page only waits for that and then hands over to the account router.
 */
export default function AuthCallback() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const providerError = params.get('error_description') ?? params.get('error');
  const next = safeNext(params.get('next'));
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 12_000);
    return () => clearTimeout(t);
  }, []);

  if (session) return <Navigate to={next} replace />;

  if (providerError || slow) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
        <div className="max-w-md w-full space-y-4">
          <Notice tone="danger" title="Sign-in did not complete">
            {providerError ?? 'Google did not return a session. Check that Google sign-in is enabled for this Supabase project and that this address is an allowed redirect URL.'}
          </Notice>
          <Link to="/login" className="text-sm font-semibold text-accent hover:underline">
            Try again
          </Link>
        </div>
      </div>
    );
  }
  return <FullPageLoader label="Finishing sign-in…" />;
}
