import { ArrowRight, BookOpenCheck, CircleHelp, GraduationCap, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hoursLabel } from '../lib/format';
import type { LearningPlan, PlanStep, StudyItem } from '../lib/types';
import { Badge, cn, LEVEL_LABELS } from './kit';

const STEP_META: Record<PlanStep['kind'], { icon: typeof Lock; label: string; tone: string }> = {
  learn: { icon: BookOpenCheck, label: 'Learn', tone: 'text-accent bg-accent/10 border-accent/25' },
  learn_or_confirm: { icon: CircleHelp, label: 'Confirm or learn', tone: 'text-azure bg-azure/10 border-azure/25' },
  prove: { icon: GraduationCap, label: 'Prove', tone: 'text-sage bg-sage/10 border-sage/25' },
};

const level = (n: number | null) => (n === null ? 'no evidence' : `${n} · ${LEVEL_LABELS[n]}`);

/** A role's plan as a numbered path: blockers first, then the best fit per hour. */
export function PlanSteps({ plan, limit }: { plan: LearningPlan; limit?: number }) {
  const steps = limit ? plan.steps.slice(0, limit) : plan.steps;
  if (steps.length === 0) {
    return <p className="text-sm text-fg-muted">Nothing left to learn or prove for this role. You meet every requirement with verified evidence.</p>;
  }
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const meta = STEP_META[s.kind];
        const Icon = meta.icon;
        return (
          <li key={`${s.kind}-${s.skill_id}`} className="relative flex gap-4 pb-5 last:pb-0">
            {i < steps.length - 1 ? <span className="absolute left-[17px] top-10 bottom-0 w-px bg-line" /> : null}
            <div className={cn('relative z-10 w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', meta.tone)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-fg">{s.name}</span>
                {s.is_mandatory && s.kind !== 'prove' ? (
                  <Badge tone="ember">
                    <Lock className="w-3 h-3" /> Mandatory
                  </Badge>
                ) : null}
                <span className="text-[11px] text-fg-subtle">{meta.label}</span>
              </div>
              <p className="text-xs text-fg-subtle mt-1 leading-relaxed">{s.reason}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-mono text-fg-muted">
                {s.kind !== 'prove' ? (
                  <span>
                    {level(s.from_level)} → {level(s.to_level)}
                  </span>
                ) : (
                  <span>assessment · ~1h</span>
                )}
                {s.kind !== 'prove' ? <span>~{s.hours}h</span> : null}
                <span className="text-accent">+{s.fit_gain} fit</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Skills that move the most nearby roles per hour of study. */
export function StudyNextList({ items, weeklyHours, linkRoles = true }: { items: StudyItem[]; weeklyHours?: number | null; linkRoles?: boolean }) {
  return (
    <div className="divide-y divide-line">
      {items.map((s, i) => (
        <div key={s.skill_id} className="py-3.5 first:pt-0 last:pb-0 flex gap-4">
          <span className="font-display text-2xl leading-none text-fg-subtle w-6 shrink-0 pt-0.5">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-fg">{s.name}</p>
                <p className="text-xs text-fg-subtle mt-0.5">{s.reason}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm text-accent">+{s.fit_gain_total}</p>
                <p className="text-[10px] text-fg-subtle">{hoursLabel(s.hours, weeklyHours)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {s.roles.slice(0, 3).map((r) => {
                const badge = (
                  <Badge tone="grey" className="group-hover:border-line-strong group-hover:text-fg">
                    {r.title} <span className="text-accent">+{r.fit_gain}</span>
                  </Badge>
                );
                return linkRoles ? (
                  <Link key={r.role_id} to={`/app/seeker/roles/${r.role_id}`} className="group">
                    {badge}
                  </Link>
                ) : (
                  <span key={r.role_id}>{badge}</span>
                );
              })}
              {s.roles.length > 3 ? <Badge tone="grey">+{s.roles.length - 3} more</Badge> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SeeAll({ to, children = 'See all' }: { to: string; children?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-accent">
      {children} <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}
