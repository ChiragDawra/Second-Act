import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMe } from '../../auth/AuthProvider';
import { useAssessment, useAssessments, useSkills, useSubmitAssessment } from '../../features/queries';
import { errorMessage } from '../../lib/api';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { AssessmentDetail, AssessmentOutcome } from '../../lib/types';
import { EligibilityChip, LevelMeter, Provenance, StatusChip } from '../../ui/badges';
import { Bullet, Button, Card, Row, Section, Stack, Text } from '../../ui/primitives';
import { Screen } from '../../ui/Screen';
import { Empty, Notice, QueryView } from '../../ui/states';

export default function WorkerProve() {
  const me = useMe();
  const profileId = me.profile_id!;
  const assessments = useAssessments();
  const skills = useSkills(profileId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AssessmentOutcome | null>(null);
  const detail = useAssessment(activeId);
  const submit = useSubmitAssessment(profileId);

  return (
    <Screen title="Prove a skill" subtitle="A practical check that updates only the skill it tests.">
      {outcome ? (
        <OutcomeView
          outcome={outcome}
          onDone={() => {
            setOutcome(null);
            setActiveId(null);
            router.navigate('/worker/roles');
          }}
          onRetake={() => setOutcome(null)}
        />
      ) : activeId ? (
        <QueryView query={detail} loadingLabel="Loading assessment…">
          {(a) => (
            <TakeAssessment
              assessment={a}
              submitting={submit.isPending}
              error={submit.isError ? errorMessage(submit.error) : null}
              onCancel={() => setActiveId(null)}
              onSubmit={(answers) => submit.mutate({ assessmentId: a.id, answers }, { onSuccess: setOutcome })}
            />
          )}
        </QueryView>
      ) : (
        <QueryView query={assessments} loadingLabel="Loading assessments…">
          {(list) =>
            list.length === 0 ? (
              <Empty title="No assessments available">The demo dataset has no assessment for your gaps yet.</Empty>
            ) : (
              <Stack>
                {list.map((a) => {
                  const current = skills.data?.skills.find((s) => s.skill_id === a.skill_id);
                  return (
                    <Card key={a.id}>
                      <Row style={{ justifyContent: 'space-between' }} wrap>
                        <Text variant="heading" style={{ flex: 1 }}>{a.title}</Text>
                        {a.is_demo ? <Provenance kind="demo-assessment" /> : null}
                      </Row>
                      <Text variant="small">{a.description}</Text>
                      <Row wrap>
                        <Text variant="caption">Your current claim for {a.skill_name}:</Text>
                        {current ? <StatusChip status={current.status} /> : <StatusChip status="unknown" />}
                      </Row>
                      {current ? <LevelMeter level={current.status === 'unknown' ? null : current.proficiency} required={a.level_on_pass} /> : null}
                      <Text variant="caption">
                        {a.item_count} questions · ~{a.time_estimate_minutes} min · pass {a.pass_threshold}/{a.item_count} verifies level {a.level_on_pass}
                      </Text>
                      <Button label="Start assessment" onPress={() => setActiveId(a.id)} />
                    </Card>
                  );
                })}
                <Notice tone="muted">
                  Reading a course or resource never marks a skill as verified. Only a passed assessment does, and it changes only the tested skill.
                </Notice>
              </Stack>
            )
          }
        </QueryView>
      )}
    </Screen>
  );
}

function TakeAssessment({
  assessment,
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  assessment: AssessmentDetail;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = assessment.items.every((i) => answers[i.id]);
  return (
    <Stack gap={16}>
      <Card tone="info">
        <Text variant="heading">{assessment.title}</Text>
        <Text variant="small">Answers are graded on the server against a fixed rubric. The answer key never reaches this device.</Text>
      </Card>
      {assessment.items.map((item, idx) => (
        <Card key={item.id}>
          <Text variant="label">Question {idx + 1} of {assessment.items.length}</Text>
          <Text variant="heading">{item.prompt}</Text>
          {item.code ? (
            <View style={{ backgroundColor: colors.ink900, borderRadius: radius.sm, padding: space.md }}>
              <Text style={{ fontFamily: fonts.mono, color: '#E2E8F0', fontSize: 12.5 }}>{item.code}</Text>
            </View>
          ) : null}
          {item.options.map((o) => {
            const selected = answers[item.id] === o.id;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setAnswers((prev) => ({ ...prev, [item.id]: o.id }))}
                style={{
                  borderWidth: 1.5,
                  borderColor: selected ? colors.sap : colors.ink200,
                  backgroundColor: selected ? colors.sap50 : colors.white,
                  borderRadius: radius.md,
                  padding: space.md,
                }}
              >
                <Row style={{ alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: fonts.mono, color: selected ? colors.sap : colors.ink400 }}>{o.id.toUpperCase()}</Text>
                  <Text variant="small" style={{ flex: 1, color: colors.ink900 }}>{o.label}</Text>
                </Row>
              </Pressable>
            );
          })}
        </Card>
      ))}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Row wrap>
        <Button label={complete ? 'Submit answers' : `Answer all ${assessment.items.length} questions`} disabled={!complete} loading={submitting} onPress={() => onSubmit(answers)} />
        <Button label="Cancel" kind="ghost" onPress={onCancel} />
      </Row>
    </Stack>
  );
}

