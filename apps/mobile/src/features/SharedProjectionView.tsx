import { View } from 'react-native';
import type { SharedProjection } from '../lib/types';
import { colors, fonts } from '../lib/theme';
import { EligibilityChip, LevelMeter, Provenance, ReadinessChip, StatusChip } from '../ui/badges';
import { Bullet, Card, Divider, Row, Section, Stack, Text } from '../ui/primitives';

/**
 * Renders exactly what the server returned for a consent-scoped view.
 * Absent keys were not shared, so nothing is rendered for them.
 */
export function SharedProjectionView({ shared, withheldLabels }: { shared: SharedProjection; withheldLabels: string[] }) {
  return (
    <Stack gap={16}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="title">{shared.display_name ?? 'Name not shared'}</Text>
          {shared.is_synthetic ? <Provenance kind="synthetic" /> : null}
        </Row>
        {shared.career_goal ? (
          <Text variant="small">
            Working towards <Text style={{ fontFamily: fonts.semibold, color: colors.ink900 }}>{shared.career_goal.title}</Text>
          </Text>
        ) : null}
      </Card>

      {shared.gap_areas ? (
        <Section title="Gaps and blockers for the target role" subtitle={`Computed by ${shared.gap_areas.scoring_version}`}>
          <Card>
            <Row><ReadinessChip status={shared.gap_areas.readiness_status} /></Row>
            {shared.gap_areas.mandatory.map((m) => (
              <Bullet key={m.skill_id} color={m.gate === 'cleared' ? colors.green : m.gate === 'blocker' ? colors.red : colors.amber}>
                <Text style={{ fontFamily: fonts.semibold }}>{m.name}</Text> (mandatory) — {m.reason}
              </Bullet>
            ))}
            {shared.gap_areas.critical_gaps.map((g) => (
              <Bullet key={g.skill_id} color={colors.amber}>
                Gap: {g.name} (level {g.worker_level ?? 0} → {g.required_level})
              </Bullet>
            ))}
            {shared.gap_areas.unknowns.map((u) => (
              <Bullet key={u.skill_id}>Unknown, not missing: {u.name}</Bullet>
            ))}
          </Card>
        </Section>
      ) : null}

      {shared.assessment_results ? (
        <Section title="Assessment results">
          {shared.assessment_results.length === 0 ? (
            <Text variant="small">No assessments taken yet.</Text>
          ) : (
            shared.assessment_results.map((a) => (
              <Card key={`${a.assessment_id}-${a.created_at}`} tone={a.passed ? 'success' : 'warn'}>
                <Row style={{ justifyContent: 'space-between' }} wrap>
                  <Text variant="heading">{a.skill_name}</Text>
                  {a.is_demo_assessment ? <Provenance kind="demo-assessment" /> : null}
                </Row>
                <Text variant="small">
                  {a.title}: {a.score}/{a.max_score} — {a.passed ? `passed, verified at level ${a.level_after}` : 'not demonstrated'} ·{' '}
                  {new Date(a.created_at).toLocaleString()}
                </Text>
              </Card>
            ))
          )}
        </Section>
      ) : null}

      {shared.skills_summary ? (
        <Section title="Skills" subtitle="Status shows how each claim is evidenced">
          <Card>
            {shared.skills_summary.map((s, i) => (
              <View key={s.skill_id} style={{ gap: 4 }}>
                {i > 0 ? <Divider /> : null}
                <Row style={{ justifyContent: 'space-between' }} wrap>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink900, flexShrink: 1 }}>{s.name}</Text>
                  <StatusChip status={s.status} />
                </Row>
                <LevelMeter level={s.proficiency} />
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {shared.skill_evidence ? (
        <Section title="Evidence from work history">
          <Card>
            {shared.skill_evidence.map((e) => (
              <View key={e.skill_id} style={{ gap: 2 }}>
                <Text variant="caption">{e.name}</Text>
                <Text variant="small" style={{ fontStyle: 'italic' }}>“{e.evidence_snippet}”</Text>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {shared.role_suitability ? (
        <Section title="Estimated role fit" subtitle="Estimated skill fit, not a hiring probability">
          <Card>
            {shared.role_suitability.roles.map((r) => (
              <Row key={r.role_id} style={{ justifyContent: 'space-between' }} wrap>
                <Text variant="small" style={{ flex: 1, color: colors.ink900 }}>{r.title}</Text>
                <Text variant="mono">{r.role_fit_score?.toFixed(1) ?? '—'}</Text>
                <EligibilityChip value={r.eligibility} />
              </Row>
            ))}
            <Text variant="caption">
              {shared.role_suitability.scoring_version} · {shared.role_suitability.dataset_version} · computed {new Date(shared.role_suitability.computed_at).toLocaleString()}
            </Text>
          </Card>
        </Section>
      ) : null}

      {shared.career_preferences ? (
        <Section title="Career preferences" subtitle="Salary expectations are never shared">
          <Card>
            <Text variant="small">Locations: {shared.career_preferences.locations?.join(', ') ?? '—'}</Text>
            <Text variant="small">Work modes: {shared.career_preferences.work_modes?.join(', ') ?? '—'}</Text>
            <Text variant="small">Employment: {shared.career_preferences.employment_types?.join(', ') ?? '—'}</Text>
            <Text variant="small">Learning time: {shared.career_preferences.weekly_learning_hours ?? '—'} h/week</Text>
            <Text variant="small">Languages: {shared.career_preferences.languages?.join(', ') ?? '—'}</Text>
          </Card>
        </Section>
      ) : null}

      {shared.experience_summary ? (
        <Section title="Work history">
          <Card><Text variant="small">{shared.experience_summary}</Text></Card>
        </Section>
      ) : null}

      <Card tone="muted">
        <Text variant="label">Not shared with you</Text>
        {withheldLabels.length === 0 ? <Text variant="small">The worker shared every available field.</Text> : withheldLabels.map((l) => <Bullet key={l}>{l}</Bullet>)}
      </Card>
    </Stack>
  );
}
