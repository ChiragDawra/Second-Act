import { ArrowRight, CheckCircle2, Clock, GraduationCap, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '../../auth/AuthProvider';
import { errorMessage } from '../../lib/api';
import { useAssessment, useAssessments, useSubmitAssessment } from '../../lib/queries';
import type { AssessmentOutcome } from '../../lib/types';
import { Badge, Button, Card, cn, Empty, ErrorState, LEVEL_LABELS, Notice, PageHeader, Provenance, SectionTitle, Spinner, StatusBadge } from '../../ui/kit';

function Outcome({ outcome, onDone }: { outcome: AssessmentOutcome; onDone: () => void }) {
  const r = outcome.result;
  return (
    <div className="space-y-6">
      <Card tone={r.passed ? 'sap' : 'amber'} className="flex items-center gap-4">
        {r.passed ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <XCircle className="w-8 h-8 text-gapAmber-600" />}
        <div className="flex-1">
          <p className="text-lg font-extrabold text-ink-950">
            {r.score}/{r.max_score} · {r.passed ? 'Passed' : 'Not yet'}
          </p>
          <p className="text-sm text-ink-600">{r.title}</p>
        </div>
        <Button kind="secondary" onClick={onDone}>
          Done
        </Button>
      </Card>
      <Card>
        <SectionTitle title="What changed" subtitle="An assessment changes only the skill it tests" />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">{outcome.skills_changed.join(', ') || 'No skill changed'}</span>
          <StatusBadge status={outcome.skill_before.status} />
          <span className="font-mono text-xs">{outcome.skill_before.proficiency ?? '?'}</span>
          <ArrowRight className="w-4 h-4 text-ink-400" />
          <StatusBadge status={outcome.skill_after.status} />
          <span className="font-mono text-xs">{outcome.skill_after.proficiency ?? '?'}</span>
        </div>
      </Card>
      {outcome.role_changes.length > 0 ? (
        <Card>
          <SectionTitle title="Roles that moved" />
          <div className="divide-y divide-ink-100">
            {outcome.role_changes.map((c) => (
              <div key={c.role_id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{c.title}</span>
                <span className="font-mono text-xs text-ink-600">
                  {c.before?.role_fit_score ?? '—'} → <span className="font-bold text-sap-600">{c.after.role_fit_score ?? '—'}</span> · {c.before?.eligibility ?? 'new'} → {c.after.eligibility}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default function Prove() {
  const me = useMe();
  const list = useAssessments();
  const [active, setActive] = useState<string | null>(null);
  const detail = useAssessment(active);
  const submit = useSubmitAssessment(me.profile_id!);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (list.isPending) return <Spinner />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

  // Assessments exist per catalogue; a Delhi-NCR profile only sees ncr- skills.
  const mine = list.data.filter((a) => (me.catalogue === 'ncr' ? a.skill_id.startsWith('ncr-') : !a.skill_id.startsWith('ncr-')));

  if (submit.isSuccess) {
    return (
      <>
        <PageHeader eyebrow="Result" title="Assessment result" />
        <Outcome
          outcome={submit.data}
          onDone={() => {
            submit.reset();
            setActive(null);
            setAnswers({});
          }}
        />
      </>
    );
  }

  if (active) {
    if (detail.isPending) return <Spinner />;
    if (detail.isError) return <ErrorState error={detail.error} />;
    const a = detail.data;
    const complete = a.items.every((i) => answers[i.id]);
    return (
      <>
        <PageHeader
          eyebrow="Fixed rubric · auto-graded"
          title={a.title}
          subtitle={`${a.description} Pass mark ${a.pass_threshold}/${a.items.length}; passing sets the skill to level ${a.level_on_pass} (${LEVEL_LABELS[a.level_on_pass]}), verified.`}
          actions={
            <Button kind="ghost" onClick={() => setActive(null)}>
              Cancel
            </Button>
          }
        />
        <div className="space-y-4">
          {a.items.map((item, n) => (
            <Card key={item.id}>
              <p className="text-[11px] font-mono text-ink-400">Question {n + 1}</p>
              <p className="font-semibold text-ink-950 mt-1">{item.prompt}</p>
              {item.code ? <pre className="mt-3 rounded-xl bg-ink-950 text-ink-100 text-xs p-4 overflow-x-auto">{item.code}</pre> : null}
              <div className="grid sm:grid-cols-2 gap-2 mt-4">
                {item.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAnswers((p) => ({ ...p, [item.id]: o.id }))}
                    className={cn(
                      'text-left rounded-xl border px-4 py-3 text-sm transition-colors',
                      answers[item.id] === o.id ? 'border-sap-500 bg-sap-50 text-sap-900' : 'border-ink-200 hover:border-sap-300',
                    )}
                  >
                    <span className="font-mono text-xs mr-2 text-ink-400">{o.id.toUpperCase()}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </Card>
          ))}
          {submit.isError ? <Notice tone="danger">{errorMessage(submit.error)}</Notice> : null}
          <div className="flex justify-end">
            <Button size="lg" disabled={!complete} loading={submit.isPending} onClick={() => submit.mutate({ assessmentId: a.id, answers })}>
              Submit answers
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Prove a skill"
        subtitle="Only an assessment can turn a skill into verified. It changes the tested skill and nothing else."
      />
      {mine.length === 0 ? (
        <Empty icon={<GraduationCap className="w-5 h-5" />} title="No assessments for your roles yet">
          Assessments for the Delhi-NCR roles are being written. Until then your skills stay self-reported, and employer-reviewed Proof Tasks are
          planned as the stronger route to verification.
        </Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {mine.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge tone="sap">{a.skill_name}</Badge>
                {a.is_demo ? <Provenance kind="synthetic" /> : null}
              </div>
              <p className="font-bold text-ink-950 mt-3">{a.title}</p>
              <p className="text-sm text-ink-500 mt-1 flex-1">{a.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-ink-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> ~{a.time_estimate_minutes} min · {a.item_count} questions
                </span>
                <Button size="sm" onClick={() => setActive(a.id)}>
                  Start
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