function OutcomeView({ outcome, onDone, onRetake }: { outcome: AssessmentOutcome; onDone: () => void; onRetake: () => void }) {
  const { result, skill_before, skill_after, skills_changed, role_changes } = outcome;
  return (
    <Stack gap={16}>
      <Card tone={result.passed ? 'success' : 'warn'}>
        <Text variant="label">{result.passed ? 'Passed' : 'Not yet demonstrated'}</Text>
        <Text variant="title">{result.score} / {result.max_score} correct</Text>
        <Text variant="small">{result.title}</Text>
        <Row wrap>
          {Object.entries(result.item_results).map(([q, ok]) => (
            <Text key={q} variant="mono" style={{ color: ok ? colors.green : colors.red }}>{`${q.toUpperCase()} ${ok ? '✓' : '✗'}`}</Text>
          ))}
        </Row>
      </Card>

      <Section title="What changed" subtitle="Only the assessed skill is updated">
        <Card>
          <Row wrap>
            <StatusChip status={skill_before.status} />
            <Text variant="heading">→</Text>
            <StatusChip status={skill_after.status} />
          </Row>
          <LevelMeter level={skill_after.proficiency} color={skill_after.status === 'verified' ? colors.green : colors.amber} />
          <Text variant="small" style={{ fontFamily: fonts.semibold, color: colors.ink900 }}>
            Skills changed: {skills_changed.length === 0 ? 'none' : skills_changed.join(', ')}. Every other skill is unchanged.
          </Text>
          {!result.passed ? <Text variant="caption">“Not demonstrated” means this attempt did not show the level — not that you cannot learn it.</Text> : null}
        </Card>
      </Section>

      <Section title="Role ranking after this result" subtitle="Recomputed by the same deterministic engine">
        {role_changes.length === 0 ? (
          <Text variant="small">No role ranking changed.</Text>
        ) : (
          role_changes.map((c) => (
            <Card key={c.role_id}>
              <Text variant="heading">{c.title}</Text>
              <Row wrap>
                {c.before ? <EligibilityChip value={c.before.eligibility} /> : null}
                <Text variant="heading">→</Text>
                <EligibilityChip value={c.after.eligibility} />
                {c.after.rank ? <Text variant="mono">rank #{c.after.rank}</Text> : null}
              </Row>
              <Bullet>
                Fit {c.before?.role_fit_score?.toFixed(1) ?? '—'} → {c.after.role_fit_score?.toFixed(1) ?? '—'} · readiness {c.before?.readiness_status ?? '—'} → {c.after.readiness_status}
              </Bullet>
            </Card>
          ))
        )}
      </Section>

      <Row wrap>
        <Button label="See updated roles" onPress={onDone} />
        <Button label="Retake" kind="secondary" onPress={onRetake} />
      </Row>
    </Stack>
  );
}
