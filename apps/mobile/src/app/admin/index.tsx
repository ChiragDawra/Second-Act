import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { colors } from '../../lib/theme';
import type { AdminOverview } from '../../lib/types';
import { Chip, Provenance, tones } from '../../ui/badges';
import { ConfirmButton } from '../../ui/forms';
import { Card, KeyValue, Row, Section, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Notice, QueryView } from '../../ui/states';

const label = (key: string) => key.replace(/_/g, ' ');

export default function AdminSystem() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<AdminOverview>('/admin/overview'), refetchInterval: 15_000 });
  useRefetchOnFocus(overview.refetch);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const reset = useMutation({
    mutationFn: () => api<{ reset_at: string; profiles_reset: number; skills_seeded: number }>('/admin/demo/reset', { method: 'POST', body: { confirm: 'RESET' } }),
    onSuccess: async (r) => {
      setResetMsg(`Scenario reset at ${new Date(r.reset_at).toLocaleTimeString()}: ${r.profiles_reset} synthetic profiles, ${r.skills_seeded} inferred skills restored. Other accounts will see the reset on their next refresh.`);
      await qc.invalidateQueries();
    },
  });

  return (
    <Screen title="System" subtitle="Health, data provenance and demo controls." onRefresh={() => void overview.refetch()} refreshing={overview.isRefetching}>
      <QueryView query={overview} loadingLabel="Loading system status…">
        {(o) => {
          const lastReset = o.demo_state.find((s) => s.key === 'last_reset')?.value;
          return (
            <Stack gap={20}>
              <Notice tone="muted">{o.access_note}</Notice>

              <Section title="Health">
                <Card>
                  <KeyValue label="API" value={<Chip label={o.api.status.toUpperCase()} mono t={o.api.status === 'ok' ? tones.green : tones.red} />} />
                  <KeyValue label="Database" value={<Chip label={`${o.database.status.toUpperCase()}${o.database.latency_ms !== null ? ` · ${o.database.latency_ms} ms` : ''}`} mono t={o.database.status === 'ok' ? tones.green : tones.red} />} />
                  <KeyValue label="API uptime" value={`${Math.round(o.api.uptime_seconds / 60)} min`} />
                  <KeyValue label="Refused requests (24 h)" value={o.denied_requests_24h} />
                </Card>
              </Section>

              <Section title="What is live, synthetic, simulated or planned">
                {o.integrations.map((i) => (
                  <Card key={i.name}>
                    <Row style={{ justifyContent: 'space-between' }} wrap>
                      <Text variant="heading" style={{ flex: 1 }}>{i.name}</Text>
                      <Provenance kind={i.status} />
                    </Row>
                    <Text variant="small">{i.detail}</Text>
                  </Card>
                ))}
              </Section>

              <Section title="Engine and dataset versions">
                <Card>
                  <KeyValue label="Scoring rule" value={o.engine.scoring_version} />
                  <KeyValue label="Mentor matching" value={o.engine.mentor_match_version} />
                  <KeyValue label="Skill extraction" value={o.engine.extraction_version} />
                  <Text variant="mono">
                    evidence factors: {Object.entries(o.engine.evidence_factors).map(([k, v]) => `${k} ${v}`).join(' · ')}
                  </Text>
                </Card>
                {o.dataset_versions.map((d) => (
                  <Card key={d.id}>
                    <Row style={{ justifyContent: 'space-between' }} wrap>
                      <Text variant="mono" style={{ color: colors.ink900 }}>{d.id}</Text>
                      <Row>
                        <Chip label={d.kind} />
                        {d.is_synthetic ? <Provenance kind="synthetic" /> : null}
                      </Row>
                    </Row>
                    <Text variant="small">{d.description}</Text>
                    <Text variant="caption">{d.source} · released {String(d.released_at).slice(0, 10)}</Text>
                  </Card>
                ))}
              </Section>

              <Section title="Synthetic data status" subtitle="Aggregate counts only">
                <Card>
                  {Object.entries(o.synthetic_data).map(([k, v]) =>
                    typeof v === 'number' ? (
                      <KeyValue key={k} label={label(k)} value={v} />
                    ) : (
                      <KeyValue key={k} label={label(k)} value={Object.entries(v).map(([r, n]) => `${r}: ${n}`).join(' · ')} />
                    ),
                  )}
                </Card>
              </Section>

              <Section title="Demo data management" subtitle="Restores the synthetic Harpreet scenario. The audit trail is kept.">
                <Card tone="warn">
                  <Text variant="small">
                    {lastReset?.at ? `Last reset ${new Date(lastReset.at).toLocaleString()} (${lastReset.scenario_version}, by ${lastReset.by_role}).` : 'Not reset yet.'}
                  </Text>
                  <Text variant="small">Resetting removes mentorship requests, sharing approvals, assessment results and skill reviews for synthetic profiles only. Identities are not touched.</Text>
                  <ConfirmButton label="Reset demo scenario" confirmLabel="Confirm reset" loading={reset.isPending} onConfirm={() => { setResetMsg(null); reset.mutate(); }} />
                  {reset.isError ? <Text variant="small" style={{ color: colors.red }}>{errorMessage(reset.error)}</Text> : null}
                </Card>
                {resetMsg ? <Notice tone="success">{resetMsg}</Notice> : null}
              </Section>
            </Stack>
          );
        }}
      </QueryView>
    </Screen>
  );
}
