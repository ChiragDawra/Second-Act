import { clsx, type ClassValue } from 'clsx';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { errorMessage } from '../lib/api';
import type { Eligibility, Readiness, SkillStatus } from '../lib/types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const LEVEL_LABELS = ['None', 'Aware', 'Practiced', 'Independent', 'Expert'] as const;

// -------------------------------------------------------------------- brand
/** The "Act II" mark: a roman numeral two with serifs, on marigold. */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn('shrink-0', className)} aria-hidden>
      <rect width="64" height="64" rx="15" className="fill-accent" />
      <g className="fill-accent-ink">
        <rect x="14" y="15" width="36" height="4.5" rx="2.25" />
        <rect x="14" y="44.5" width="36" height="4.5" rx="2.25" />
        <rect x="21" y="17" width="7" height="30" rx="1.5" />
        <rect x="36" y="17" width="7" height="30" rx="1.5" />
      </g>
    </svg>
  );
}

export function Wordmark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Mark size={size} />
      <span className="font-display text-[1.45rem] leading-none tracking-tight text-fg">
        Second <em className="text-accent">Act</em>
      </span>
    </span>
  );
}

// ------------------------------------------------------------------ buttons
type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'contrast';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON: Record<ButtonKind, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong shadow-[0_8px_24px_-12px_rgb(var(--accent)/0.6)]',
  secondary: 'bg-surface-2 text-fg border border-line hover:border-line-strong hover:bg-surface-3',
  ghost: 'bg-transparent text-fg-muted hover:text-fg hover:bg-surface-2',
  danger: 'bg-ember/15 text-ember border border-ember/30 hover:bg-ember/25',
  contrast: 'bg-fg text-canvas hover:bg-white',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
};

const buttonClass = (kind: ButtonKind, size: ButtonSize, className?: string) =>
  cn(
    'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none select-none',
    SIZE[size],
    BUTTON[kind],
    className,
  );

