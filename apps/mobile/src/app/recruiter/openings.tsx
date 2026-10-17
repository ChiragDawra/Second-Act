import { useAuth } from '../../auth/AuthProvider';
import { useOpportunities } from '../../features/queries';
import { Chip, Provenance, tones } from '../../ui/badges';
import { Card, Row, Stack, Text } from '../../ui/primitives';
import { Screen } from '../../ui/Screen';
import { Notice, QueryView } from '../../ui/states';

export default function RecruiterOpenings() {
  const { me } = useAuth();
  const opps = useOpportunities();
  const orgId = me.data?.org?.id;
  return (
    <Screen title="Openings" subtitle="Every opening in this demo is simulated." onRefresh={() => void opps.refetch()} refreshing={opps.isRefetching}>
      <Notice tone="warn">No live vacancy feed or SAP SuccessFactors connection exists. These records are simulated and labelled as such.</Notice>
      <QueryView query={opps} loadingLabel="Loading openings…">
        {(list) => (
          <Stack>
            {[...list].sort((a, b) => Number(b.org_id === orgId) - Number(a.org_id === orgId)).map((o) => (
              <Card key={o.id}>
                <Row style={{ justifyContent: 'space-between' }} wrap>
                  <Text variant="heading" style={{ flex: 1 }}>{o.title}</Text>
                  {o.is_simulated ? <Provenance kind="simulated" /> : null}
                </Row>
                <Text variant="small">{o.employer_name} · {o.location} · {o.work_mode}{o.salary_band_text ? ` · ${o.salary_band_text}` : ''}</Text>
                <Row wrap>
                  <Text variant="caption">Role: {o.role_title}</Text>
                  {o.org_id === orgId ? <Chip label="Your organisation" t={tones.violet} /> : null}
                </Row>
                <Text variant="caption">{o.provenance_label}</Text>
              </Card>
            ))}
          </Stack>
        )}
      </QueryView>
    </Screen>
  );
}
