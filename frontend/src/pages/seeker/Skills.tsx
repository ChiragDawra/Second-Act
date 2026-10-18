import { Check, Plus, Quote, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { errorMessage } from '../../lib/api';
import { useImportSkills, useOnboardingOptions, useReviewSkills, useSkills } from '../../lib/queries';
import type { WorkerSkill } from '../../lib/types';
import { Badge, Button, Card, Empty, ErrorState, LEVEL_LABELS, Notice, PageHeader, Select, SectionTitle, Spinner, StatusBadge } from '../../ui/kit';

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
      if (s.status === 'unknown' && s.review_state === 'rejected') continue;
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [skills.data]);

  if (skills.isPending) return <Spinner />;
  if (skills.isError) return <ErrorState error={skills.error} onRetry={() => void skills.refetch()} />;

  const held = new Set(skills.data.skills.filter((s) => s.status !== 'unknown').map((s) => s.skill_id.replace(/^ncr-/, '')));
  const addable = (options.data?.skills ?? []).filter((s) => !held.has(s.id));
  const pending = skills.data.skills.filter((s) => s.status === 'inferred');

  return (
    <>
      <PageHeader
        eyebrow="Your evidence"
        title="Skills"
        subtitle="Every skill shows where it came from. You can confirm, correct or remove anything. Verified skills change only through an assessment."
        actions={
          pending.length > 0 ? (
            <Button
              icon={<Check className="w-4 h-4" />}
              loading={review.isPending}
              onClick={() => review.mutate(pending.map((s) => ({ skill_id: s.skill_id, action: 'confirm' as const })))}
            >
              Confirm all {pending.length}
            </Button>
          ) : undefined
        }
      />

      {review.isError ? (
        <div className="mb-4">
          <Notice tone="danger">{errorMessage(review.error)}</Notice>
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <Empty
          icon={<Sparkles className="w-5 h-5" />}
          title="No skills yet"
          action={
            <Link to="/app/seeker/resume">
              <Button>Read my resume</Button>
            </Link>
          }
        >
          Start with your resume. Every skill we find keeps the sentence it came from.
        </Empty>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, list]) => (
            <Card key={category} className="p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-ink-100 bg-ink-50/60">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{category}</p>
              </div>
              <div className="divide-y divide-ink-100">
                {list.map((s) => {
                  const locked = s.status === 'verified' || s.status === 'not_demonstrated';
                  return (
                    <div key={s.skill_id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink-950">{s.name}</span>
                          <StatusBadge status={s.status} />
                          {s.verified_by ? <Badge tone="green">Assessment {s.verified_by.score}/{s.verified_by.max_score}</Badge> : null}
                        </div>
                        {s.evidence_snippet ? (
                          <p className="text-sm text-ink-500 mt-1 flex gap-1.5">
                            <Quote className="w-3.5 h-3.5 text-ink-300 shrink-0 mt-0.5" />
                            <span className="italic line-clamp-2">{s.evidence_snippet}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-ink-400 mt-1">Added by you</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          disabled={locked || review.isPending}
                          value={s.proficiency ?? 0}
                          onChange={(e) => review.mutate([{ skill_id: s.skill_id, action: 'edit', proficiency: Number(e.target.value) }])}
                          className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-800 disabled:opacity-50"
                          aria-label={`Level for ${s.name}`}
                        >
                          {LEVEL_LABELS.map((l, i) => (
                            <option key={l} value={i}>
                              {i} · {l}
                            </option>
                          ))}
                        </select>
                        {s.status === 'inferred' ? (
                          <Button size="sm" kind="secondary" icon={<Check className="w-3.5 h-3.5" />} onClick={() => review.mutate([{ skill_id: s.skill_id, action: 'confirm' }])}>
                            Confirm
                          </Button>
                        ) : null}
                        {!locked && s.status !== 'unknown' ? (
                          <Button size="sm" kind="ghost" title="Remove" onClick={() => review.mutate([{ skill_id: s.skill_id, action: 'reject' }])}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {me.catalogue === 'ncr' ? (
        <Card className="mt-8">
          <SectionTitle title="Add a skill" subtitle="Something your resume did not say? Add it as your own claim." />
          <div className="grid sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
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
              icon={<Plus className="w-4 h-4" />}
              disabled={!newSkill}
              loading={add.isPending}
              onClick={() =>
                add.mutate([{ skill_id: newSkill, level: Number(newLevel), mention_type: 'explicit_current' }], { onSuccess: () => setNewSkill('') })
              }
            >
              Add
            </Button>
          </div>
          {add.isError ? (
            <div className="mt-3">
              <Notice tone="danger">{errorMessage(add.error)}</Notice>
            </div>
          ) : null}
        </Card>
      ) : null}

      <p className="text-[11px] text-ink-400 mt-6">
        Levels: 1 Aware · 2 Practiced · 3 Independent · 4 Expert. Self-reported counts at 70% weight, inferred at 40%, verified at 100%.
      </p>
    </>
  );
}
