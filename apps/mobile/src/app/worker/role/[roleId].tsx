import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { useMe } from '../../../auth/AuthProvider';
import { useRoleDetail, useRoleGaps } from '../../../features/queries';
import { colors, fonts } from '../../../lib/theme';
import type { GapItem } from '../../../lib/types';
import { EligibilityChip, LevelMeter, Provenance, ReadinessChip, StatusChip } from '../../../ui/badges';
import { MatchRing } from '../../../ui/MatchRing';
import { Bullet, Button, Card, Divider, KeyValue, Row, Section, Stack, Text } from '../../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../../ui/Screen';
import { QueryView } from '../../../ui/states';

export default function RoleDetailScreen() {
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const me = useMe();
  const gaps = useRoleGaps(me.profile_id!, roleId);
  const detail = useRoleDetail(roleId);
  useRefetchOnFocus(gaps.refetch);

  return (
    <Screen onRefresh={() => void Promise.all([gaps.refetch(), detail.refetch()])} refreshing={gaps.isRefetching}>
      <Button label="← All roles" kind="ghost" compact onPress={() => router.navigate('/worker/roles')} />
      <QueryView query={gaps} loadingLabel="Loading role evaluation…">
        {({ evaluation: e, next_action, learning_resources, assessments, computed_at, scoring_version }) => (
          <Stack gap={20}>
            <Card>
              <Row gap={14} style={{ alignItems: 'flex-start' }}>
                <MatchRing score={e.role_fit_score} size={88} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text variant="title">{e.title}</Text>
                  <Row wrap>
                    <EligibilityChip value={e.eligibility} />
                    <ReadinessChip status={e.readiness_status} />
                  </Row>
                  <Text variant="caption">
                    {e.rank ? `Rank #${e.rank} · ` : ''}Evidence confidence {e.evidence_confidence}% · market fit not assessed
                  </Text>
                </View>
              </Row>
              <Text variant="mono">{scoring_version} · computed {new Date(computed_at).toLocaleString()}</Text>
            </Card>

            {next_action ? (
              <Card tone={next_action.kind === 'prove' ? 'info' : 'warn'}>
                <Text variant="label">Next best action · {next_action.kind}</Text>
                <Text variant="heading">{next_action.kind === 'prove' ? `Prove ${next_action.name}` : `Learn ${next_action.name}`}</Text>
                <Text variant="small">{next_action.reason}</Text>
                {next_action.kind === 'prove' && assessments[0] ? (
                  <Button label={`Take “${assessments[0].title}” (${assessments[0].time_estimate_minutes} min)`} onPress={() => router.push('/worker/prove')} />
                ) : null}
              </Card>
            ) : null}

            <Section title="Mandatory requirements" subtitle="A separate gate — never averaged into the score">
              {e.mandatory.map((m) => (
                <Card key={m.skill_id} tone={m.gate === 'cleared' ? 'success' : m.gate === 'blocker' ? 'danger' : 'warn'}>
                  <Row style={{ justifyContent: 'space-between' }} wrap>
                    <Text variant="heading">{m.name}</Text>
                    <Text variant="label" style={{ color: m.gate === 'blocker' ? colors.red : m.gate === 'cleared' ? colors.green : colors.amber800 }}>
                      {m.gate.replace('_', ' ')}
                    </Text>
                  </Row>
                  <LevelMeter level={m.worker_level} required={m.required_level} />
                  <Text variant="small">{m.reason}</Text>
                </Card>
              ))}
            </Section>

            <Section title="Score breakdown" subtitle="Each requirement's contribution to the estimated skill fit">
              <Card>
                {e.breakdown.map((b, i) => (
                  <View key={b.skill_id} style={{ gap: 4 }}>
                    {i > 0 ? <Divider /> : null}
                    <Row style={{ justifyContent: 'space-between' }} wrap>
                      <Text style={{ fontFamily: fonts.semibold, color: colors.ink900, flex: 1 }}>
                        {b.name}
                        {b.is_mandatory ? '  ·  mandatory' : ''}
                      </Text>
                      <Text variant="mono">+{b.contribution.toFixed(1)}</Text>
                    </Row>
                    <Row wrap>
                      <StatusChip status={b.status} />
                      <Text variant="caption">
                        weight {b.importance_weight} · level {b.worker_level ?? '?'}/{b.required_level} · evidence ×{b.evidence_factor}
                      </Text>
                    </Row>
                  </View>
                ))}
                <Divider />
                <KeyValue label="Estimated skill fit" value={e.role_fit_score?.toFixed(1) ?? '—'} />
              </Card>
            </Section>

            <GapList title="Gaps" subtitle="Below the required level" items={e.critical_gaps} tone="warn" />
            <GapList title="Unknown" subtitle="No evidence yet — not counted as missing" items={e.unknowns} tone="muted" />
            <GapList title="Transferable strengths" subtitle="Already at the required level" items={e.transferable} tone="success" />

            <Section title="Constraints and effort">
              <Card tone="muted">
                {e.constraint_failures.length === 0 ? <Text variant="small">Passes all of your constraints.</Text> : null}
                {e.constraint_failures.map((f) => (
                  <Bullet key={f.code} color={colors.red}>{f.message}</Bullet>
                ))}
                {e.constraint_notes.map((n) => (
                  <Bullet key={n}>{n}</Bullet>
                ))}
                <Text variant="small">
                  Estimated gap effort: ~{e.estimated_learning_hours} h
                  {e.estimated_learning_weeks !== null ? ` (~${e.estimated_learning_weeks} weeks at your weekly learning time)` : ''} — a catalogue estimate, not a guarantee.
                </Text>
              </Card>
            </Section>

            {learning_resources.length > 0 ? (
              <Section title="Learning resources" subtitle="Completing a resource never verifies a skill">
                {learning_resources.map((r) => (
                  <Card key={r.id}>
                    <Text variant="heading">{r.title}</Text>
                    <Text variant="caption">
                      {r.provider} · {r.format} · {r.cost_band}
                      {r.verified ? '' : ' · link not re-checked for this demo'}
                    </Text>
                    <Button label="Open link" kind="secondary" compact onPress={() => void Linking.openURL(r.url)} />
                  </Card>
                ))}
              </Section>
            ) : null}

            <QueryView query={detail}>
              {(d) => (
                <Section title="Openings for this role" subtitle="Role fit is not the same as an open vacancy">
                  {d.opportunities.length === 0 ? (
                    <Card tone="muted"><Text variant="small">No current vacancy verified.</Text></Card>
                  ) : (
                    d.opportunities.map((o) => (
                      <Card key={o.id}>
                        <Row style={{ justifyContent: 'space-between' }} wrap>
                          <Text variant="heading">{o.title}</Text>
                          {o.is_simulated ? <Provenance kind="simulated" /> : null}
                        </Row>
                        <Text variant="small">{o.employer_name} · {o.location} · {o.work_mode}{o.salary_band_text ? ` · ${o.salary_band_text}` : ''}</Text>
                      </Card>
                    ))
                  )}
                  <Text variant="caption">Role data: {d.source} · {d.dataset_version} · reviewed {d.last_reviewed_at}. {d.salary_note}</Text>
                </Section>
              )}
            </QueryView>
          </Stack>
        )}
      </QueryView>
    </Screen>
  );
}

function GapList({ title, subtitle, items, tone }: { title: string; subtitle: string; items: GapItem[]; tone: 'warn' | 'muted' | 'success' }) {
  if (items.length === 0) return null;
  return (
    <Section title={title} subtitle={subtitle}>
      <Card tone={tone}>
        {items.map((g) => (
          <View key={g.skill_id} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }} wrap>
              <Text style={{ fontFamily: fonts.semibold, color: colors.ink900 }}>{g.name}{g.is_mandatory ? ' · mandatory' : ''}</Text>
              <StatusChip status={g.status} />
            </Row>
            <LevelMeter level={g.worker_level} required={g.required_level} />
          </View>
        ))}
      </Card>
    </Section>
  );
}
