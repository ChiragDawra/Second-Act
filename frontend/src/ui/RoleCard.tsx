import { ArrowUpRight, Clock, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { familyLabel, hoursLabel, nextStep } from '../lib/format';
import type { LearningPlan, RoleEvaluation } from '../lib/types';
import { Badge, cn, EligibilityBadge, FitDial, ReadinessBadge } from './kit';

/** One role: estimated fit, readiness, how much of it you already meet, and the effort to close it. */
export function RoleCard({
  role,
  plan,
  weeklyHours,
  highlight,
  compact,
  current,
  stepBack,
}: {
  role: RoleEvaluation;
  plan?: LearningPlan;
  weeklyHours?: number | null;
  highlight?: boolean;
  compact?: boolean;
  current?: boolean;
  stepBack?: boolean;
}) {
  const step = nextStep(role);
  const met = role.transferable.length;
  const total = role.breakdown.length;
  return (
    <Link
      to={`/app/seeker/roles/${role.role_id}`}
      className={cn(
        'group relative flex flex-col rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5',
        highlight ? 'bg-surface-2 border-accent/40 shadow-glow' : 'bg-surface border-line shadow-card hover:border-line-strong hover:shadow-pop',
      )}
    >
      <div className="flex items-start gap-4">
        <FitDial score={role.role_fit_score} size={compact ? 52 : 60} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="eyebrow truncate">{current ? 'You are here' : role.rank ? `#${role.rank} · ${familyLabel(role.family)}` : familyLabel(role.family)}</p>
              <h3 className="font-semibold text-fg leading-snug mt-1.5 text-[15px]">{role.title}</h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-fg-subtle group-hover:text-accent transition-colors shrink-0" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <ReadinessBadge status={role.readiness_status} />
            {role.eligibility !== 'eligible' ? <EligibilityBadge value={role.eligibility} /> : null}
            {stepBack ? <Badge tone="grey">Step back</Badge> : null}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-fg-subtle mb-1.5">
          <span>Requirements met</span>
          <span className="font-mono text-fg-muted">
            {met}/{total}
          </span>
        </div>
        <div className="flex gap-1">
          {role.breakdown.map((b) => (
            <span
              key={b.skill_id}
              title={b.name}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                b.status !== 'unknown' && (b.worker_level ?? 0) >= b.required_level ? 'bg-accent' : b.status === 'unknown' ? 'bg-surface-3' : 'bg-coral/70',
              )}
            />
          ))}
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 pt-4 border-t border-line flex items-start gap-2 text-xs text-fg-muted">
          <Flag className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', step.kind === 'ready' ? 'text-sage' : 'text-accent')} />
          <span className="line-clamp-2">{step.text}</span>
        </div>
      ) : null}

      {plan && plan.total_hours > 0 ? (
        <div className="mt-3 flex items-center gap-3 text-[11px] text-fg-subtle">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {hoursLabel(plan.total_hours, weeklyHours)}
          </span>
          {plan.fit_after_learning !== null && plan.fit_now !== null && plan.fit_after_learning > plan.fit_now ? (
            <Badge tone="accent">
              {Math.round(plan.fit_now)} → {Math.round(plan.fit_after_learning)}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {role.constraint_failures.length > 0 ? <p className="mt-3 text-xs text-fg-subtle">Filtered: {role.constraint_failures[0]!.message}</p> : null}
    </Link>
  );
}
