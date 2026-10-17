import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { SharedProjectionView } from '../../../features/SharedProjectionView';
import { api } from '../../../lib/api';
import type { RecruiterCandidateDetail } from '../../../lib/types';
import { EligibilityChip, Provenance, ReadinessChip } from '../../../ui/badges';
import { Button, Card, Row, Section, Stack, Text } from '../../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../../ui/Screen';
import { Notice, QueryView } from '../../../ui/states';

export default function RecruiterCandidate() {
  const { grantId } = useLocalSearchParams<{ grantId: string }>();
  const detail = useQuery({
    queryKey: ['recruiter-candidate', grantId],
    queryFn: () => api<RecruiterCandidateDetail>(`/recruiter/candidates/${grantId}`),
  });
  useRefetchOnFocus(detail.refetch);

  return (
    <Screen onRefresh={() => void detail.refetch()} refreshing={detail.isRefetching}>
      <Button label="← All candidates" kind="ghost" compact onPress={() => router.navigate('/recruiter')} />
      <QueryView query={detail} loadingLabel="Loading the shared profile…">
        {(d) => (
          <Stack gap={20}>
            <Notice tone="warn">{d.notice} Decision support only — nothing is decided automatically.</Notice>

            {d.opportunity_fit ? (
              <Section title="Fit for your openings" subtitle="Estimated skill fit from the worker's shared role suitability">
                {d.opportunity_fit.map((o) => (
                  <Card key={o.opportunity_id}>
                    <Row style={{ justifyContent: 'space-between' }} wrap>
                      <Text variant="heading" style={{ flex: 1 }}>{o.title}</Text>
                      {o.is_simulated ? <Provenance kind="simulated" /> : null}
                    </Row>
                    {o.evaluation ? (
                      <Row wrap>
                        <Text variant="mono">fit {o.evaluation.role_fit_score?.toFixed(1) ?? '—'}</Text>
                        <EligibilityChip value={o.evaluation.eligibility} />
                        <ReadinessChip status={o.evaluation.readiness_status} />
                      </Row>
                    ) : (
                      <Text variant="small">No evaluation for this role.</Text>
                    )}
                  </Card>
                ))}
              </Section>
            ) : (
              <Card tone="muted"><Text variant="small">The worker did not share role suitability, so fit for your openings is not shown.</Text></Card>
            )}

            <SharedProjectionView shared={d.shared} withheldLabels={d.withheld_field_labels} />
          </Stack>
        )}
      </QueryView>
    </Screen>
  );
}
