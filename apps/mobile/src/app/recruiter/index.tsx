import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { fieldLabel, useShareFields } from '../../features/queries';
import { api } from '../../lib/api';
import { roleTheme } from '../../lib/theme';
import type { RecruiterCandidate } from '../../lib/types';
import { Provenance } from '../../ui/badges';
import { Card, Row, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Empty, Notice, QueryView } from '../../ui/states';

export default function RecruiterCandidates() {
  const fields = useShareFields();
  const list = useQuery({
    queryKey: ['recruiter-candidates'],
    queryFn: () => api<{ organization: { name: string }; eligibility_rule: string; candidates: RecruiterCandidate[] }>('/recruiter/candidates'),
    refetchInterval: 8_000,
  });
  useRefetchOnFocus(list.refetch);

  return (
    <Screen title="Consented candidates" subtitle={list.data?.organization.name} onRefresh={() => void list.refetch()} refreshing={list.isRefetching}>
      <QueryView query={list} loadingLabel="Loading candidates…">
        {(d) => (
          <Stack>
            <Notice tone="muted">{d.eligibility_rule}</Notice>
            {d.candidates.length === 0 ? (
              <Empty title="No candidates have shared with your organisation">There is no search over workers. This list updates automatically when a worker approves sharing.</Empty>
            ) : (
              d.candidates.map((c) => (
                <Pressable key={c.grant_id} accessibilityRole="button" onPress={() => router.push(`/recruiter/candidate/${c.grant_id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                  <Card style={{ borderLeftWidth: 4, borderLeftColor: roleTheme.recruiter.color }}>
                    <Row style={{ justifyContent: 'space-between' }} wrap>
                      <Text variant="heading">{c.display_name ?? 'Name not shared'}</Text>
                      {c.is_synthetic ? <Provenance kind="synthetic" /> : null}
                    </Row>
                    {c.career_goal ? <Text variant="small">Working towards {c.career_goal.title}</Text> : null}
                    <Text variant="caption">Shared {new Date(c.granted_at).toLocaleString()}: {c.fields.map((f) => fieldLabel(fields.data, f)).join(', ')}</Text>
                  </Card>
                </Pressable>
              ))
            )}
          </Stack>
        )}
      </QueryView>
    </Screen>
  );
}
