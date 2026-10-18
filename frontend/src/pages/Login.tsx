import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, KeyRound, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { safeNext, useAuth } from '../auth/AuthProvider';
import { missingConfig } from '../lib/config';
import { PERSONAS } from '../components/landing/personas';
import { ResumeReader } from '../components/landing/ResumeReader';
import { Button, Field, Notice, Wordmark } from '../ui/kit';

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const DEMO = [
  { label: 'Worker · Harpreet', email: 'harpreet.worker@demo.secondact.test' },
  { label: 'Mentor · Meera', email: 'meera.mentor@demo.secondact.test' },
  { label: 'Recruiter · Rohan', email: 'rohan.recruiter@demo.secondact.test' },
  { label: 'Admin', email: 'demo.admin@demo.secondact.test' },
];

export default function Login() {
  const { session, signInWithGoogle, signInDemo } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [busy, setBusy] = useState<'google' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (session) return <Navigate to={next} replace />;

  const google = async () => {
    setError(null);
    setBusy('google');
    try {
      await signInWithGoogle(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
      setBusy(null);
    }
  };

  const demo = async () => {
    setError(null);
    setBusy('demo');
    try {
      await signInDemo(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-canvas">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-line bg-surface/50 p-12 grain">
        <div className="absolute inset-0 spotlight" />
        <Link to="/" className="relative w-fit" aria-label="Second Act home">
          <Wordmark size={28} />
        </Link>
        <div className="relative max-w-md">
          <p className="eyebrow text-accent">The nearest role, not the hardest restart</p>
          <h1 className="headline text-6xl mt-5">
            Your experience <em>already counts.</em>
          </h1>
          <p className="text-fg-muted mt-5 leading-relaxed">We show you where — with the sentence from your own resume behind every skill.</p>
          <div className="mt-10 rotate-[-1.5deg]">
            <ResumeReader persona={PERSONAS[2]} legend animate={false} />
          </div>
        </div>
        <div className="relative flex flex-wrap gap-x-6 gap-y-2 text-xs text-fg-subtle">
          {[
            { icon: Sparkles, text: 'Goals stay goals' },
            { icon: Target, text: 'Fit, never odds' },
            { icon: ShieldCheck, text: 'You approve every share' },
          ].map((x) => (
            <span key={x.text} className="inline-flex items-center gap-1.5">
              <x.icon className="w-3.5 h-3.5 text-accent" /> {x.text}
            </span>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-subtle hover:text-fg mb-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to the site
          </Link>
          <div className="lg:hidden mb-8">
            <Wordmark size={28} />
          </div>
          <h2 className="headline text-5xl">
            Take <em>the stage.</em>
          </h2>
          <p className="text-sm text-fg-muted mt-4 leading-relaxed">Sign in, or create an account with Google. Then tell us whether you are looking for work, mentoring, or hiring.</p>

          {missingConfig.length > 0 ? (
            <div className="mt-6">
              <Notice tone="warn" title="Setup needed">
                Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and set {missingConfig.join(', ')}.
              </Notice>
            </div>
          ) : null}

          <Button kind="contrast" size="lg" className="w-full mt-8" onClick={google} loading={busy === 'google'} icon={<GoogleMark />} disabled={missingConfig.length > 0}>
            Continue with Google
          </Button>

          {error ? (
            <div className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          ) : null}

          <p className="text-[11px] text-fg-subtle mt-4 leading-relaxed">
            We use your Google name and email to create your account. We never post to Google or read your contacts. Mentor and recruiter
            accounts are checked by an administrator before they see anyone&rsquo;s information.
          </p>

          <div className="mt-10 border-t border-line pt-4">
            <button type="button" onClick={() => setDemoOpen((v) => !v)} className="w-full flex items-center justify-between text-xs font-semibold text-fg-subtle hover:text-fg">
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Demo accounts (facilitators)
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${demoOpen ? 'rotate-180' : ''}`} />
            </button>
            {demoOpen ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {DEMO.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => setEmail(d.email)}
                      className="px-2.5 py-1 rounded-full border border-line bg-surface text-[11px] font-semibold text-fg-muted hover:border-accent/40"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  hint="From demo-credentials.local.md. This tab keeps its own session."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void demo();
                  }}
                />
                <Button kind="contrast" className="w-full" onClick={demo} loading={busy === 'demo'} disabled={!email || !password}>
                  Sign in to demo account
                </Button>
              </div>
            ) : null}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
