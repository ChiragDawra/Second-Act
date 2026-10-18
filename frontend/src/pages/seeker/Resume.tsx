import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Check, FileUp, Lock, Quote, RotateCcw, Sparkles, X } from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useMe } from '../../auth/AuthProvider';
import { api, errorMessage } from '../../lib/api';
import { hoursLabel } from '../../lib/format';
import { useExtractResume, useImportSkills, useProfile } from '../../lib/queries';
import type { NcrDetectedRole, NcrExtractedSkill, NcrExtraction, NcrMentionType, NcrRecommendation, NcrRole } from '../../lib/types';
import { PlanSteps, StudyNextList } from '../../ui/journey';
import { Badge, Button, Card, cn, FitDial, LEVEL_LABELS, LinkButton, Notice, PageHeader, ReadinessBadge, SectionTitle, Skeleton, type Tone } from '../../ui/kit';
import { RoleCard } from '../../ui/RoleCard';

const MENTION: Record<NcrMentionType, { label: string; tone: Tone }> = {
  explicit_current: { label: 'You did this', tone: 'accent' },
  coursework: { label: 'Course or training', tone: 'azure' },
  ambiguous: { label: 'Needs your check', tone: 'coral' },
  future_goal: { label: 'Future goal', tone: 'iris' },
  negated_or_no_experience: { label: 'Not done yet', tone: 'grey' },
};

const selectable = (s: NcrExtractedSkill) => s.mention_type === 'explicit_current' || s.mention_type === 'coursework' || s.mention_type === 'ambiguous';
type Choice = { on: boolean; level: number };
type Step = 1 | 2 | 3;

function Stepper({ step }: { step: Step }) {
  const steps = ['Read', 'Review', 'Your roles'];
  return (
    <ol className="flex items-center gap-2 mb-8 text-xs">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] border',
                n < step ? 'bg-accent border-accent text-accent-ink' : n === step ? 'border-accent text-accent' : 'border-line-strong text-fg-subtle',
              )}
            >
              {n < step ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={cn(n === step ? 'text-fg font-medium' : 'text-fg-subtle')}>{label}</span>
            {i < steps.length - 1 ? <span className="w-8 h-px bg-line-strong mx-1" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function LevelPicker({ value, onChange, suggested, disabled }: { value: number; onChange: (v: number) => void; suggested: number | null; disabled?: boolean }) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface-2 p-0.5', disabled && 'opacity-40 pointer-events-none')} role="radiogroup" aria-label="Your level">
      {[1, 2, 3, 4].map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          title={`${LEVEL_LABELS[l]}${suggested === l ? ' (suggested)' : ''}`}
          onClick={() => onChange(l)}
          className={cn(
            'relative h-7 px-2.5 text-[11px] font-medium rounded-lg transition-colors',
            value === l ? 'bg-accent text-accent-ink' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {LEVEL_LABELS[l]}
          {suggested === l && value !== l ? <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent" /> : null}
        </button>
      ))}
    </div>
  );
}

function DetectedRole({ role, years, value, onChange }: { role: NcrDetectedRole; years: number | null; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <Card tone="accent" className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
      <div className="min-w-0">
        <p className="eyebrow text-accent">Where you are now</p>
        <p className="text-fg mt-2">
          Looks like you work as <span className="font-semibold">{role.title}</span>
          {years ? <span className="text-fg-muted"> · about {Math.round(years)} years of experience</span> : null}
        </p>
        <p className="text-xs text-fg-subtle mt-1">
          From “{role.matched_text}” in your {role.source === 'job_title' ? 'job titles' : role.source}. We use it as your starting point and never recommend it back to you.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" kind={value === true ? 'primary' : 'secondary'} icon={<Check className="w-3.5 h-3.5" />} onClick={() => onChange(true)}>
          That&rsquo;s me
        </Button>
        <Button size="sm" kind={value === false ? 'contrast' : 'ghost'} onClick={() => onChange(false)}>
          Not quite
        </Button>
      </div>
    </Card>
  );
}

function PreviewRole({ role, weeklyHours }: { role: NcrRole; weeklyHours: number | null }) {
  const plan = role.learning_plan;
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <FitDial score={role.estimated_skill_fit} size={60} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-fg">{role.title}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <ReadinessBadge status={role.readiness_status} />
            <Badge tone="grey">{role.matching_skills.length} matching skills</Badge>
            {plan ? <Badge tone="grey">{hoursLabel(plan.total_hours, weeklyHours)}</Badge> : null}
          </div>
          {role.transition ? (
            <p className="text-xs text-fg-muted mt-3 leading-relaxed">
              <span className="text-accent">A known move from {role.transition.from_title}.</span> {role.transition.rationale}
            </p>
          ) : null}
        </div>
      </div>
      {plan && plan.steps.length > 0 ? (
        <div className="mt-5 pt-5 border-t border-line">
          <PlanSteps plan={plan} limit={3} />
        </div>
      ) : null}
    </Card>
  );
}

