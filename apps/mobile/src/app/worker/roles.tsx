import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useMe } from '../../auth/AuthProvider';
import { useRecommendations } from '../../features/queries';
import { colors, fonts, space } from '../../lib/theme';
import type { RoleEvaluation } from '../../lib/types';
import { EligibilityChip, ReadinessChip } from '../../ui/badges';
import { MatchRing } from '../../ui/MatchRing';
import { Bullet, Card, KeyValue, Row, Section, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Empty, QueryView } from '../../ui/states';

export default function WorkerRoles() {
  const me = useMe();
  const recs = useRecommendations(me.profile_id!);
  useRefetchOnFocus(recs.refetch);

  return (
    <Screen
      title="Nearest roles"
      subtitle="Ranked by the deterministic Adjacency Engine from your current evidence."
      onRefresh={() => void recs.refetch()}
      refreshing={recs.isRefetching}
    >
      <QueryView query={recs} loadingLabel="Computing role fit…">
        {(r) => (
          <Stack gap={20}>
            <Card tone="info">
              <Text variant="small" style={{ color: colors.sap800 }}>{r.score_disclaimer}</Text>
              <Text variant="mono">
                {r.scoring_version} · {r.dataset_version} · input {r.input_hash.slice(0, 10)} · {new Date(r.computed_at).toLocaleTimeString()}
              </Text>
            </Card>

            <Section title="Top three adjacent roles" subtitle="Eligible after your constraints and with no mandatory blocker">
              {r.top.length === 0 ? (
                <Empty title="No role is eligible yet">Review your skills or relax a constraint; stretch roles below show what is missing.</Empty>
              ) : (
                r.top.map((e) => <RoleCard key={e.role_id} e={e} />)
              )}
            </Section>

            {r.other_eligible.length > 0 ? (
              <Section title="Other eligible roles">
                {r.other_eligible.map((e) => <CompactRole key={e.role_id} e={e} />)}
              </Section>
            ) : null}

            <Section title="Stretch roles" subtitle="Blocked by a mandatory requirement — a high score cannot hide this">
              {r.stretch.length === 0 ? <Text variant="small">None.</Text> : r.stretch.map((e) => <CompactRole key={e.role_id} e={e} />)}
            </Section>

            <Section title="Filtered before ranking" subtitle="Removed by your own constraints, with the reason">
              {r.filtered.map((e) => (
                <Card key={e.role_id} tone="muted">
                  <Text variant="heading">{e.title}</Text>
                  {e.constraint_failures.map((f) => (
                    <Bullet key={f.code}>{f.message}</Bullet>
                  ))}
                </Card>
              ))}
            </Section>

            <Card tone="muted">
              <Text variant="label">How the score works</Text>
              <Text variant="mono">fit = 100 × Σ(wᵢ · min(pᵢ/qᵢ, 1) · eᵢ) / Σwᵢ</Text>
              {Object.entries(r.evidence_factors).map(([status, factor]) => (
                <KeyValue key={status} label={`Evidence factor · ${status.replace('_', ' ')}`} value={factor.toFixed(1)} />
              ))}
              <Text variant="caption">Unknown skills add no evidence and are listed as unknown, never as missing. Mandatory requirements are checked separately.</Text>
            </Card>
          </Stack>
        )}
      </QueryView>
    </Screen>
  );
}

function RoleCard({ e }: { e: RoleEvaluation }) {
  const blockers = e.mandatory.filter((m) => m.gate !== 'cleared');
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/worker/role/${e.role_id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card>
        <Row style={{ alignItems: 'flex-start' }} gap={14}>
          <MatchRing score={e.role_fit_score} size={76} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="label" style={{ color: colors.sap }}>{`#${e.rank} · ${e.family}`}</Text>
            <Text variant="heading" style={{ fontSize: 16 }}>{e.title}</Text>
            <Row wrap>
              <ReadinessChip status={e.readiness_status} />
              <Text variant="caption">Evidence confidence {e.evidence_confidence}%</Text>
            </Row>
          </View>
        </Row>
        {e.explanation.slice(0, 3).map((line) => (
          <Bullet key={line}>{line}</Bullet>
        ))}
        {blockers.length > 0 ? (
          <Text variant="caption" style={{ color: colors.amber800 }}>
            Mandatory still to verify: {blockers.map((b) => b.name).join(', ')}
          </Text>
        ) : null}
        <Text style={{ fontFamily: fonts.semibold, color: colors.sap, fontSize: 13 }}>See score breakdown, gaps and next step →</Text>
      </Card>
    </Pressable>
  );
}

function CompactRole({ e }: { e: RoleEvaluation }) {
  const blocker = e.mandatory.find((m) => m.gate === 'blocker');
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/worker/role/${e.role_id}`)}>
      <Card style={{ paddingVertical: space.md }}>
        <Row style={{ justifyContent: 'space-between' }} wrap>
          <Text variant="heading" style={{ flex: 1 }}>{e.title}</Text>
          <Text variant="mono">{e.role_fit_score?.toFixed(1)}</Text>
          <EligibilityChip value={e.eligibility} />
        </Row>
        {blocker ? <Text variant="caption" style={{ color: colors.red }}>{blocker.name}: {blocker.reason}</Text> : null}
      </Card>
    </Pressable>
  );
}
