import { ArrowRight, Check, FileText, GraduationCap, Quote, Share2, Sparkles, Target, Upload, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { familyLabel, firstName, formatDateTime, greeting, hoursLabel, SECTOR_LABEL } from '../../lib/format';
import { useMentorships, useProfile, useRecommendations, useShares, useSkills } from '../../lib/queries';
import type { LearningPlan, RoleEvaluation, SkillStatus, WorkerSkill } from '../../lib/types';
import { PlanSteps, SeeAll, StudyNextList } from '../../ui/journey';
import { Badge, Card, cn, ErrorState, FitDial, FitTrack, LevelBar, LinkButton, ReadinessBadge, SectionTitle, Skeleton, STATUS_META } from '../../ui/kit';
import { RoleCard } from '../../ui/RoleCard';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 w-2/3 max-w-lg" />
      <div className="grid lg:grid-cols-12 gap-5">
        <Skeleton className="h-72 lg:col-span-8 rounded-3xl" />
        <Skeleton className="h-72 lg:col-span-4 rounded-3xl" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}

/** First visit: nothing to show yet, so the whole page is one clear call to action. */
function OpeningScene() {
  const steps = [
    { title: 'Read', body: 'Upload a PDF or Word file, or paste text. It is read in memory and never stored.' },
    { title: 'Separate', body: 'What you have done, what you studied, and what you plan to learn are kept apart.' },
    { title: 'Match', body: 'See the Delhi-NCR roles you are closest to, and exactly what stands in between.' },
  ];
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface grain">
      <div className="absolute inset-0 spotlight" />
      <div className="relative grid lg:grid-cols-[1.25fr_1fr] gap-10 p-8 sm:p-12">
        <div>
          <p className="eyebrow text-accent">Scene one</p>
          <h2 className="headline text-5xl sm:text-6xl mt-4">
            Your first act is <em>on paper.</em>
            <br />
            Let&rsquo;s read it.
          </h2>
          <p className="text-fg-muted mt-5 max-w-lg leading-relaxed">
            Every skill we find keeps the sentence it came from, with a suggested level and the reason for it. Nothing is saved until you confirm it.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <LinkButton to="/app/seeker/resume" size="lg" icon={<Upload className="w-4 h-4" />}>
              Read my resume
            </LinkButton>
            <LinkButton to="/app/seeker/skills" size="lg" kind="secondary">
              Add skills by hand
            </LinkButton>
          </div>
        </div>
        <ol className="space-y-3 self-center">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl border border-line bg-surface-2/60 p-4">
              <span className="font-display text-3xl leading-none text-accent w-6">{i + 1}</span>
              <div>
                <p className="font-medium text-fg">{s.title}</p>
                <p className="text-sm text-fg-subtle mt-1 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function NextAct({ role, plan, weeklyHours, current }: { role: RoleEvaluation; plan?: LearningPlan; weeklyHours: number | null; current: string | null }) {
  const after = plan?.fit_after_learning ?? null;
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-accent/25 bg-surface lg:col-span-8 grain">
      <div className="absolute inset-0 spotlight opacity-80" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-start justify-between">
          <div className="min-w-0">
            <p className="eyebrow text-accent">Your next act</p>
            <h2 className="headline text-4xl sm:text-5xl mt-3">{role.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <ReadinessBadge status={role.readiness_status} />
              <Badge tone="grey">{familyLabel(role.family)}</Badge>
              {current ? <Badge tone="grey">from {current}</Badge> : null}
            </div>
          </div>
          <FitDial score={role.role_fit_score} size={96} label="est. fit" />
        </div>

        {plan ? (
          <div className="mt-8">
            <div className="flex items-end justify-between text-xs mb-2">
              <span className="text-fg-muted">
                Estimated fit <span className="font-mono text-fg">{Math.round(role.role_fit_score ?? 0)}</span> now
                {after !== null && after > (role.role_fit_score ?? 0) ? (
                  <>
                    {' '}
                    → <span className="font-mono text-accent">{Math.round(after)}</span> after the plan
                  </>
                ) : null}
              </span>
              <span className="text-fg-subtle">{hoursLabel(plan.total_hours, weeklyHours)}</span>
            </div>
            <FitTrack now={role.role_fit_score} after={after} />
            <div className="mt-7 grid md:grid-cols-[1fr_auto] gap-6 items-end">
              <div>
                <p className="eyebrow mb-4">Start here</p>
                <PlanSteps plan={plan} limit={2} />
              </div>
              <div className="flex md:flex-col gap-2">
                <LinkButton to={`/app/seeker/roles/${role.role_id}`} icon={<ArrowRight className="w-4 h-4" />}>
                  Open the plan
                </LinkButton>
                <LinkButton to="/app/seeker/prove" kind="secondary" icon={<GraduationCap className="w-4 h-4" />}>
                  Prove a skill
                </LinkButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function NoRoleYet() {
  return (
    <Card className="lg:col-span-8 p-8 flex flex-col justify-center">
      <p className="eyebrow text-coral">No role clears the bar yet</p>
      <h2 className="headline text-4xl mt-3">A few more skills will open doors.</h2>
      <p className="text-sm text-fg-muted mt-3 max-w-lg leading-relaxed">
        Most core requirements need level 3 (Independent). Check the levels on your skills, add what your resume left out, or look at stretch roles to see what blocks them.
      </p>
      <div className="flex flex-wrap gap-2 mt-6">
        <LinkButton to="/app/seeker/skills">Review my levels</LinkButton>
        <LinkButton to="/app/seeker/roles" kind="secondary">
          See stretch roles
        </LinkButton>
      </div>
    </Card>
  );
}

function Journey({ items }: { items: Array<{ label: string; done: boolean; to: string; hint: string }> }) {
  const done = items.filter((i) => i.done).length;
  return (
    <Card className="lg:col-span-4 p-6 flex flex-col">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Your journey</p>
        <p className="font-mono text-xs text-fg-subtle">
          {done}/{items.length}
        </p>
      </div>
      <div className="flex gap-1 mt-4">
        {items.map((i) => (
          <span key={i.label} className={cn('h-1 flex-1 rounded-full', i.done ? 'bg-accent' : 'bg-surface-3')} />
        ))}
      </div>
      <ul className="mt-5 space-y-1 flex-1">
        {items.map((i) => (
          <li key={i.label}>
            <Link to={i.to} className="flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-surface-2 group">
              <span className={cn('w-6 h-6 rounded-full border flex items-center justify-center shrink-0', i.done ? 'bg-accent border-accent text-accent-ink' : 'border-line-strong text-transparent')}>
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
              <span className="min-w-0">
                <span className={cn('block text-sm', i.done ? 'text-fg-muted line-through decoration-fg-subtle/50' : 'text-fg font-medium')}>{i.label}</span>
                {!i.done ? <span className="block text-[11px] text-fg-subtle truncate">{i.hint}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const STATUS_ORDER: SkillStatus[] = ['verified', 'self_reported', 'inferred', 'not_demonstrated'];
const STATUS_BAR: Record<SkillStatus, string> = { verified: 'bg-sage', self_reported: 'bg-accent', inferred: 'bg-coral', not_demonstrated: 'bg-ember', unknown: 'bg-surface-3' };

function SkillSnapshot({ skills }: { skills: WorkerSkill[] }) {
  const evidenced = skills.filter((s) => s.status !== 'unknown');
  const counts = STATUS_ORDER.map((s) => ({ status: s, n: evidenced.filter((x) => x.status === s).length })).filter((c) => c.n > 0);
  const strongest = [...evidenced].sort((a, b) => Number(b.status === 'verified') - Number(a.status === 'verified') || (b.proficiency ?? 0) - (a.proficiency ?? 0)).slice(0, 5);
  const quote = evidenced.find((s) => s.evidence_snippet && s.evidence_snippet.length < 140);
  return (
    <Card className="p-6">
      <SectionTitle title="What you already bring" subtitle={`${evidenced.length} skills with evidence`} right={<SeeAll to="/app/seeker/skills">Manage</SeeAll>} />
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {counts.map((c) => (
          <span key={c.status} className={STATUS_BAR[c.status]} style={{ flexGrow: c.n }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {counts.map((c) => (
          <span key={c.status} className="text-[11px] text-fg-subtle inline-flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_BAR[c.status])} />
            {STATUS_META[c.status].label} <span className="font-mono text-fg-muted">{c.n}</span>
          </span>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {strongest.map((s) => (
          <div key={s.skill_id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-fg truncate">{s.name}</span>
            <LevelBar level={s.proficiency} />
          </div>
        ))}
      </div>
      {quote ? (
        <p className="mt-5 pt-4 border-t border-line text-xs text-fg-subtle flex gap-2 leading-relaxed">
          <Quote className="w-3.5 h-3.5 shrink-0 text-accent mt-0.5" />
          <span className="italic">{quote.evidence_snippet}</span>
        </p>
      ) : null}
    </Card>
  );
}

function PeopleCard({ icon, title, body, to, cta }: { icon: React.ReactNode; title: string; body: string; to: string; cta: string }) {
  return (
    <Link to={to} className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card hover:border-line-strong transition-colors">
      <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-accent shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-xs text-fg-subtle truncate">{body}</p>
      </div>
      <span className="text-xs font-medium text-fg-muted group-hover:text-accent inline-flex items-center gap-1">
        {cta} <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

export default function Overview() {
  const me = useMe();
  const id = me.profile_id!;
  const profile = useProfile(id);
  const skills = useSkills(id);
  const recs = useRecommendations(id);
  const mentorships = useMentorships(id);
  const shares = useShares(id);

  const header = (
    <header className="mb-8 animate-rise">
      <p className="eyebrow">{[me.sector ? SECTOR_LABEL[me.sector] : null, new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })].filter(Boolean).join(' · ')}</p>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mt-3">
        <h1 className="headline text-[2.6rem] sm:text-6xl">
          {greeting()}, <em>{firstName(me.display_name)}.</em>
        </h1>
        <div className="flex gap-2">
          <LinkButton to="/app/seeker/resume" kind="secondary" icon={<FileText className="w-4 h-4" />}>
            Resume
          </LinkButton>
          <LinkButton to="/app/seeker/roles" kind="secondary" icon={<Target className="w-4 h-4" />}>
            All roles
          </LinkButton>
        </div>
      </div>
    </header>
  );

  if (skills.isPending || recs.isPending) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    );
  }
  if (skills.isError) return <ErrorState error={skills.error} onRetry={() => void skills.refetch()} />;
  if (recs.isError) return <ErrorState error={recs.error} onRetry={() => void recs.refetch()} />;

  const all = skills.data.skills;
  const evidenced = all.filter((s) => s.status !== 'unknown');
  const r = recs.data;
  const weekly = profile.data?.preferences.weekly_learning_hours ?? null;
  const currentTitle = profile.data?.current_role_title ?? null;
  const isCurrent = (e: RoleEvaluation) => r.notes?.[e.role_id]?.is_current ?? (currentTitle !== null && e.title === currentTitle);
  const stepBack = (e: RoleEvaluation) => r.notes?.[e.role_id]?.step_back ?? false;
  const reachable = [...r.top, ...r.other_eligible];
  // The next act is a real move: never the current role, and a step back only if nothing else is in reach.
  const next = reachable.find((e) => !isCurrent(e) && !stepBack(e)) ?? reachable.find((e) => !isCurrent(e)) ?? null;
  const nearby = [...reachable, ...r.stretch].filter((e) => e.role_id !== next?.role_id).slice(0, 6);
  const activeMentors = (mentorships.data ?? []).filter((m) => m.status === 'accepted' || m.status === 'requested').length;
  const activeShares = (shares.data ?? []).filter((s) => !s.revoked_at).length;

  if (evidenced.length === 0) {
    return (
      <>
        {header}
        <OpeningScene />
      </>
    );
  }

  const journey = [
    { label: 'Resume read', done: evidenced.length > 0, to: '/app/seeker/resume', hint: 'Upload or paste it' },
    { label: 'Skills confirmed', done: evidenced.length > 0 && !all.some((s) => s.status === 'inferred'), to: '/app/seeker/skills', hint: 'Some suggestions wait for you' },
    { label: 'A role within reach', done: r.top.length > 0, to: '/app/seeker/roles', hint: 'Raise a level or add a skill' },
    { label: 'A skill proven', done: all.some((s) => s.status === 'verified'), to: '/app/seeker/prove', hint: 'Short assessments, 10 minutes' },
    { label: 'A mentor in your corner', done: activeMentors > 0, to: '/app/seeker/mentors', hint: 'Someone who made this move' },
    { label: 'Shared with a recruiter', done: activeShares > 0, to: '/app/seeker/sharing', hint: 'Only what you approve' },
  ];

  return (
    <>
      {header}
      <div className="space-y-6">
        <div className="grid lg:grid-cols-12 gap-5">
          {next ? <NextAct role={next} plan={r.plans?.[next.role_id]} weeklyHours={weekly} current={currentTitle} /> : <NoRoleYet />}
          <Journey items={journey} />
        </div>

        <div className="grid lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-7 p-6">
            <SectionTitle
              title="Study next"
              subtitle="The skills that move the most of your nearby roles per hour of study."
              right={weekly ? null : <SeeAll to="/app/seeker/settings">Set weekly hours</SeeAll>}
            />
            {r.study_next && r.study_next.length > 0 ? (
              <StudyNextList items={r.study_next} weeklyHours={weekly} />
            ) : (
              <p className="text-sm text-fg-subtle">Nothing to study across your nearby roles. Prove what you have instead.</p>
            )}
          </Card>
          <div className="lg:col-span-5">
            <SkillSnapshot skills={all} />
          </div>
        </div>

        {nearby.length > 0 ? (
          <section>
            <SectionTitle title="Other roles near you" subtitle={r.score_disclaimer} right={<SeeAll to="/app/seeker/roles" />} />
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {nearby.map((role) => (
                <RoleCard key={role.role_id} role={role} plan={r.plans?.[role.role_id]} weeklyHours={weekly} current={isCurrent(role)} stepBack={stepBack(role)} compact />
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid md:grid-cols-2 gap-4">
          <PeopleCard
            icon={<Users className="w-5 h-5" />}
            title="Mentors"
            body={activeMentors ? `${activeMentors} active request${activeMentors > 1 ? 's' : ''}` : 'Talk to someone who made this move'}
            to="/app/seeker/mentors"
            cta={activeMentors ? 'Open' : 'Find one'}
          />
          <PeopleCard
            icon={<Share2 className="w-5 h-5" />}
            title="Sharing with recruiters"
            body={activeShares ? `Shared with ${activeShares} organisation${activeShares > 1 ? 's' : ''}` : 'Nothing shared. You decide what and with whom.'}
            to="/app/seeker/sharing"
            cta="Manage"
          />
        </div>

        <p className="text-[11px] font-mono text-fg-subtle flex items-center gap-2">
          <Sparkles className="w-3 h-3" /> {r.scoring_version} · {r.dataset_version} · computed {formatDateTime(r.computed_at)}
        </p>
      </div>
    </>
  );
}
