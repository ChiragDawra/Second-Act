import { ArrowLeft, BookOpen, ChevronDown, ExternalLink, GraduationCap, Lock, MapPin, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { familyLabel, formatDate, hoursLabel } from '../../lib/format';
import { useProfile, useRoleDetail, useRoleGaps } from '../../lib/queries';
import { PlanSteps } from '../../ui/journey';
import {
  Badge,
  Card,
  EligibilityBadge,
  ErrorState,
  FitDial,
  FitTrack,
  LevelBar,
  LinkButton,
  Provenance,
  ReadinessBadge,
  SectionTitle,
  Skeleton,
  StatusBadge,
} from '../../ui/kit';

export default function RoleDetail() {
  const { roleId = '' } = useParams();
  const me = useMe();
  const gaps = useRoleGaps(me.profile_id!, roleId);
  const role = useRoleDetail(roleId);
  const profile = useProfile(me.profile_id!);

  if (gaps.isPending || role.isPending) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (gaps.isError) return <ErrorState error={gaps.error} onRetry={() => void gaps.refetch()} />;
  if (role.isError) return <ErrorState error={role.error} onRetry={() => void role.refetch()} />;
  const e = gaps.data.evaluation;
  const d = role.data;
  const plan = gaps.data.learning_plan;
  const weekly = profile.data?.preferences.weekly_learning_hours ?? null;
  const pilot = roleId.startsWith('ncr-');
  const after = plan?.fit_after_learning ?? null;

  return (
    <>
      <Link to="/app/seeker/roles" className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle hover:text-fg mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> All roles
      </Link>

      <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface grain animate-rise">
        <div className="absolute inset-0 spotlight opacity-70" />
        <div className="relative p-6 sm:p-10 flex flex-col md:flex-row gap-8 md:items-center">
          <div className="flex-1 min-w-0">
            <p className="eyebrow">{familyLabel(e.family)}</p>
            <h1 className="headline text-4xl sm:text-6xl mt-3">{e.title}</h1>
            <div className="flex flex-wrap gap-1.5 mt-4">
              <ReadinessBadge status={e.readiness_status} />
              <EligibilityBadge value={e.eligibility} />
              <Badge tone="grey">Evidence confidence {e.evidence_confidence}%</Badge>
              {pilot ? <Provenance kind="pilot" /> : <Provenance kind="synthetic" />}
            </div>
            <p className="text-sm text-fg-muted mt-5 max-w-2xl leading-relaxed">{d.description}</p>
          </div>
          <div className="md:w-72 shrink-0">
            <div className="flex items-center gap-5">
              <FitDial score={e.role_fit_score} size={112} label="est. fit" />
              {after !== null && after > (e.role_fit_score ?? 0) ? (
                <div>
                  <p className="eyebrow">After the plan</p>
                  <p className="font-display text-5xl text-accent leading-none mt-2">{Math.round(after)}</p>
                </div>
              ) : null}
            </div>
            <FitTrack now={e.role_fit_score} after={after} className="mt-5" />
            <div className="flex gap-2 mt-5">
              <LinkButton to={`/app/seeker/mentors?role=${roleId}`} kind="secondary" size="sm" icon={<Users className="w-3.5 h-3.5" />}>
                Find a mentor
              </LinkButton>
              <LinkButton to="/app/seeker/prove" kind="secondary" size="sm" icon={<GraduationCap className="w-3.5 h-3.5" />}>
                Prove a skill
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-6 mt-6">
        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle
              title="Your plan for this role"
              subtitle={
                plan
                  ? `${plan.steps.length} step${plan.steps.length === 1 ? '' : 's'} · ${hoursLabel(plan.total_hours, weekly)}. Blockers first, then the most fit per hour. Learned skills count as self-reported until you prove them.`
                  : 'Plans need the latest API.'
              }
              right={weekly ? null : <Link to="/app/seeker/settings" className="text-xs text-fg-muted hover:text-accent">Set weekly hours</Link>}
            />
            {plan ? <PlanSteps plan={plan} /> : null}
          </Card>

          <details className="group rounded-2xl border border-line bg-surface shadow-card">
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5">
              <div>
                <p className="text-[15px] font-semibold text-fg">How the score is built</p>
                <p className="text-xs text-fg-subtle mt-1">Weight × min(your level ÷ required, 1) × evidence factor. Mandatory requirements are checked separately.</p>
              </div>
              <ChevronDown className="w-4 h-4 text-fg-subtle transition-transform group-open:rotate-180" />
            </summary>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-fg-subtle bg-surface-2/60">
                    <th className="px-6 py-2.5 font-medium">Skill</th>
                    <th className="px-3 py-2.5 font-medium">Weight</th>
                    <th className="px-3 py-2.5 font-medium">You vs needed</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-6 py-2.5 font-medium text-right">Adds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {e.breakdown.map((b) => (
                    <tr key={b.skill_id}>
                      <td className="px-6 py-3">
                        <span className="text-fg">{b.name}</span>
                        {b.is_mandatory ? (
                          <Badge tone="ember" className="ml-2">
                            Mandatory
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-fg-subtle">{b.importance_weight}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <LevelBar level={b.worker_level} required={b.required_level} />
                          <span className="font-mono text-[11px] text-fg-subtle">
                            {b.worker_level ?? '?'}/{b.required_level}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-xs text-fg-muted">+{b.contribution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 px-6 py-5 border-t border-line">
              {e.explanation.map((line) => (
                <li key={line} className="text-xs text-fg-muted flex gap-2 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="space-y-6">
          {e.mandatory.length > 0 ? (
            <Card>
              <SectionTitle title="Mandatory gate" subtitle="Never averaged into the score" />
              <div className="space-y-3">
                {e.mandatory.map((m) => (
                  <div key={m.skill_id} className="flex gap-3">
                    <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${m.gate === 'cleared' ? 'text-sage' : m.gate === 'blocker' ? 'text-ember' : 'text-accent'}`} />
                    <div>
                      <p className="text-sm font-medium text-fg">{m.name}</p>
                      <p className="text-xs text-fg-subtle leading-relaxed">{m.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {gaps.data.assessments.length > 0 ? (
            <Card tone="sage">
              <SectionTitle title="Prove it" subtitle="A pass turns a self-reported skill into a verified one." />
              {gaps.data.assessments.map((a) => (
                <Link key={a.id} to="/app/seeker/prove" className="flex items-center gap-3 py-2 group">
                  <GraduationCap className="w-4 h-4 text-sage" />
                  <span className="text-sm text-fg group-hover:underline">{a.title}</span>
                  <span className="text-xs text-fg-subtle ml-auto">~{a.time_estimate_minutes} min</span>
                </Link>
              ))}
            </Card>
          ) : null}

          {gaps.data.learning_resources.length > 0 ? (
            <Card>
              <SectionTitle title="Learning resources" />
              {gaps.data.learning_resources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 py-2 group">
                  <BookOpen className="w-4 h-4 text-fg-subtle mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-fg group-hover:underline">{r.title}</p>
                    <p className="text-[11px] text-fg-subtle">
                      {r.provider} · {r.format} · {r.cost_band}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-fg-subtle" />
                </a>
              ))}
            </Card>
          ) : null}

          <Card>
            <SectionTitle title="Openings" subtitle={d.demand_note} />
            {d.opportunities.length === 0 ? (
              <p className="text-sm text-fg-subtle">No openings for this role are listed.</p>
            ) : (
              d.opportunities.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm text-fg">{o.title}</p>
                    <p className="text-[11px] text-fg-subtle flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {o.employer_name} · {o.location} · {o.work_mode}
                    </p>
                  </div>
                  {o.is_simulated ? <Provenance kind="simulated" /> : <Provenance kind="employer" />}
                </div>
              ))
            )}
          </Card>

          <p className="text-[11px] text-fg-subtle leading-relaxed">
            Source: {d.source} · {d.dataset_version} · reviewed {formatDate(d.last_reviewed_at)} · computed {formatDate(gaps.data.computed_at)}
          </p>
        </div>
      </div>
    </>
  );
}
