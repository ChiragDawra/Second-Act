import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn, LinkButton, Wordmark } from '../../ui/kit';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#demo', label: 'See it work' },
  { href: '#principles', label: 'Principles' },
  { href: '#who', label: 'Who it’s for' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={cn('fixed top-0 inset-x-0 z-40 transition-colors', scrolled || open ? 'bg-canvas/85 backdrop-blur-xl border-b border-line' : 'border-b border-transparent')}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/" aria-label="Second Act home">
          <Wordmark size={26} />
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-fg-muted hover:text-fg transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          {signedIn ? (
            <LinkButton to="/app" size="sm">
              Open my dashboard
            </LinkButton>
          ) : (
            <>
              <LinkButton to="/login" kind="ghost" size="sm">
                Sign in
              </LinkButton>
              <LinkButton to="/login" size="sm">
                Start free
              </LinkButton>
            </>
          )}
        </div>
        <button type="button" className="md:hidden p-2 -mr-2 text-fg-muted" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden border-t border-line">
            <div className="px-4 py-4 flex flex-col gap-1">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-fg-muted">
                  {l.label}
                </a>
              ))}
              <LinkButton to={signedIn ? '/app' : '/login'} className="mt-3">
                {signedIn ? 'Open my dashboard' : 'Start free'}
              </LinkButton>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
