import { Check, Lock, Plus, Quote, Sparkles, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMe } from '../../auth/AuthProvider';
import { errorMessage } from '../../lib/api';
import { useImportSkills, useOnboardingOptions, useReviewSkills, useSkills } from '../../lib/queries';
import type { SkillStatus, WorkerSkill } from '../../lib/types';
import { Badge, Button, Card, cn, Empty, ErrorState, LEVEL_LABELS, LinkButton, Notice, PageHeader, Select, SectionTitle, Skeleton, STATUS_META, StatusBadge } from '../../ui/kit';

const ORDER: SkillStatus[] = ['verified', 'self_reported', 'inferred', 'not_demonstrated'];
const WEIGHT: Partial<Record<SkillStatus, string>> = { verified: '100%', self_reported: '70%', inferred: '40%', not_demonstrated: '0%' };

function LevelControl({ value, disabled, onChange, name }: { value: number; disabled?: boolean; onChange: (v: number) => void; name: string }) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface-2 p-0.5', disabled && 'opacity-50')} role="radiogroup" aria-label={`Level for ${name}`}>
      {[1, 2, 3, 4].map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          disabled={disabled}
          title={`${l} · ${LEVEL_LABELS[l]}`}
          onClick={() => onChange(l)}
          className={cn('h-7 min-w-[2rem] px-2 rounded-lg text-[11px] font-medium transition-colors', value === l ? 'bg-accent text-accent-ink' : 'text-fg-subtle hover:text-fg disabled:hover:text-fg-subtle')}
        >
          <span className="sm:hidden">{l}</span>
          <span className="hidden sm:inline">{LEVEL_LABELS[l]}</span>
        </button>
      ))}
    </div>
  );
}

