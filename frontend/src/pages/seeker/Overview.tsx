import { ArrowRight, CheckCircle2, FileText, GraduationCap, Share2, Sparkles, Target, Upload, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { familyLabel, firstName, formatDateTime, nextStep, SECTOR_LABEL } from '../../lib/format';
import { useMentorships, useRecommendations, useShares, useSkills } from '../../lib/queries';
import type { RoleEvaluation } from '../../lib/types';
import { Badge, Button, Card, ErrorState, LevelBar, PageHeader, SectionTitle, Spinner, Stat, StatusBadge } from '../../ui/kit';
import { RoleCard } from '../../ui/RoleCard';

function StartWithResume() {
  return (
    <Card tone="dark" className="relative overflow-hidden p-8">
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-sap-500/30 blur-3xl" />
      <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div>
          <Badge tone="sap">Step 1</Badge>
          <h2 className="text-2xl font-extrabold tracking-tight mt-3">Start with your resume</h2>
          <p className="text-ink-300 mt-2 text-sm leading-relaxed max-w-lg">
            Upload a PDF, Word file or paste text. We read it in memory, show every skill with the sentence it came from, and keep your goals
            separate from what you have done. Nothing is saved until you confirm it.
          </p>
          <Link to="/app/seeker/resume" className="inline-block mt-6">
            <Button size="lg" icon={<Upload className="w-4 h-4" />}>
              Upload my resume
            </Button>
          </Link>
        </div>
        <ol className="space-y-3 text-sm">
          {['Upload or paste your resume', 'Review what we found and set your level', 'See roles you can reach and what blocks them'].map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-sap-300">{i + 1}</span>
              <span className="text-ink-200">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

export default function Overview() {
  const me = useMe();
  const id = me.profile_id!;
  const skills = useSkills(id);
  const recs = useRecommendations(id);
  const mentorships = useMentorships(id);
  const shares = useShares(id);

  if (skills.isPending || recs.isPending) return <Spinner label="Loading your dashboard…" />;
  if (skills.isError) return <ErrorState error={skills.error} onRetry={() => void skills.refetch()} />;
  if (recs.isError) return <ErrorState error={recs.error} onRetry={() => void recs.refetch()} />;

  const evidenced = skills.data.skills.filter((s) => s.status !== 'unknown');
  const verified = evidenced.filter((s) => s.status === 'verified').length;
  const toReview = skills.data.skills.filter((s) => s.status === 'inferred').length;
  const r = recs.data;
  const eligible: RoleEvaluation[] = [...r.top, ...r.other_eligible];
  const sectorRoles = me.sector ? eligible.filter((e) => e.family === me.sector) : [];
  const best = r.top[0] ?? null;
  const step = best ? nextStep(best) : null;
  const strongest = [...evidenced].sort((a, b) => (b.proficiency ?? 0) - (a.proficiency ?? 0)).slice(0, 6);
  const activeMentors = (mentorships.data ?? []).filter((m) => m.status === 'accepted' || m.status === 'requested').length;
  const activeShares = (shares.data ?? []).filter((s) => !s.revoked_at).length;

  return (
    <>
      <PageHeader
        eyebrow={me.sector ? SECTOR_LABEL[me.sector] : 'Your career dashboard'}
        title={`Welcome back, ${firstName(me.display_name)}`}
        subtitle="Your nearest roles, what you already bring, and the one thing to do next."
        actions={
          <>
            <Link to="/app/seeker/resume">
              <Button kind="secondary" icon={<FileText className="w-4 h-4" />}>
                Resume
              </Button>
            </Link>
            <Link to="/app/seeker/roles">
              <Button kind="dark" icon={<Target className="w-4 h-4" />}>
                All roles
              </Button>
            </Link>
          </>
        }
      />

      {evidenced.length === 0 ? (
        <StartWithResume />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Skills with evidence" value={evidenced.length} hint={toReview ? `${toReview} waiting for your review` : 'All reviewed'} accent="sap" />
            <Stat label="Verified" value={verified} hint="By assessment only" accent="green" />
            <Stat label="Best estimated fit" value={best?.role_fit_score ?? '—'} hint={best?.title ?? 'No role clears the bar yet'} />
            <Stat label="Roles in reach" value={eligible.length} hint={`${r.stretch.length} stretch, ${r.filtered.length} filtered`} accent="amber" />
          </div>

          {step && best ? (
            <Card tone={step.kind === 'prove' ? 'amber' : 'sap'} className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-subtle">
                  {step.kind === 'prove' ? <GraduationCap className="w-5 h-5 text-gapAmber-600" /> : step.kind === 'learn' ? <Sparkles className="w-5 h-5 text-sap-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </div>
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-ink-500">Next best step · {best.title}</p>
                  <p className="font-semibold text-ink-950 mt-1">{step.text}</p>
                </div>
              </div>
              <Link to={step.kind === 'prove' ? '/app/seeker/prove' : `/app/seeker/roles/${best.role_id}`}>
                <Button kind="dark" icon={<ArrowRight className="w-4 h-4" />}>
                  {step.kind === 'prove' ? 'Prove it' : 'See the plan'}
                </Button>
              </Link>
            </Card>
          ) : null}

          <section>
            <SectionTitle title="Your nearest roles" subtitle={r.score_disclaimer} right={<Link to="/app/seeker/roles" className="text-xs font-semibold text-sap-600 hover:underline">All roles</Link>} />
            {r.top.length === 0 ? (
              <Card tone="muted">
                <p className="text-sm text-ink-600">
                  No role clears the recommendation bar yet. Confirm more skills, set realistic levels, or look at stretch roles to see what blocks them.
                </p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {r.top.map((role, i) => (
                  <RoleCard key={role.role_id} role={role} highlight={i === 0} />
                ))}
              </div>
            )}
          </section>

          {me.sector && sectorRoles.length > 0 ? (
            <section>
              <SectionTitle title={`In ${familyLabel(me.sector)}`} subtitle="Roles in the sector you chose, ranked by estimated fit" />
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sectorRoles.slice(0, 6).map((role) => (
                  <RoleCard key={role.role_id} role={role} compact />
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
            <Card>
              <SectionTitle title="What you already bring" right={<Link to="/app/seeker/skills" className="text-xs font-semibold text-sap-600 hover:underline">Manage skills</Link>} />
              <div className="divide-y divide-ink-100">
                {strongest.map((s) => (
                  <div key={s.skill_id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-ink-400">{s.category}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <LevelBar level={s.proficiency} />
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-sap-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-ink-950">Mentors</p>
                    <p className="text-xs text-ink-500">{activeMentors ? `${activeMentors} active request${activeMentors > 1 ? 's' : ''}` : 'Someone who made this move can help'}</p>
                  </div>
                  <Link to="/app/seeker/mentors">
                    <Button kind="secondary" size="sm">
                      Find
                    </Button>
                  </Link>
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-sap-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-ink-950">Sharing with recruiters</p>
                    <p className="text-xs text-ink-500">{activeShares ? `Shared with ${activeShares} organisation${activeShares > 1 ? 's' : ''}` : 'Nothing shared. You decide.'}</p>
                  </div>
                  <Link to="/app/seeker/sharing">
                    <Button kind="secondary" size="sm">
                      Manage
                    </Button>
                  </Link>
                </div>
              </Card>
              <p className="text-[11px] font-mono text-ink-400 px-1">
                {r.scoring_version} · {r.dataset_version} · computed {formatDateTime(r.computed_at)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
