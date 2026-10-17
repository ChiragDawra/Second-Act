import { useState } from 'react';
import { View } from 'react-native';
import { useMe } from '../../auth/AuthProvider';
import { useProfile, useRecommendations, useReviewSkills, useSkills, type SkillAction } from '../../features/queries';
import { errorMessage } from '../../lib/api';
import { colors, fonts, space } from '../../lib/theme';
import type { WorkerSkill } from '../../lib/types';
import { LevelMeter, Provenance, StatusChip } from '../../ui/badges';
import { Stepper } from '../../ui/forms';
import { Button, Card, Row, Section, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Notice, QueryView } from '../../ui/states';

export default function WorkerSkills() {
  const me = useMe();
  const profileId = me.profile_id!;
  const profile = useProfile(profileId);
  const skills = useSkills(profileId);
  const recs = useRecommendations(profileId);
  const review = useReviewSkills(profileId);
  const [showHistory, setShowHistory] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  useRefetchOnFocus(skills.refetch);

  const run = (updates: SkillAction[], label: string) => {
    setLastResult(null);
    review.mutate(updates, {
      onSuccess: (r) =>
        setLastResult(`${label} Roles recomputed (${r.recommendations.scoring_version}). Top: ${r.recommendations.top.map((t) => t.title).join(' · ')}.`),
    });
  };

  return (
    <Screen
      title="Your skills"
      subtitle="Every claim shows where it came from. You decide what is accurate."
      onRefresh={() => void Promise.all([profile.refetch(), skills.refetch(), recs.refetch()])}
      refreshing={skills.isRefetching}
    >
      <QueryView query={profile} loadingLabel="Loading your profile…">
        {(p) => (
          <Card>
            <Row style={{ justifyContent: 'space-between' }} wrap>
              <Text variant="title">{p.display_name}</Text>
              {p.is_synthetic ? <Provenance kind="synthetic" /> : null}
            </Row>
            <Text variant="small">{p.headline}</Text>
            <Button label={showHistory ? 'Hide work history' : 'Show work history (source text)'} kind="ghost" compact onPress={() => setShowHistory((s) => !s)} />
            {showHistory ? (
              <Card tone="muted">
                <Text variant="label">Synthetic work history · input to extraction</Text>
                <Text variant="small">{p.experience_summary}</Text>
              </Card>
            ) : null}
          </Card>
        )}
      </QueryView>

      {review.isError ? <Notice tone="danger">{errorMessage(review.error)}</Notice> : null}
      {lastResult ? <Notice tone="success">{lastResult}</Notice> : null}

      <QueryView query={skills} loadingLabel="Loading skill claims…">
        {({ skills: list, extraction_version }) => {
          const pending = list.filter((s) => s.status === 'inferred');
          const counts = list.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }), {});
          return (
            <Stack gap={16}>
              <Card tone={pending.length > 0 ? 'warn' : 'success'}>
                <Text variant="heading">
                  {pending.length > 0 ? `${pending.length} inferred skills need your review` : 'All skill claims reviewed'}
                </Text>
                <Text variant="small">
                  Found by {extraction_version} (phrase matching, no AI model). Inferred claims are never treated as verified — only a passed
                  assessment verifies a skill.
                </Text>
                <Row wrap>
                  {Object.entries(counts).map(([status, n]) => (
                    <Row key={status} gap={4}>
                      <StatusChip status={status as WorkerSkill['status']} />
                      <Text variant="mono">{n}</Text>
                    </Row>
                  ))}
                </Row>
                {pending.length > 1 ? (
                  <Button
                    label={`Confirm all ${pending.length} as accurate`}
                    kind="secondary"
                    loading={review.isPending}
                    onPress={() => run(pending.map((s) => ({ skill_id: s.skill_id, action: 'confirm' })), `Confirmed ${pending.length} skills.`)}
                  />
                ) : null}
              </Card>

              <Section title="Skill claims" subtitle="Confirm, correct the level, or reject anything that is wrong">
                {list.map((s) => (
                  <SkillCard key={s.skill_id} skill={s} busy={review.isPending} onAction={run} />
                ))}
              </Section>
            </Stack>
          );
        }}
      </QueryView>
    </Screen>
  );
}

function SkillCard({ skill, busy, onAction }: { skill: WorkerSkill; busy: boolean; onAction: (u: SkillAction[], label: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(skill.proficiency ?? 2);
  const locked = skill.status === 'verified' || skill.status === 'not_demonstrated';
  return (
    <Card tone={skill.status === 'inferred' ? undefined : skill.status === 'verified' ? 'success' : undefined}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} wrap>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Text variant="heading">{skill.name}</Text>
          <Text variant="caption">{skill.category}</Text>
        </View>
        <StatusChip status={skill.status} />
      </Row>
      <LevelMeter level={skill.status === 'unknown' ? null : skill.proficiency} color={skill.status === 'verified' ? colors.green : colors.sap} />

      {skill.evidence_snippet ? (
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.sap200, paddingLeft: space.md, gap: 2 }}>
          <Text variant="small" style={{ fontStyle: 'italic', color: colors.ink700 }}>“{skill.evidence_snippet}”</Text>
          <Text variant="caption">
            Source: work history{skill.confidence !== null ? ` · confidence ${skill.confidence.toFixed(2)}` : ''}
            {skill.confidence_method ? ` · ${skill.confidence_method}` : ''}
          </Text>
        </View>
      ) : (
        <Text variant="caption">No text evidence — {skill.evidence_source_type === 'assessment' ? 'from an assessment' : 'stated by you'}.</Text>
      )}

      {skill.verified_by ? (
        <Text variant="small" style={{ color: colors.green, fontFamily: fonts.semibold }}>
          Verified by demo assessment ({skill.verified_by.score}/{skill.verified_by.max_score}) on {new Date(skill.verified_by.created_at).toLocaleDateString()}
        </Text>
      ) : null}
      {skill.review_state === 'rejected' ? <Text variant="caption">You rejected this inference. It is treated as unknown, not as missing.</Text> : null}

      {locked ? (
        <Text variant="caption">Assessed skills change only through a new assessment attempt.</Text>
      ) : editing ? (
        <Row wrap style={{ justifyContent: 'space-between' }}>
          <Stepper value={level} onChange={setLevel} />
          <Row>
            <Button label="Save level" compact loading={busy} onPress={() => { onAction([{ skill_id: skill.skill_id, action: 'edit', proficiency: level }], `Saved ${skill.name} at level ${level}.`); setEditing(false); }} />
            <Button label="Cancel" kind="ghost" compact onPress={() => setEditing(false)} />
          </Row>
        </Row>
      ) : (
        <Row wrap>
          {skill.status === 'inferred' ? (
            <Button label="Confirm" compact kind="secondary" disabled={busy} onPress={() => onAction([{ skill_id: skill.skill_id, action: 'confirm' }], `Confirmed ${skill.name}.`)} />
          ) : null}
          <Button label={skill.status === 'unknown' ? 'I have this' : 'Correct level'} compact kind="secondary" disabled={busy} onPress={() => setEditing(true)} />
          {skill.status !== 'unknown' ? (
            <Button label="Reject" compact kind="danger" disabled={busy} onPress={() => onAction([{ skill_id: skill.skill_id, action: 'reject' }], `Rejected ${skill.name}.`)} />
          ) : null}
        </Row>
      )}
    </Card>
  );
}
