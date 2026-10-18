import { ArrowUpRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { familyLabel, nextStep } from '../lib/format';
import type { RoleEvaluation } from '../lib/types';
import { Badge, cn, EligibilityBadge, FitDial, ReadinessBadge } from './kit';

export function RoleCard({ role, highlight, compact }: { role: RoleEvaluation; highlight?: boolean; compact?: boolean }) {
  const step = nextStep(role);
  const met = role.transferable.length;
  const total = role.breakdown.length;
  return (
    <Link
      to={`/app/seeker/roles/${role.role_id}`}
      className={cn(
        'group block rounded-2xl border bg-white p-5 transition-all hover:shadow-elevated hover:-translate-y-0.5',
        highlight ? 'border-sap-300 ring-4 ring-sap-500/5' : 'border-ink-200/70',
      )}
    >
      <div className="flex items-start gap-4">
        <FitDial score={role.role_fit_score} size={compact ? 52 : 64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {role.rank ? <p className="text-[10px] font-mono text-sap-600">#{role.rank} by estimated fit</p> : null}
              <h3 className="font-bold text-ink-950 leading-snug">{role.title}</h3>
              <p className="text-xs text-ink-500 mt-0.5">{familyLabel(role.family)}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-ink-300 group-hover:text-sap-500 shrink-0" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <ReadinessBadge status={role.readiness_status} />
            {role.eligibility !== 'eligible' ? <EligibilityBadge value={role.eligibility} /> : null}
            <Badge tone="grey">
              {met}/{total} requirements met
            </Badge>
          </div>
        </div>
      </div>
      {!compact ? (
        <div className={cn('mt-4 rounded-xl px-3.5 py-2.5 text-xs flex gap-2', step.kind === 'prove' ? 'bg-gapAmber-50 text-gapAmber-800' : step.kind === 'learn' ? 'bg-sap-50 text-sap-800' : 'bg-emerald-50 text-emerald-800')}>
          {step.kind === 'prove' ? <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : null}
          <span>{step.text}</span>
        </div>
      ) : null}
      {role.constraint_failures.length > 0 ? <p className="mt-3 text-xs text-ink-500">Filtered: {role.constraint_failures[0]!.message}</p> : null}
    </Link>
  );
}
