import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { fieldLabel, useShareFields } from '../../features/queries';
import { api } from '../../lib/api';
import { colors, roleTheme } from '../../lib/theme';
import type { MentorRequestSummary } from '../../lib/types';
import { Chip, Provenance, tones } from '../../ui/badges';
import { Card, Row, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Empty, Notice, QueryView } from '../../ui/states';

const statusTone = { requested: tones.blue, accepted: tones.green, declined: tones.grey, revoked: tones.grey, completed: tones.green } as const;

export default function MentorInbox() {
  const requests = useQuery({
    queryKey: ['mentor-requests'],
    queryFn: () => api<{ requests: MentorRequestSummary[] }>('/mentor/requests').then((r) => r.requests),
    refetchInterval: 8_000,
  });
  const fields = useShareFields();
  useRefetchOnFocus(requests.refetch);

  return (
    <Screen title="Mentorship requests" subtitle="Requests appear here only after a worker approves sharing with you." onRefresh={() => void requests.refetch()} refreshing={requests.isRefetching}>
      <Notice tone="muted">You see only the fields each worker chose to share. Profiles, work history and other workers are not searchable from this account.</Notice>
      <QueryView query={requests} loadingLabel="Loading requests…">
        {(list) =>
          list.length === 0 ? (
            <Empty title="No requests yet">This list refreshes automatically. When the worker sends a request, it appears within a few seconds.</Empty>
          ) : (
            <Stack>
              {list.map((r) => (
                <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push(`/mentor/${r.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                  <Card tone={r.status === 'requested' ? 'info' : undefined} style={{ borderLeftWidth: 4, borderLeftColor: roleTheme.mentor.color }}>
                    <Row style={{ justifyContent: 'space-between' }} wrap>
                      <Text variant="heading">{r.worker_display_name ?? 'Name not shared'}</Text>
                      <Chip label={r.status.toUpperCase()} mono t={statusTone[r.status]} />
                    </Row>
                    <Text variant="small">Towards {r.target_role.title}</Text>
                    <Row wrap>
                      {r.worker_is_synthetic ? <Provenance kind="synthetic" /> : null}
                      <Text variant="caption">Shared: {r.shared_fields.map((f) => fieldLabel(fields.data, f)).join(', ')}</Text>
                    </Row>
                    <Text variant="mono" style={{ color: colors.ink400 }}>{new Date(r.created_at).toLocaleString()}</Text>
                  </Card>
                </Pressable>
              ))}
            </Stack>
          )
        }
      </QueryView>
    </Screen>
  );
}
