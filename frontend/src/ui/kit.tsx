import { clsx, type ClassValue } from 'clsx';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { errorMessage } from '../lib/api';
import type { Eligibility, Readiness, SkillStatus } from '../lib/types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const LEVEL_LABELS = ['None', 'Aware', 'Practiced', 'Independent', 'Expert'] as const;

// ------------------------------------------------------------------ buttons
type ButtonKind = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';
const BUTTON: Record<ButtonKind, string> = {
  primary: 'bg-sap-500 hover:bg-sap-600 text-white shadow-sm shadow-sap-500/20',
  dark: 'bg-ink-950 hover:bg-ink-800 text-white shadow-sm',
  secondary: 'bg-white hover:bg-ink-50 text-ink-900 border border-ink-200',
  ghost: 'bg-transparent hover:bg-ink-100 text-ink-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

export function Button({
  kind = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-sap-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3.5 text-base',
        BUTTON[kind],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// -------------------------------------------------------------------- cards
export function Card({ className, children, tone }: { className?: string; children: ReactNode; tone?: 'default' | 'sap' | 'amber' | 'muted' | 'dark' }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5',
        (!tone || tone === 'default') && 'bg-white border-ink-200/70 shadow-subtle',
        tone === 'sap' && 'bg-sap-50/60 border-sap-200',
        tone === 'amber' && 'bg-gapAmber-50 border-gapAmber-200',
        tone === 'muted' && 'bg-ink-50 border-ink-200/70',
        tone === 'dark' && 'bg-ink-950 border-ink-800 text-white',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-base font-bold text-ink-950 tracking-tight">{title}</h2>
        {subtitle ? <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
      <div>
        {eyebrow ? <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-sap-600 mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink-950">{title}</h1>
        {subtitle ? <p className="text-sm text-ink-500 mt-2 max-w-2xl leading-relaxed">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: 'sap' | 'amber' | 'green' | 'ink' }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-mono uppercase tracking-wider text-ink-400">{label}</p>
      <p
        className={cn(
          'text-2xl font-extrabold mt-1 tracking-tight',
          accent === 'sap' && 'text-sap-600',
          accent === 'amber' && 'text-gapAmber-600',
          accent === 'green' && 'text-emerald-600',
          (!accent || accent === 'ink') && 'text-ink-950',
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-ink-500 mt-1">{hint}</p> : null}
    </Card>
  );
}

// ------------------------------------------------------------------- badges
type Tone = 'sap' | 'amber' | 'green' | 'red' | 'grey' | 'violet' | 'dark';
const TONE: Record<Tone, string> = {
  sap: 'bg-sap-50 text-sap-700 border-sap-200',
  amber: 'bg-gapAmber-50 text-gapAmber-700 border-gapAmber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  grey: 'bg-ink-100 text-ink-600 border-ink-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  dark: 'bg-ink-900 text-white border-ink-900',
};

export function Badge({ children, tone = 'grey', mono, className }: { children: ReactNode; tone?: Tone; mono?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap',
        mono && 'font-mono uppercase tracking-wider text-[10px]',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS: Record<SkillStatus, { label: string; tone: Tone }> = {
  verified: { label: 'Verified', tone: 'green' },
  self_reported: { label: 'Self-reported', tone: 'sap' },
  inferred: { label: 'Inferred · review', tone: 'amber' },
  unknown: { label: 'Unknown', tone: 'grey' },
  not_demonstrated: { label: 'Not demonstrated', tone: 'red' },
};
export const StatusBadge = ({ status }: { status: SkillStatus }) => <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;

const READINESS: Record<Readiness, { label: string; tone: Tone }> = {
  ready: { label: 'Ready', tone: 'green' },
  needs_validation: { label: 'Needs validation', tone: 'amber' },
  blocked: { label: 'Blocked', tone: 'red' },
};
export const ReadinessBadge = ({ status }: { status: Readiness }) => <Badge tone={READINESS[status].tone}>{READINESS[status].label}</Badge>;

const ELIGIBILITY: Record<Eligibility, { label: string; tone: Tone }> = {
  eligible: { label: 'Eligible', tone: 'green' },
  stretch: { label: 'Stretch', tone: 'amber' },
  filtered: { label: 'Filtered out', tone: 'grey' },
  data_error: { label: 'Data error', tone: 'red' },
};
export const EligibilityBadge = ({ value }: { value: Eligibility }) => <Badge tone={ELIGIBILITY[value].tone}>{ELIGIBILITY[value].label}</Badge>;

export function Provenance({ kind }: { kind: 'live' | 'synthetic' | 'simulated' | 'planned' | 'pilot' | 'employer' }) {
  const map = {
    live: { label: 'Live', tone: 'green' as Tone },
    synthetic: { label: 'Synthetic', tone: 'violet' as Tone },
    simulated: { label: 'Simulated', tone: 'violet' as Tone },
    planned: { label: 'Planned', tone: 'grey' as Tone },
    pilot: { label: 'Pilot data', tone: 'amber' as Tone },
    employer: { label: 'Posted by employer', tone: 'sap' as Tone },
  }[kind];
  return (
    <Badge tone={map.tone} mono>
      {map.label}
    </Badge>
  );
}

// ------------------------------------------------------------ level visuals
/** Worker level against the required level on the shared 0–4 scale. */
export function LevelBar({ level, required, className }: { level: number | null; required?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`Level ${level ?? 'unknown'}${required ? ` of ${required} required` : ''}`}>
      {[1, 2, 3, 4].map((i) => {
        const filled = level !== null && i <= level;
        const needed = required !== undefined && i <= required;
        return (
          <span
            key={i}
            className={cn(
              'h-1.5 w-6 rounded-full',
              filled ? (required !== undefined && level! < required ? 'bg-gapAmber-500' : 'bg-sap-500') : needed ? 'bg-ink-300' : 'bg-ink-100',
            )}
          />
        );
      })}
    </div>
  );
}

export function FitDial({ score, size = 64, label = 'est. fit' }: { score: number | null; size?: number; label?: string }) {
  const stroke = Math.max(4, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-ink-100" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className={cn('transition-all duration-700', pct >= 60 ? 'stroke-sap-500' : pct >= 35 ? 'stroke-sap-400' : 'stroke-gapAmber-500')}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-extrabold text-ink-950 leading-none" style={{ fontSize: size / 4 }}>
          {score === null ? '—' : Math.round(score)}
        </span>
        {size >= 56 ? <span className="text-[9px] font-mono text-ink-400 mt-0.5">{label}</span> : null}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- forms
export function Field({ label, hint, className, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-semibold text-ink-700">{label}</span>
      <input
        {...input}
        className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-sap-500/40 focus:border-sap-500"
      />
      {hint ? <span className="text-[11px] text-ink-500 mt-1 block">{hint}</span> : null}
    </label>
  );
}

export function TextArea({ label, hint, className, ...input }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-semibold text-ink-700">{label}</span>
      <textarea
        {...input}
        className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-sap-500/40 focus:border-sap-500 min-h-[110px]"
      />
      {hint ? <span className="text-[11px] text-ink-500 mt-1 block">{hint}</span> : null}
    </label>
  );
}

export function Select({ label, className, children, ...input }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-semibold text-ink-700">{label}</span>
      <select
        {...input}
        className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-sap-500/40 focus:border-sap-500"
      >
        {children}
      </select>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink-300 text-sap-500 focus:ring-sap-500" />
      <span>
        <span className="text-sm font-medium text-ink-900">{label}</span>
        {description ? <span className="block text-xs text-ink-500 mt-0.5">{description}</span> : null}
      </span>
    </label>
  );
}

export function Chips<T extends string>({ options, value, onChange, multiple }: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multiple?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(multiple ? (on ? value.filter((v) => v !== o.value) : [...value, o.value]) : [o.value])}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors',
              on ? 'bg-sap-500 border-sap-500 text-white' : 'bg-white border-ink-200 text-ink-700 hover:border-sap-300',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------- states
export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'danger' | 'success'; title?: string; children?: ReactNode }) {
  const Icon = { info: Info, warn: AlertTriangle, danger: XCircle, success: CheckCircle2 }[tone];
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3 text-sm',
        tone === 'info' && 'bg-sap-50/70 border-sap-200 text-sap-900',
        tone === 'warn' && 'bg-gapAmber-50 border-gapAmber-200 text-gapAmber-800',
        tone === 'danger' && 'bg-red-50 border-red-200 text-red-800',
        tone === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-500 py-10 justify-center">
      <Loader2 className="w-4 h-4 animate-spin text-sap-500" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-subtle">
      <Spinner label={label} />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Notice tone="danger" title="Something went wrong">
      <p>{errorMessage(error)}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold underline">
          Try again
        </button>
      ) : null}
    </Notice>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-ink-200 bg-white">
      {icon ? <div className="mx-auto w-11 h-11 rounded-xl bg-sap-50 text-sap-600 flex items-center justify-center mb-3">{icon}</div> : null}
      <p className="font-semibold text-ink-900">{title}</p>
      {children ? <div className="text-sm text-ink-500 mt-1 max-w-md mx-auto">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
