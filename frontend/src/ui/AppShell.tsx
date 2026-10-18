import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Briefcase,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
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
import type { AppRole } from '../lib/types';
import { Badge, cn } from './kit';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: Record<AppRole, NavItem[]> = {
  worker: [
    { to: '/app/seeker', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/seeker/resume', label: 'Resume', icon: FileText },
    { to: '/app/seeker/skills', label: 'Skills', icon: Sparkles },
    { to: '/app/seeker/roles', label: 'Roles', icon: Target },
    { to: '/app/seeker/prove', label: 'Prove a skill', icon: GraduationCap },
    { to: '/app/seeker/mentors', label: 'Mentors', icon: Users },
    { to: '/app/seeker/sharing', label: 'Sharing', icon: Share2 },
    { to: '/app/seeker/activity', label: 'Activity', icon: Activity },
    { to: '/app/seeker/settings', label: 'Preferences', icon: Settings },
  ],
  mentor: [{ to: '/app/mentor', label: 'Requests', icon: Inbox, end: true }],
  recruiter: [
    { to: '/app/recruiter', label: 'Candidates', icon: Users, end: true },
    { to: '/app/recruiter/openings', label: 'Openings', icon: Briefcase },
  ],
  admin: [
    { to: '/app/admin', label: 'System', icon: BarChart3, end: true },
    { to: '/app/admin/approvals', label: 'Approvals', icon: ClipboardCheck },
    { to: '/app/admin/audit', label: 'Audit trail', icon: ShieldCheck },
  ],
};

const ROLE_LABEL: Record<AppRole, string> = { worker: 'Job seeker', mentor: 'Mentor', recruiter: 'Recruiter', admin: 'Administrator' };

const SECTOR_LABEL: Record<string, string> = {
  qa: 'QA & testing',
  'banking-ba': 'Banking ops & BA',
  support: 'Customer & IT support',
  data: 'Data & reporting',
};

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-sap-500 flex items-center justify-center text-white font-bold text-sm shadow-glow-sap">II</div>
      <div className="leading-tight">
        <p className="font-extrabold text-white tracking-tight">Second Act</p>
        <p className="text-[10px] font-mono text-ink-400">The nearest role</p>
      </div>
    </div>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe();
  return (
    <nav className="flex flex-col gap-1">
      {NAV[me.role].map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:text-white hover:bg-white/5',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn('w-4 h-4', isActive ? 'text-sap-400' : 'text-ink-400')} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function AccountCard() {
  const me = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const initials = me.display_name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-sap-500/20 text-sap-300 flex items-center justify-center text-xs font-bold">{initials}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{me.display_name}</p>
          <p className="text-[11px] text-ink-400 truncate">{me.org?.name ?? ROLE_LABEL[me.role]}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          navigate('/');
        }}
        className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-semibold text-ink-300 hover:text-white py-1.5 rounded-lg hover:bg-white/5"
      >
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </button>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe();
  return (
    <div className="h-full flex flex-col bg-ink-950 px-4 py-5">
      <Brand />
      <div className="mt-6 mb-4 flex flex-wrap gap-1.5">
        <Badge tone="dark" className="bg-white/10 border-white/10">
          {ROLE_LABEL[me.role]}
        </Badge>
        {me.sector ? <Badge tone="sap">{SECTOR_LABEL[me.sector] ?? me.sector}</Badge> : null}
        {me.is_synthetic ? <Badge tone="violet">Demo account</Badge> : null}
      </div>
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <SideNav onNavigate={onNavigate} />
      </div>
      <AccountCard />
    </div>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <div className="min-h-screen bg-surface-subtle">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
        <Sidebar />
      </aside>

      <header className="lg:hidden sticky top-0 z-30 glass-nav px-4 py-3 flex items-center justify-between">
        <button type="button" onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-ink-100" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-extrabold tracking-tight">Second Act</span>
        <span className="w-8" />
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div className="lg:hidden fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
            <motion.div className="absolute inset-y-0 left-0 w-72" initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }} transition={{ type: 'tween', duration: 0.2 }}>
              <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-3 z-10 p-1.5 rounded-lg text-ink-300 hover:bg-white/10" aria-label="Close menu">
                <X className="w-4 h-4" />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="lg:pl-64">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10"
        >
          {children ?? <Outlet />}
        </motion.div>
      </main>
    </div>
  );
}