export default function Skills() {
  const me = useMe();
  const id = me.profile_id!;
  const skills = useSkills(id);
  const review = useReviewSkills(id);
  const add = useImportSkills(id);
  const options = useOnboardingOptions();
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState('2');

  const grouped = useMemo(() => {
    const map = new Map<string, WorkerSkill[]>();
    for (const s of skills.data?.skills ?? []) {
      if (s.status === 'unknown') continue;
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [skills.data]);

  const header = (
    <PageHeader
      eyebrow="Your evidence"
      title={
        <>
          What you <em>bring</em>
        </>
      }
      subtitle="Every skill shows where it came from. Confirm, correct or remove anything. Verified skills only change through an assessment."
      actions={<LinkButton to="/app/seeker/resume" kind="secondary" icon={<Upload className="w-4 h-4" />}>Read a resume</LinkButton>}
    />
  );

  if (skills.isPending) {
    return (
      <>
        {header}
        <Skeleton className="h-24 rounded-2xl mb-6" />
        <Skeleton className="h-80 rounded-2xl" />
      </>
    );
  }
  if (skills.isError) return <ErrorState error={skills.error} onRetry={() => void skills.refetch()} />;

  const all = skills.data.skills.filter((s) => s.status !== 'unknown');
  const held = new Set(all.map((s) => s.skill_id.replace(/^ncr-/, '')));
  const addable = (options.data?.skills ?? []).filter((s) => !held.has(s.id));
  const pending = all.filter((s) => s.status === 'inferred');
  const counts = ORDER.map((s) => ({ status: s, n: all.filter((x) => x.status === s).length }));

  return (
    <>
      {header}
      {review.isError ? (
        <div className="mb-4">
          <Notice tone="danger">{errorMessage(review.error)}</Notice>
        </div>
      ) : null}

      {all.length === 0 ? (
        <Empty icon={<Sparkles className="w-5 h-5" />} title="No skills yet" action={<LinkButton to="/app/seeker/resume">Read my resume</LinkButton>}>
          Start with your resume. Every skill we find keeps the sentence it came from.
        </Empty>
      ) : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {counts.map((c) => (
                <div key={c.status} className="rounded-2xl border border-line bg-surface p-4">
                  <Badge tone={STATUS_META[c.status].tone} dot>
                    {STATUS_META[c.status].label}
                  </Badge>
                  <p className="font-display text-4xl text-fg mt-3 leading-none">{c.n}</p>
                  <p className="text-[11px] text-fg-subtle mt-2">counts at {WEIGHT[c.status]}</p>
                </div>
              ))}
            </div>

            {pending.length > 0 ? (
              <Card tone="coral" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-fg-muted">
                  <span className="text-fg font-medium">{pending.length} suggestion{pending.length === 1 ? '' : 's'}</span> inferred from your work history wait for your review. Until then they count at 40%.
                </p>
                <Button
                  size="sm"
                  icon={<Check className="w-3.5 h-3.5" />}
                  loading={review.isPending}
                  onClick={() => review.mutate(pending.map((s) => ({ skill_id: s.skill_id, action: 'confirm' as const })))}
                >
                  Confirm all
                </Button>
              </Card>
            ) : null}

            {grouped.map(([category, list]) => (
              <section key={category} className="rounded-2xl border border-line bg-surface shadow-card overflow-hidden">
                <div className="px-5 py-3 border-b border-line flex items-center justify-between">
                  <p className="eyebrow">{category}</p>
                  <span className="font-mono text-[11px] text-fg-subtle">{list.length}</span>
                </div>
                <div className="divide-y divide-line">
                  {list.map((s) => {
                    const locked = s.status === 'verified' || s.status === 'not_demonstrated';
                    return (
                      <div key={s.skill_id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-fg">{s.name}</span>
                            <StatusBadge status={s.status} />
                            {s.verified_by ? (
                              <Badge tone="sage">
                                Assessment {s.verified_by.score}/{s.verified_by.max_score}
                              </Badge>
                            ) : null}
                          </div>
                          {s.evidence_snippet ? (
                            <p className="text-sm text-fg-subtle mt-1.5 flex gap-2">
                              <Quote className="w-3.5 h-3.5 text-accent/60 shrink-0 mt-0.5" />
                              <span className="italic line-clamp-2">{s.evidence_snippet}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-fg-subtle mt-1">Added by you</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {locked ? <Lock className="w-3.5 h-3.5 text-fg-subtle" aria-label="Changes only through an assessment" /> : null}
                          <LevelControl
                            name={s.name}
                            value={s.proficiency ?? 0}
                            disabled={locked || review.isPending}
                            onChange={(level) => review.mutate([{ skill_id: s.skill_id, action: 'edit', proficiency: level }])}
                          />
                          {s.status === 'inferred' ? (
                            <Button size="sm" kind="secondary" icon={<Check className="w-3.5 h-3.5" />} onClick={() => review.mutate([{ skill_id: s.skill_id, action: 'confirm' }])}>
                              Confirm
                            </Button>
                          ) : null}
                          {!locked ? (
                            <Button size="sm" kind="ghost" title="Remove" aria-label={`Remove ${s.name}`} onClick={() => review.mutate([{ skill_id: s.skill_id, action: 'reject' }])}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            {me.catalogue === 'ncr' ? (
              <Card className="p-5">
                <SectionTitle title="Add a skill" subtitle="Something your resume did not say? Add it as your own claim." />
                <div className="space-y-3">
                  <Select label="Skill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}>
                    <option value="">Choose a skill…</option>
                    {addable.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.category}
                      </option>
                    ))}
                  </Select>
                  <Select label="Your level" value={newLevel} onChange={(e) => setNewLevel(e.target.value)}>
                    {[1, 2, 3, 4].map((l) => (
                      <option key={l} value={l}>
                        {l} · {LEVEL_LABELS[l]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    className="w-full"
                    icon={<Plus className="w-4 h-4" />}
                    disabled={!newSkill}
                    loading={add.isPending}
                    onClick={() => add.mutate({ skills: [{ skill_id: newSkill, level: Number(newLevel), mention_type: 'explicit_current' }] }, { onSuccess: () => setNewSkill('') })}
                  >
                    Add skill
                  </Button>
                  {add.isError ? <Notice tone="danger">{errorMessage(add.error)}</Notice> : null}
                </div>
              </Card>
            ) : null}
            <Card tone="muted" className="p-5">
              <p className="eyebrow mb-3">The level scale</p>
              <ol className="space-y-2 text-sm">
                {[
                  ['Aware', 'You know what it is and why it matters.'],
                  ['Practiced', 'You have done it with help or occasionally.'],
                  ['Independent', 'You do it on your own, reliably, at work.'],
                  ['Expert', 'Others come to you; you could teach it.'],
                ].map(([label, body], i) => (
                  <li key={label} className="flex gap-3">
                    <span className="font-mono text-xs text-accent w-3 pt-0.5">{i + 1}</span>
                    <span>
                      <span className="text-fg">{label}</span>
                      <span className="block text-xs text-fg-subtle">{body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}
