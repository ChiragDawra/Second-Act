import { ArrowLeft, BookOpen, ExternalLink, GraduationCap, Lock, MapPin, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { familyLabel, formatDate } from '../../lib/format';
import { useRoleDetail, useRoleGaps } from '../../lib/queries';
import {
  Badge,
  Button,
  Card,
  EligibilityBadge,
  ErrorState,
  FitDial,
  LevelBar,
  Notice,
  Provenance,
  ReadinessBadge,
  SectionTitle,
  Spinner,
  StatusBadge,
} from '../../ui/kit';

export default function RoleDetail() {
  const { roleId = '' } = useParams();
  const me = useMe();
  const gaps = useRoleGaps(me.profile_id!, roleId);
  const role = useRoleDetail(roleId);

  if (gaps.isPending || role.isPending) return <Spinner />;
  if (gaps.isError) return <ErrorState error={gaps.error} onRetry={() => void gaps.refetch()} />;
  if (role.isError) return <ErrorState error={role.error} onRetry={() => void role.refetch()} />;
  const e = gaps.data.evaluation;
  const d = role.data;
  const pilot = roleId.startsWith('ncr-');

  return (
    <>
      <Link to="/app/seeker/roles" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> All roles
      </Link>

      <Card className="p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <FitDial score={e.role_fit_score} size={104} />
          <div className="flex-1">
            <p className="text-xs text-ink-500">{familyLabel(e.family)}</p>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink-950 mt-1">{e.title}</h1>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <ReadinessBadge status={e.readiness_status} />
              <EligibilityBadge value={e.eligibility} />
              <Badge tone="sap">Evidence confidence {e.evidence_confidence}%</Badge>
              {pilot ? <Provenance kind="pilot" /> : <Provenance kind="synthetic" />}
            </div>
            <p className="text-sm text-ink-600 mt-4 max-w-2xl leading-relaxed">{d.description}</p>
          </div>
          <div className="flex md:flex-col gap-2">
            <Link to={`/app/seeker/mentors?role=${roleId}`}>
              <Button kind="dark" icon={<Users className="w-4 h-4" />}>
                Find a mentor
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {gaps.data.next_action ? (
        <div className="mt-6">
          <Notice tone={gaps.data.next_action.kind === 'prove' ? 'warn' : 'info'} title={gaps.data.next_action.kind === 'prove' ? `Prove ${gaps.data.next_action.name}` : `Learn ${gaps.data.next_action.name}`}>
            {gaps.data.next_action.reason}
          </Notice>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 mt-6">
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 pt-5">
              <SectionTitle title="How the score is built" subtitle="Weight × min(your level ÷ required, 1) × evidence factor. Mandatory requirements are checked separately." />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-400 border-y border-ink-100 bg-ink-50/60">
                    <th className="px-5 py-2.5 font-medium">Skill</th>
                    <th className="px-3 py-2.5 font-medium">Weight</th>
                    <th className="px-3 py-2.5 font-medium">You vs needed</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium text-right">Adds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {e.breakdown.map((b) => (
                    <tr key={b.skill_id}>
                      <td className="px-5 py-3">
                        <span className="font-medium text-ink-900">{b.name}</span>
                        {b.is_mandatory ? <Badge tone="red" className="ml-2">Mandatory</Badge> : null}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-ink-500">{b.importance_weight}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <LevelBar level={b.worker_level} required={b.required_level} />
                          <span className="font-mono text-[11px] text-ink-400">
                            {b.worker_level ?? '?'}/{b.required_level}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-ink-700">+{b.contribution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Why this result" />
            <ul className="space-y-2">
              {e.explanation.map((line) => (
                <li key={line} className="text-sm text-ink-700 flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sap-500 mt-2 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {e.mandatory.length > 0 ? (
            <Card>
              <SectionTitle title="Mandatory gate" subtitle="Never averaged into the score" />
              <div className="space-y-3">
                {e.mandatory.map((m) => (
                  <div key={m.skill_id} className="flex gap-3">
                    <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${m.gate === 'cleared' ? 'text-emerald-500' : m.gate === 'blocker' ? 'text-red-500' : 'text-gapAmber-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{m.name}</p>
                      <p className="text-xs text-ink-500">{m.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {e.unknowns.length > 0 ? (
            <Card tone="muted">
              <SectionTitle title="Unknown, not missing" subtitle="No evidence either way yet" />
              <div className="flex flex-wrap gap-1.5">
                {e.unknowns.map((u) => (
                  <Badge key={u.skill_id}>{u.name}</Badge>
                ))}
              </div>
            </Card>
          ) : null}

          {gaps.data.assessments.length > 0 ? (
            <Card tone="sap">
              <SectionTitle title="Prove a skill" />
              {gaps.data.assessments.map((a) => (
                <Link key={a.id} to="/app/seeker/prove" className="flex items-center gap-3 py-2 hover:underline">
                  <GraduationCap className="w-4 h-4 text-sap-600" />
                  <span className="text-sm font-medium">{a.title}</span>
                  <span className="text-xs text-ink-500 ml-auto">~{a.time_estimate_minutes} min</span>
                </Link>
              ))}
            </Card>
          ) : null}

          {gaps.data.learning_resources.length > 0 ? (
            <Card>
              <SectionTitle title="Learning resources" />
              {gaps.data.learning_resources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 py-2 group">
                  <BookOpen className="w-4 h-4 text-ink-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-900 group-hover:underline">{r.title}</p>
                    <p className="text-[11px] text-ink-500">
                      {r.provider} · {r.format} · {r.cost_band}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-ink-300" />
                </a>
              ))}
            </Card>
          ) : null}

          <Card>
            <SectionTitle title="Openings" subtitle={d.demand_note} />
            {d.opportunities.length === 0 ? (
              <p className="text-sm text-ink-500">No openings for this role are listed.</p>
            ) : (
              d.opportunities.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{o.title}</p>
                    <p className="text-[11px] text-ink-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {o.employer_name} · {o.location} · {o.work_mode}
                    </p>
                  </div>
                  {o.is_simulated ? <Provenance kind="simulated" /> : <Provenance kind="employer" />}
                </div>
              ))
            )}
          </Card>

          <p className="text-[11px] text-ink-400">
            Source: {d.source} · {d.dataset_version} · reviewed {formatDate(d.last_reviewed_at)} · computed {formatDate(gaps.data.computed_at)}
          </p>
        </div>
      </div>
    </>
  );
}
