import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, FileUp, Info, Quote, Sparkles, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { api, errorMessage } from '../../lib/api';
import { useExtractResume, useImportSkills } from '../../lib/queries';
import type { NcrExtractedSkill, NcrExtraction, NcrMentionType, NcrRecommendation } from '../../lib/types';
import { Badge, Button, Card, cn, FitDial, LEVEL_LABELS, Notice, PageHeader, SectionTitle } from '../../ui/kit';
import { RoleCard } from '../../ui/RoleCard';

const MENTION: Record<NcrMentionType, { label: string; tone: 'sap' | 'amber' | 'grey' | 'violet' | 'red' }> = {
  explicit_current: { label: 'Current claim', tone: 'sap' },
  coursework: { label: 'Course or exposure', tone: 'amber' },
  ambiguous: { label: 'Needs your check', tone: 'amber' },
  future_goal: { label: 'Future goal', tone: 'violet' },
  negated_or_no_experience: { label: 'No experience stated', tone: 'grey' },
};

const selectable = (s: NcrExtractedSkill) => s.mention_type === 'explicit_current' || s.mention_type === 'coursework' || s.mention_type === 'ambiguous';
type Choice = { on: boolean; level: number };

function LevelPicker({ value, onChange, suggested }: { value: number; onChange: (v: number) => void; suggested: number | null }) {
  return (
    <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
      {[1, 2, 3, 4].map((l) => (
        <button
          key={l}
          type="button"
          title={`${LEVEL_LABELS[l]}${suggested === l ? ' (stated in your resume)' : ''}`}
          onClick={() => onChange(l)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors relative',
            value === l ? 'bg-ink-950 text-white' : 'text-ink-500 hover:text-ink-900',
          )}
        >
          {LEVEL_LABELS[l]}
          {suggested === l && value !== l ? <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-sap-500" /> : null}
        </button>
      ))}
    </div>
  );
}