export default function Resume() {
  const me = useMe();
  const canSave = me.catalogue === 'ncr';
  const profile = useProfile(me.profile_id!);
  const weekly = profile.data?.preferences.weekly_learning_hours ?? null;
  const extract = useExtractResume();
  const save = useImportSkills(me.profile_id!);
  const preview = useMutation({
    mutationFn: (body: { skills: { skill_id: string; level: number; mention_type: string; evidence: string }[]; current_role_ids?: string[] }) =>
      api<NcrRecommendation>('/ncr/recommend', { method: 'POST', body }),
  });

  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<NcrExtraction | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [roleConfirmed, setRoleConfirmed] = useState<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setResult(null);
    setFile(null);
    setText('');
    save.reset();
    preview.reset();
    extract.reset();
  };

  const run = (payload: { file?: File; text?: string }) =>
    extract.mutate(payload, {
      onSuccess: (data) => {
        setResult(data);
        save.reset();
        preview.reset();
        setRoleConfirmed(null);
        setChoices(
          Object.fromEntries(
            data.extraction.skills.filter(selectable).map((s) => [s.skill_id, { on: s.mention_type === 'explicit_current', level: s.suggested_level ?? 2 }]),
          ),
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const skills = result?.extraction.skills ?? [];
  const detected = result?.extraction.detected_roles?.find((d) => d.most_recent) ?? null;
  const current = skills.filter((s) => s.mention_type === 'explicit_current');
  const check = skills.filter((s) => s.mention_type === 'coursework' || s.mention_type === 'ambiguous');
  const notCounted = skills.filter((s) => !selectable(s));
  const chosen = useMemo(
    () =>
      skills
        .filter((s) => selectable(s) && choices[s.skill_id]?.on)
        .map((s) => ({ skill_id: s.skill_id, level: choices[s.skill_id]!.level, mention_type: s.mention_type, evidence: s.evidence.slice(0, 400) })),
    [skills, choices],
  );
  const currentRoleId = detected && roleConfirmed ? detected.role_id : null;
  const done = save.isSuccess || preview.isSuccess;
  const step: Step = !result ? 1 : done ? 3 : 2;

  const row = (s: NcrExtractedSkill) => {
    const c = choices[s.skill_id] ?? { on: false, level: 2 };
    return (
      <div key={s.skill_id} className={cn('rounded-2xl border p-4 transition-colors', c.on ? 'border-accent/35 bg-accent/[0.05]' : 'border-line bg-surface')}>
        <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
          <label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
            <input
              type="checkbox"
              checked={c.on}
              onChange={() => setChoices((p) => ({ ...p, [s.skill_id]: { ...c, on: !c.on } }))}
              className="mt-1 h-4 w-4 rounded"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-fg">{s.canonical_name}</span>
                <Badge tone={MENTION[s.mention_type].tone}>{MENTION[s.mention_type].label}</Badge>
                <span className="text-[11px] text-fg-subtle">{s.section}</span>
              </div>
              <p className="text-sm text-fg-muted mt-2 flex gap-2">
                <Quote className="w-3.5 h-3.5 text-accent/70 shrink-0 mt-0.5" />
                <span className="italic leading-relaxed">{s.evidence}</span>
              </p>
            </div>
          </label>
          <div className="shrink-0 md:text-right">
            <LevelPicker value={c.level} suggested={s.suggested_level} disabled={!c.on} onChange={(level) => setChoices((p) => ({ ...p, [s.skill_id]: { ...c, level } }))} />
            {s.level_basis ? <p className="text-[11px] text-fg-subtle mt-1.5">Suggested: {s.level_basis.toLowerCase()}</p> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Your evidence"
        title={
          <>
            Read my <em>resume</em>
          </>
        }
        subtitle="Every skill comes with the sentence it was found in, a suggested level and the reason for it. Your resume is read in memory and never stored; nothing is saved until you confirm."
        actions={
          result ? (
            <Button kind="secondary" icon={<RotateCcw className="w-4 h-4" />} onClick={reset}>
              Start over
            </Button>
          ) : null
        }
      />
      <Stepper step={step} />

      {!canSave ? (
        <div className="mb-6">
          <Notice tone="info" title="Demo profile">
            This demo account uses the demo catalogue: you can read a resume and preview Delhi-NCR roles, but saving needs a Google account.
          </Notice>
        </div>
      ) : null}

      {!result ? (
        <Card className="p-0 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
              role="button"
              tabIndex={0}
              className={cn(
                'relative m-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-8 cursor-pointer transition-colors min-h-[260px]',
                dragging ? 'border-accent bg-accent/[0.06]' : 'border-line-strong hover:border-accent/50 bg-surface-2/40',
              )}
            >
              <input
                ref={input}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="w-14 h-14 rounded-2xl bg-accent text-accent-ink flex items-center justify-center shadow-glow">
                <FileUp className="w-6 h-6" />
              </div>
              {file ? (
                <div className="mt-5">
                  <p className="font-medium text-fg">{file.name}</p>
                  <p className="text-xs text-fg-subtle mt-0.5">{(file.size / 1024).toFixed(0)} KB · ready to read</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-ember"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-medium text-fg mt-5">Drop your resume here, or click to choose</p>
                  <p className="text-xs text-fg-subtle mt-1">PDF, Word (.docx) or text · up to 5 MB</p>
                </>
              )}
            </div>
            <div className="flex flex-col p-4 lg:pl-0">
              <label className="text-xs font-medium text-fg-muted" htmlFor="resume-text">
                …or paste the text
              </label>
              <textarea
                id="resume-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'Skills: Excel, SQL (basic), Jira\n\nExperience:\nOperations Executive | HDFC Bank | 2019 – Present\n- Daily reconciliation of NEFT and RTGS files\n\nGoals: planning to learn Power BI'}
                className="mt-1.5 flex-1 min-h-[220px] w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm font-mono text-fg placeholder:text-fg-subtle/70 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-line bg-surface-2/40">
            <p className="text-xs text-fg-subtle flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Rules, not an AI model · read in memory, never stored · scanned images need OCR
            </p>
            <Button icon={<Sparkles className="w-4 h-4" />} loading={extract.isPending} disabled={!file && text.trim().length < 20} onClick={() => run(file ? { file } : { text })}>
              Read my resume
            </Button>
          </div>
          {extract.isPending ? (
            <div className="px-5 pb-5 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <p className="text-xs text-fg-subtle">Separating what you have done from what you plan to learn…</p>
            </div>
          ) : null}
          {extract.isError ? (
            <div className="px-5 pb-5">
              <Notice tone="danger">{errorMessage(extract.error)}</Notice>
            </div>
          ) : null}
        </Card>
      ) : null}

      {result && !done ? (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            {[
              { n: current.length, label: 'things you have done', tone: 'text-accent' },
              { n: check.length, label: 'courses or unclear', tone: 'text-azure' },
              { n: notCounted.length, label: 'goals, not skills', tone: 'text-iris' },
            ].map((x) => (
              <Card key={x.label} className="p-4">
                <p className={cn('font-display text-4xl leading-none', x.tone)}>{x.n}</p>
                <p className="text-xs text-fg-subtle mt-2">{x.label}</p>
              </Card>
            ))}
          </div>

          {detected ? (
            <DetectedRole role={detected} years={result.extraction.experience_years ?? null} value={roleConfirmed} onChange={setRoleConfirmed} />
          ) : null}

          {result.extraction.warnings.some((w) => w.startsWith('conflicting_evidence')) ? (
            <Notice tone="warn" title="Some skills are both claimed and denied">
              Your resume lists a skill as current and also says you have not used it. Set the level you can honestly defend.
            </Notice>
          ) : null}

          {current.length > 0 ? (
            <section>
              <SectionTitle title="What you have done" subtitle="Selected for you. Untick anything that is not true, and check each level." />
              <div className="space-y-2.5">{current.map(row)}</div>
            </section>
          ) : (
            <Notice tone="warn" title="No current skills found">
              Nothing from the Delhi-NCR skill list was found as something you have done. Try pasting your skills and experience sections, or add skills by hand on the Skills page.
            </Notice>
          )}

          {check.length > 0 ? (
            <section>
              <SectionTitle title="Courses and unclear mentions" subtitle="Not selected. A course is exposure, not proof — tick only what you can do today." />
              <div className="space-y-2.5">{check.map(row)}</div>
            </section>
          ) : null}

          {notCounted.length > 0 ? (
            <section>
              <SectionTitle title="Goals — not counted as skills" subtitle="Plans and “not yet” statements never become skills. Learn them, then prove them." />
              <Card tone="muted" className="divide-y divide-line p-0">
                {notCounted.map((s) => (
                  <div key={s.skill_id} className="flex flex-wrap items-start gap-2 text-sm px-5 py-3">
                    <Badge tone={MENTION[s.mention_type].tone}>{MENTION[s.mention_type].label}</Badge>
                    <span className="font-medium text-fg">{s.canonical_name}</span>
                    <span className="text-fg-subtle italic">“{s.evidence}”</span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}

          <div className="sticky bottom-24 lg:bottom-6 z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface-2/95 backdrop-blur-xl px-5 py-4 shadow-pop">
              <p className="text-sm text-fg-muted">
                <span className="font-display text-2xl text-fg align-middle mr-1">{chosen.length}</span> skill{chosen.length === 1 ? '' : 's'} selected · saved as{' '}
                <span className="text-fg">self-reported</span>; only an assessment verifies.
              </p>
              {canSave ? (
                <Button
                  icon={<ArrowRight className="w-4 h-4" />}
                  loading={save.isPending}
                  disabled={chosen.length === 0}
                  onClick={() => save.mutate({ skills: chosen, currentRoleId })}
                >
                  Save and see my roles
                </Button>
              ) : (
                <Button
                  icon={<ArrowRight className="w-4 h-4" />}
                  loading={preview.isPending}
                  disabled={chosen.length === 0}
                  onClick={() => preview.mutate({ skills: chosen, current_role_ids: currentRoleId ? [currentRoleId] : undefined })}
                >
                  Preview my roles
                </Button>
              )}
            </div>
            {save.isError ? (
              <div className="mt-3">
                <Notice tone="danger">{errorMessage(save.error)}</Notice>
              </div>
            ) : null}
            {preview.isError ? (
              <div className="mt-3">
                <Notice tone="danger">{errorMessage(preview.error)}</Notice>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {save.isSuccess ? (
        <div className="space-y-8">
          <Notice tone="success" title={`Saved ${save.data.imported.length} skills to your profile`}>
            Your roles were recalculated from this evidence.
          </Notice>
          {save.data.recommendations.top.length > 0 ? (
            <section>
              <SectionTitle title="Your nearest roles" subtitle={save.data.recommendations.score_disclaimer} />
              <div className="grid md:grid-cols-3 gap-4">
                {save.data.recommendations.top.map((r, i) => (
                  <RoleCard key={r.role_id} role={r} plan={save.data.recommendations.plans?.[r.role_id]} weeklyHours={weekly} highlight={i === 0} />
                ))}
              </div>
            </section>
          ) : (
            <Notice tone="info">No role clears the recommendation bar yet. Check your levels on the Skills page; most roles need level 3 (Independent) in their core skills.</Notice>
          )}
          {save.data.recommendations.study_next?.length ? (
            <Card className="p-6">
              <SectionTitle title="Study next" subtitle="The skills that move the most of these roles per hour." />
              <StudyNextList items={save.data.recommendations.study_next} weeklyHours={weekly} />
            </Card>
          ) : null}
          <div className="flex gap-2">
            <LinkButton to="/app/seeker" icon={<ArrowRight className="w-4 h-4" />}>
              Go to my dashboard
            </LinkButton>
            <LinkButton to="/app/seeker/skills" kind="secondary">
              Review my skills
            </LinkButton>
          </div>
        </div>
      ) : null}

      {preview.isSuccess ? (
        <div className="space-y-8">
          <Notice tone="info" title="Preview only">
            Estimated skill fit against the Delhi-NCR pilot roles — not a hiring probability, and not saved.
          </Notice>
          {preview.data.current_roles?.length ? (
            <p className="text-sm text-fg-muted">
              Starting point: <span className="text-fg">{preview.data.current_roles.map((c) => c.title).join(', ')}</span> (estimated fit {Math.round(preview.data.current_roles[0]!.estimated_skill_fit ?? 0)}).
            </p>
          ) : null}
          {preview.data.message ? <Notice tone="info">{preview.data.message}</Notice> : null}
          <div className="grid lg:grid-cols-2 gap-4">
            {[...preview.data.top_roles, ...preview.data.stretch_roles].map((r) => (
              <PreviewRole key={r.role_id} role={r} weeklyHours={weekly} />
            ))}
          </div>
          {preview.data.study_next?.length ? (
            <Card className="p-6">
              <SectionTitle title="Study next" subtitle="The skills that move the most of these roles per hour." />
              <StudyNextList items={preview.data.study_next} weeklyHours={weekly} linkRoles={false} />
            </Card>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
