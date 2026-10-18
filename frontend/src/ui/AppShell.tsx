import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Briefcase,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  Inbox,
  LogOut,
  MoreHorizontal,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useMe } from '../auth/AuthProvider';
import { SECTOR_LABEL } from '../lib/format';
import type { AppRole } from '../lib/types';
import { Badge, cn, Wordmark } from './kit';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Shown in the phone tab bar; the rest go under "More". */
  primary?: boolean;
}

const NAV: Record<AppRole, Array<{ group: string; items: NavItem[] }>> = {
  worker: [
    {
      group: 'Your next act',
      items: [
        { to: '/app/seeker', label: 'Home', icon: Home, end: true, primary: true },
        { to: '/app/seeker/resume', label: 'Resume', icon: FileText, primary: true },
        { to: '/app/seeker/roles', label: 'Roles', icon: Target, primary: true },
        { to: '/app/seeker/skills', label: 'Skills', icon: Sparkles, primary: true },
        { to: '/app/seeker/prove', label: 'Prove a skill', icon: GraduationCap },
      ],
    },
    {
      group: 'People',
      items: [
        { to: '/app/seeker/mentors', label: 'Mentors', icon: Users },
        { to: '/app/seeker/sharing', label: 'Sharing', icon: Share2 },
      ],
    },
    {
      group: 'You',
      items: [
        { to: '/app/seeker/activity', label: 'Activity', icon: Activity },
        { to: '/app/seeker/settings', label: 'Preferences', icon: Settings },
      ],
    },
  ],
  mentor: [{ group: 'Mentoring', items: [{ to: '/app/mentor', label: 'Requests', icon: Inbox, end: true, primary: true }] }],
  recruiter: [
    {
      group: 'Hiring',
      items: [
        { to: '/app/recruiter', label: 'Candidates', icon: Users, end: true, primary: true },
        { to: '/app/recruiter/openings', label: 'Openings', icon: Briefcase, primary: true },
      ],
    },
  ],
  admin: [
    {
      group: 'Operations',
      items: [
        { to: '/app/admin', label: 'System', icon: BarChart3, end: true, primary: true },
        { to: '/app/admin/approvals', label: 'Approvals', icon: ClipboardCheck, primary: true },
        { to: '/app/admin/audit', label: 'Audit trail', icon: ShieldCheck, primary: true },
      ],
    },
  ],
};

const ROLE_LABEL: Record<AppRole, string> = { worker: 'Job seeker', mentor: 'Mentor', recruiter: 'Recruiter', admin: 'Administrator' };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return async () => {
    await signOut();
    navigate('/');
  };
}

function SideNav() {
  const me = useMe();
  return (
    <nav className="space-y-6">
      {NAV[me.role].map((g) => (
        <div key={g.group}>
          <p className="eyebrow px-3 mb-2">{g.group}</p>
          <div className="space-y-0.5">
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 h-10 px-3 rounded-xl text-sm transition-colors',
                    isActive ? 'bg-surface-2 text-fg font-medium' : 'text-fg-muted hover:text-fg hover:bg-surface-2/60',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-accent" /> : null}
                    <item.icon className={cn('w-[18px] h-[18px]', isActive ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted')} strokeWidth={1.75} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AccountCard() {
  const me = useMe();
  const signOut = useSignOut();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-2.5">
      <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold shrink-0">{initials(me.display_name)}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg truncate">{me.display_name}</p>
        <p className="text-[11px] text-fg-subtle truncate">{me.org?.name ?? ROLE_LABEL[me.role]}</p>
      </div>
      <button type="button" onClick={() => void signOut()} className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-3" aria-label="Sign out" title="Sign out">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

function Sidebar() {
  const me = useMe();
  return (
    <div className="h-full flex flex-col px-4 py-6 border-r border-line bg-surface/40">
      <div className="px-2">
        <Wordmark size={26} />
      </div>
      <div className="mt-6 px-2 flex flex-wrap gap-1.5">
        <Badge tone="grey">{ROLE_LABEL[me.role]}</Badge>
        {me.sector ? <Badge tone="accent">{SECTOR_LABEL[me.sector]}</Badge> : null}
        {me.is_synthetic ? <Badge tone="iris">Demo account</Badge> : null}
      </div>
      <div className="flex-1 overflow-y-auto mt-8 -mx-1 px-1">
        <SideNav />
      </div>
      <AccountCard />
    </div>
  );
}

/** Phone: a tab bar for the main places, the rest in a sheet. */
function TabBar() {
  const me = useMe();
  const [more, setMore] = useState(false);
  const all = NAV[me.role].flatMap((g) => g.items);
  const primary = all.filter((i) => i.primary);
  const rest = all.filter((i) => !i.primary);
  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-canvas/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn('flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium', isActive ? 'text-accent' : 'text-fg-subtle')}
            >
              <item.icon className="w-5 h-5" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMore(true)} className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium text-fg-subtle">
            <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
            More
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {more ? (
          <motion.div className="lg:hidden fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMore(false)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">More</p>
                <button type="button" onClick={() => setMore(false)} className="p-2 -mr-2 rounded-lg text-fg-subtle" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {rest.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMore(false)}
                    className={({ isActive }) =>
                      cn('flex flex-col items-center gap-2 rounded-2xl border p-3 text-xs', isActive ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line bg-surface-2 text-fg-muted')
                    }
                  >
                    <item.icon className="w-5 h-5" strokeWidth={1.75} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="mt-4">
                <AccountCard />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-canvas">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[252px] z-30">
        <Sidebar />
      </aside>

      <header className="lg:hidden sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl px-4 h-14 flex items-center justify-between">
        <Wordmark size={24} />
      </header>

      <main className="lg:pl-[252px] pb-24 lg:pb-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12"
        >
          {children ?? <Outlet />}
        </motion.div>
      </main>
      <TabBar />
    </div>
  );
}