export default function Resume() {
  const me = useMe();
  const canSave = me.catalogue === 'ncr';
  const extract = useExtractResume();
  const save = useImportSkills(me.profile_id!);
  const preview = useMutation({
    mutationFn: (skills: { skill_id: string; level: number; mention_type: string; evidence: string }[]) =>
      api<NcrRecommendation>('/ncr/recommend', { method: 'POST', body: { skills } }),
  });

  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<NcrExtraction | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const input = useRef<HTMLInputElement>(null);

  const run = (payload: { file?: File; text?: string }) =>
    extract.mutate(payload, {
      onSuccess: (data) => {
        setResult(data);
        save.reset();
        preview.reset();
        setChoices(
          Object.fromEntries(
            data.extraction.skills.filter(selectable).map((s) => [s.skill_id, { on: s.mention_type === 'explicit_current', level: s.suggested_level ?? 2 }]),
          ),
        );
      },
    });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const skills = result?.extraction.skills ?? [];
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

  const row = (s: NcrExtractedSkill) => {
    const c = choices[s.skill_id] ?? { on: false, level: 2 };
    return (
      <div key={s.skill_id} className={cn('rounded-xl border p-4 transition-colors', c.on ? 'border-sap-300 bg-sap-50/40' : 'border-ink-200 bg-white')}>
        <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
          <label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
            <input
              type="checkbox"
              checked={c.on}
              onChange={() => setChoices((p) => ({ ...p, [s.skill_id]: { ...c, on: !c.on } }))}
              className="mt-1 h-4 w-4 rounded border-ink-300 text-sap-500 focus:ring-sap-500"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-950">{s.canonical_name}</span>
                <Badge tone={MENTION[s.mention_type].tone}>{MENTION[s.mention_type].label}</Badge>
                <span className="text-[11px] text-ink-400">{s.section}</span>
              </div>
              <p className="text-sm text-ink-600 mt-1.5 flex gap-1.5">
                <Quote className="w-3.5 h-3.5 text-ink-300 shrink-0 mt-0.5" />
                <span className="italic">{s.evidence}</span>
              </p>
            </div>
          </label>
          <div className="shrink-0 md:pt-0.5">
            <LevelPicker value={c.level} suggested={s.suggested_level} onChange={(level) => setChoices((p) => ({ ...p, [s.skill_id]: { ...c, level } }))} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Step 1 · Your evidence"
        title="Resume"
        subtitle="We read your resume in memory and show every skill with the sentence it came from. Nothing is saved until you confirm it, and your resume itself is never stored."
      />

      {!canSave ? (
        <div className="mb-6">
          <Notice tone="info" title="Demo profile">
            This demo account uses the demo catalogue, so you can try the reader and preview roles here, but saving needs a Google account (Delhi-NCR catalogue).
          </Notice>
        </div>
      ) : null}

      <Card className="p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => input.current?.click()}
            className={cn(
              'rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-8 cursor-pointer transition-colors min-h-[220px]',
              dragging ? 'border-sap-500 bg-sap-50' : 'border-ink-200 hover:border-sap-300 bg-surface-subtle',
            )}
          >
            <input
              ref={input}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="w-12 h-12 rounded-2xl bg-sap-500 text-white flex items-center justify-center shadow-glow-sap">
              <FileUp className="w-6 h-6" />
            </div>
            {file ? (
              <div className="mt-4">
                <p className="font-semibold text-ink-950">{file.name}</p>
                <p className="text-xs text-ink-500">{(file.size / 1024).toFixed(0)} KB</p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-red-600"
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
                <p className="font-semibold text-ink-950 mt-4">Drop your resume here</p>
                <p className="text-xs text-ink-500 mt-1">PDF, Word (.docx) or text · up to 5 MB</p>
              </>
            )}
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-ink-700">…or paste the text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="SKILLS&#10;- SQL (Basic), Excel, Jira&#10;&#10;EXPERIENCE&#10;- Coordinated user acceptance testing…&#10;&#10;GOALS&#10;- Planning to learn Python"
              className="mt-1.5 flex-1 min-h-[180px] w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-sm font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-sap-500/40"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <p className="text-xs text-ink-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Rules only, no AI model. Scanned images need OCR, which is not included.
          </p>
          <Button
            icon={<Sparkles className="w-4 h-4" />}
            loading={extract.isPending}
            disabled={!file && text.trim().length < 20}
            onClick={() => run(file ? { file } : { text })}
          >
            Read my resume
          </Button>
        </div>
        {extract.isError ? (
          <div className="mt-4">
            <Notice tone="danger">{errorMessage(extract.error)}</Notice>
          </div>
        ) : null}
      </Card>

      {result ? (
        <div className="mt-8 space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="sap">{current.length} current claims</Badge>
            <Badge tone="amber">{check.length} to check</Badge>
            <Badge tone="violet">{notCounted.length} goals or not done</Badge>
            <span className="text-[11px] font-mono text-ink-400 ml-auto">{result.extraction.extractor_version}</span>
          </div>

          {result.extraction.warnings.filter((w) => w.startsWith('conflicting_evidence')).length > 0 ? (
            <Notice tone="warn" title="Some skills are both claimed and denied">
              Your resume lists {result.extraction.warnings.filter((w) => w.startsWith('conflicting_evidence')).length} skill(s) as current but also says you have not used them. Set the level you can honestly defend.
            </Notice>
          ) : null}

          {current.length > 0 ? (
            <section>
              <SectionTitle title="What you have done" subtitle="Selected by default. Untick anything that is not true, and set your level." />
              <div className="space-y-2.5">{current.map(row)}</div>
            </section>
          ) : (
            <Notice tone="warn">No current skills from the Delhi-NCR skill list were found. Try pasting the skills section, or add skills manually on the Skills page.</Notice>
          )}

          {check.length > 0 ? (
            <section>
              <SectionTitle title="Courses and unclear mentions" subtitle="Not selected. A course is exposure, not proof. Tick only what you can do today." />
              <div className="space-y-2.5">{check.map(row)}</div>
            </section>
          ) : null}

          {notCounted.length > 0 ? (
            <section>
              <SectionTitle title="Not counted as skills" subtitle="Goals and “no experience” statements cannot become current skills. Learn them, then prove them." />
              <Card tone="muted" className="space-y-2">
                {notCounted.map((s) => (
                  <div key={s.skill_id} className="flex flex-wrap items-start gap-2 text-sm">
                    <Badge tone={MENTION[s.mention_type].tone}>{MENTION[s.mention_type].label}</Badge>
                    <span className="font-medium text-ink-800">{s.canonical_name}</span>
                    <span className="text-ink-500 italic">“{s.evidence}”</span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}

          <div className="sticky bottom-4 z-10">
            <Card className="flex flex-col sm:flex-row items-center justify-between gap-3 shadow-premium">
              <p className="text-sm text-ink-700">
                <span className="font-bold text-ink-950">{chosen.length}</span> skill{chosen.length === 1 ? '' : 's'} selected. They become <span className="font-semibold">self-reported</span>; only an assessment can verify a skill.
              </p>
              {canSave ? (
                <Button icon={<Upload className="w-4 h-4" />} loading={save.isPending} disabled={chosen.length === 0} onClick={() => save.mutate(chosen)}>
                  Save to my profile
                </Button>
              ) : (
                <Button kind="dark" loading={preview.isPending} disabled={chosen.length === 0} onClick={() => preview.mutate(chosen)}>
                  Preview roles
                </Button>
              )}
            </Card>
          </div>

          {save.isError ? <Notice tone="danger">{errorMessage(save.error)}</Notice> : null}
          {preview.isError ? <Notice tone="danger">{errorMessage(preview.error)}</Notice> : null}

          {save.isSuccess ? (
            <section className="space-y-4">
              <Notice tone="success" title={`Saved ${save.data.imported.length} skills to your profile`}>
                Your roles have been recalculated. <Link to="/app/seeker" className="font-semibold underline">Go to your dashboard</Link>
              </Notice>
              {save.data.recommendations.top.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-4">
                  {save.data.recommendations.top.map((r, i) => (
                    <RoleCard key={r.role_id} role={r} highlight={i === 0} />
                  ))}
                </div>
              ) : (
                <Notice tone="info">No role clears the recommendation bar yet. Check your levels on the Skills page; most roles need level 3 (Independent) in their core skills.</Notice>
              )}
            </section>
          ) : null}

          {preview.isSuccess ? (
            <section className="space-y-3">
              <SectionTitle title="Preview: nearby Delhi-NCR roles" subtitle="Estimated skill fit, not a hiring probability. Not saved." />
              {preview.data.message ? <Notice tone="info">{preview.data.message}</Notice> : null}
              {preview.data.top_roles.map((r) => (
                <Card key={r.role_id} className="flex items-center gap-4">
                  <FitDial score={r.estimated_skill_fit} size={56} />
                  <div className="flex-1">
                    <p className="font-semibold text-ink-950">{r.title}</p>
                    <p className="text-xs text-ink-500">
                      {r.matching_skills.length} matching skills · {r.critical_gaps.length} gaps · {r.demand_signal.note}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </Card>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