export function Button({
  kind = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; size?: ButtonSize; loading?: boolean; icon?: ReactNode }) {
  return (
    <button type="button" disabled={disabled || loading} className={buttonClass(kind, size, className)} {...rest}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** A router link that looks like a button (never a button inside a link). */
export function LinkButton({
  kind = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkProps & { kind?: ButtonKind; size?: ButtonSize; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(kind, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

// -------------------------------------------------------------------- cards
type CardTone = 'default' | 'accent' | 'coral' | 'sage' | 'muted' | 'raised';

export function Card({ className, children, tone, interactive }: { className?: string; children: ReactNode; tone?: CardTone; interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5',
        (!tone || tone === 'default') && 'bg-surface border-line shadow-card',
        tone === 'accent' && 'bg-accent/[0.07] border-accent/25',
        tone === 'coral' && 'bg-coral/[0.07] border-coral/25',
        tone === 'sage' && 'bg-sage/[0.07] border-sage/25',
        tone === 'muted' && 'bg-surface-2/60 border-line',
        tone === 'raised' && 'bg-surface-2 border-line-strong shadow-pop',
        interactive && 'transition-all duration-200 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-pop',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, right, className }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-fg tracking-tight">{title}</h2>
        {subtitle ? <p className="text-xs text-fg-subtle mt-1 leading-relaxed">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8 animate-rise">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="headline text-[2.4rem] sm:text-5xl">{title}</h1>
        {subtitle ? <p className="text-sm text-fg-muted mt-3 max-w-2xl leading-relaxed">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </header>
  );
}

type Accent = 'accent' | 'coral' | 'sage' | 'fg';
const ACCENT_TEXT: Record<Accent, string> = { accent: 'text-accent', coral: 'text-coral', sage: 'text-sage', fg: 'text-fg' };

export function Stat({ label, value, hint, accent = 'fg', className }: { label: string; value: ReactNode; hint?: ReactNode; accent?: Accent; className?: string }) {
  return (
    <Card className={cn('p-4', className)}>
      <p className="eyebrow">{label}</p>
      <p className={cn('font-display text-4xl leading-none mt-3', ACCENT_TEXT[accent])}>{value}</p>
      {hint ? <p className="text-xs text-fg-subtle mt-2 leading-relaxed">{hint}</p> : null}
    </Card>
  );
}

// ------------------------------------------------------------------- badges
export type Tone = 'accent' | 'coral' | 'sage' | 'ember' | 'iris' | 'azure' | 'grey' | 'contrast';
const TONE: Record<Tone, string> = {
  accent: 'bg-accent/10 text-accent border-accent/25',
  coral: 'bg-coral/10 text-coral border-coral/25',
  sage: 'bg-sage/10 text-sage border-sage/25',
  ember: 'bg-ember/10 text-ember border-ember/25',
  iris: 'bg-iris/10 text-iris border-iris/25',
  azure: 'bg-azure/10 text-azure border-azure/25',
  grey: 'bg-surface-3/70 text-fg-muted border-line',
  contrast: 'bg-fg text-canvas border-fg',
};
const DOT: Record<Tone, string> = {
  accent: 'bg-accent',
  coral: 'bg-coral',
  sage: 'bg-sage',
  ember: 'bg-ember',
  iris: 'bg-iris',
  azure: 'bg-azure',
  grey: 'bg-fg-subtle',
  contrast: 'bg-canvas',
};

export function Badge({ children, tone = 'grey', mono, dot, className }: { children: ReactNode; tone?: Tone; mono?: boolean; dot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full border text-[11px] font-medium whitespace-nowrap',
        mono && 'font-mono uppercase tracking-wider text-[10px]',
        TONE[tone],
        className,
      )}
    >
      {dot ? <span className={cn('w-1.5 h-1.5 rounded-full', DOT[tone])} /> : null}
      {children}
    </span>
  );
}

export const STATUS_META: Record<SkillStatus, { label: string; tone: Tone }> = {
  verified: { label: 'Verified', tone: 'sage' },
  self_reported: { label: 'Self-reported', tone: 'accent' },
  inferred: { label: 'Inferred · review', tone: 'coral' },
  unknown: { label: 'Unknown', tone: 'grey' },
  not_demonstrated: { label: 'Not demonstrated', tone: 'ember' },
};
export const StatusBadge = ({ status }: { status: SkillStatus }) => (
  <Badge tone={STATUS_META[status].tone} dot>
    {STATUS_META[status].label}
  </Badge>
);

export const READINESS_META: Record<Readiness, { label: string; tone: Tone }> = {
  ready: { label: 'Ready', tone: 'sage' },
  needs_validation: { label: 'Needs proof', tone: 'accent' },
  blocked: { label: 'Blocked', tone: 'ember' },
};
export const ReadinessBadge = ({ status }: { status: Readiness }) => (
  <Badge tone={READINESS_META[status].tone} dot>
    {READINESS_META[status].label}
  </Badge>
);

const ELIGIBILITY: Record<Eligibility, { label: string; tone: Tone }> = {
  eligible: { label: 'Eligible', tone: 'sage' },
  stretch: { label: 'Stretch', tone: 'coral' },
  filtered: { label: 'Filtered out', tone: 'grey' },
  data_error: { label: 'Data error', tone: 'ember' },
};
export const EligibilityBadge = ({ value }: { value: Eligibility }) => <Badge tone={ELIGIBILITY[value].tone}>{ELIGIBILITY[value].label}</Badge>;

export function Provenance({ kind }: { kind: 'live' | 'synthetic' | 'simulated' | 'planned' | 'pilot' | 'employer' }) {
  const map = {
    live: { label: 'Live', tone: 'sage' as Tone },
    synthetic: { label: 'Synthetic', tone: 'iris' as Tone },
    simulated: { label: 'Simulated', tone: 'iris' as Tone },
    planned: { label: 'Planned', tone: 'grey' as Tone },
    pilot: { label: 'Pilot data', tone: 'coral' as Tone },
    employer: { label: 'Posted by employer', tone: 'accent' as Tone },
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
              'h-1.5 w-5 rounded-full',
              filled ? (required !== undefined && level! < required ? 'bg-coral' : 'bg-accent') : needed ? 'bg-line-strong' : 'bg-surface-3',
            )}
          />
        );
      })}
    </div>
  );
}

/** Estimated fit as a ring. Never a probability: the label says "fit". */
export function FitDial({ score, size = 64, label = 'fit', tone }: { score: number | null; size?: number; label?: string; tone?: 'accent' | 'sage' | 'coral' }) {
  const stroke = Math.max(3.5, size / 14);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  const color = tone ?? (pct >= 55 ? 'accent' : pct >= 30 ? 'accent' : 'coral');
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-surface-3" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className={cn('transition-all duration-700', color === 'sage' ? 'stroke-sage' : color === 'coral' ? 'stroke-coral' : 'stroke-accent')}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-fg leading-none" style={{ fontSize: size / 2.9 }}>
          {score === null ? '—' : Math.round(score)}
        </span>
        {size >= 60 ? <span className="text-[9px] font-mono uppercase tracking-wider text-fg-subtle mt-0.5">{label}</span> : null}
      </div>
    </div>
  );
}

/** Fit now and after a plan, on one track. */
export function FitTrack({ now, after, className }: { now: number | null; after: number | null; className?: string }) {
  const a = Math.max(0, Math.min(100, now ?? 0));
  const b = Math.max(a, Math.min(100, after ?? a));
  return (
    <div className={cn('relative h-2 rounded-full bg-surface-3 overflow-hidden', className)} aria-label={`Estimated fit ${a} now, ${b} after the plan`}>
      <div className="absolute inset-y-0 left-0 rounded-full bg-accent/25" style={{ width: `${b}%` }} />
      <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${a}%` }} />
    </div>
  );
}

// -------------------------------------------------------------------- forms
const INPUT =
  'mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle/80 transition-colors focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20';

export function Field({ label, hint, className, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <input {...input} className={INPUT} />
      {hint ? <span className="text-[11px] text-fg-subtle mt-1.5 block">{hint}</span> : null}
    </label>
  );
}

export function TextArea({ label, hint, className, ...input }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <textarea {...input} className={cn(INPUT, 'min-h-[110px]')} />
      {hint ? <span className="text-[11px] text-fg-subtle mt-1.5 block">{hint}</span> : null}
    </label>
  );
}

export function Select({ label, className, children, ...input }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <select {...input} className={cn(INPUT, 'px-3')}>
        {children}
      </select>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none group">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line bg-surface-2" />
      <span>
        <span className="text-sm font-medium text-fg">{label}</span>
        {description ? <span className="block text-xs text-fg-subtle mt-0.5 leading-relaxed">{description}</span> : null}
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
            aria-pressed={on}
            onClick={() => onChange(multiple ? (on ? value.filter((v) => v !== o.value) : [...value, o.value]) : [o.value])}
            className={cn(
              'h-8 px-3.5 rounded-full border text-xs font-medium transition-colors',
              on ? 'bg-accent border-accent text-accent-ink' : 'bg-surface-2 border-line text-fg-muted hover:text-fg hover:border-line-strong',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control for switching views on one page. */
export function Tabs<T extends string>({ items, value, onChange, className }: { items: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('inline-flex p-1 rounded-xl bg-surface-2 border border-line gap-1 max-w-full overflow-x-auto', className)}>
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5',
            t.value === value ? 'bg-surface-3 text-fg shadow-card' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {t.label}
          {t.count !== undefined ? <span className={cn('font-mono text-[10px]', t.value === value ? 'text-accent' : 'text-fg-subtle')}>{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------- states
export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'danger' | 'success'; title?: ReactNode; children?: ReactNode }) {
  const Icon = { info: Info, warn: AlertTriangle, danger: XCircle, success: CheckCircle2 }[tone];
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3 text-sm',
        tone === 'info' && 'bg-azure/[0.07] border-azure/20 text-fg-muted [&_svg]:text-azure',
        tone === 'warn' && 'bg-coral/[0.07] border-coral/25 text-fg-muted [&_svg]:text-coral',
        tone === 'danger' && 'bg-ember/[0.08] border-ember/25 text-fg-muted [&_svg]:text-ember',
        tone === 'success' && 'bg-sage/[0.07] border-sage/25 text-fg-muted [&_svg]:text-sage',
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="font-semibold text-fg">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-fg-subtle py-12 justify-center">
      <Loader2 className="w-4 h-4 animate-spin text-accent" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas">
      <Mark size={36} className="animate-pulse" />
      <p className="text-sm text-fg-subtle">{label ?? 'Loading…'}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Notice tone="danger" title="Something went wrong">
      <p>{errorMessage(error)}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-fg underline underline-offset-4">
          Try again
        </button>
      ) : null}
    </Notice>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-line-strong bg-surface/50">
      {icon ? <div className="mx-auto w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">{icon}</div> : null}
      <p className="font-semibold text-fg">{title}</p>
      {children ? <div className="text-sm text-fg-subtle mt-1.5 max-w-md mx-auto leading-relaxed">{children}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
