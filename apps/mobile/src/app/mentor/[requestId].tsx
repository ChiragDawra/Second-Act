import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { fieldLabel, useShareFields } from '../../features/queries';
import { SharedProjectionView } from '../../features/SharedProjectionView';
import { api, errorMessage } from '../../lib/api';
import { colors, roleTheme } from '../../lib/theme';
import type { MentorRequestDetail } from '../../lib/types';
import { Chip, tones } from '../../ui/badges';
import { Field, Segmented } from '../../ui/forms';
import { Bullet, Button, Card, Row, Section, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Notice, QueryView } from '../../ui/states';

export default function MentorRequest() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const qc = useQueryClient();
  const fields = useShareFields();
  const detail = useQuery({
    queryKey: ['mentor-request', requestId],
    queryFn: () => api<MentorRequestDetail>(`/mentor/requests/${requestId}`),
    refetchInterval: 10_000,
  });
  useRefetchOnFocus(detail.refetch);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['mentor-request', requestId] }), qc.invalidateQueries({ queryKey: ['mentor-requests'] })]);

  const respond = useMutation({
    mutationFn: (decision: 'accept' | 'decline') => api(`/mentor/requests/${requestId}/respond`, { method: 'POST', body: { decision } }),
    onSuccess: refresh,
  });

  return (
    <Screen onRefresh={() => void detail.refetch()} refreshing={detail.isRefetching}>
      <Button label="← All requests" kind="ghost" compact onPress={() => router.navigate('/mentor')} />
      <QueryView query={detail} loadingLabel="Loading the shared information…">
        {(d) => (
          <Stack gap={20}>
            <Card style={{ borderLeftWidth: 4, borderLeftColor: roleTheme.mentor.color }}>
              <Row style={{ justifyContent: 'space-between' }} wrap>
                <Text variant="title">Mentorship request</Text>
                <Chip label={d.request.status.toUpperCase()} mono t={d.request.status === 'accepted' ? tones.green : d.request.status === 'requested' ? tones.blue : tones.grey} />
              </Row>
              <Text variant="caption">Received {new Date(d.request.created_at).toLocaleString()}</Text>
              {d.request.message ? (
                <Card tone="muted">
                  <Text variant="label">Message from the worker</Text>
                  <Text variant="small" style={{ color: colors.ink900 }}>{d.request.message}</Text>
                </Card>
              ) : null}
              {d.request.status === 'requested' ? (
                <Row wrap>
                  <Button label="Accept" kind="success" loading={respond.isPending && respond.variables === 'accept'} onPress={() => respond.mutate('accept')} />
                  <Button label="Decline" kind="danger" loading={respond.isPending && respond.variables === 'decline'} onPress={() => respond.mutate('decline')} />
                </Row>
              ) : null}
              {respond.isError ? <Notice tone="danger">{errorMessage(respond.error)}</Notice> : null}
            </Card>

            {d.shared ? (
              <SharedProjectionView shared={d.shared} withheldLabels={d.request.withheld_fields.map((f) => fieldLabel(fields.data, f))} />
            ) : (
              <Notice tone="warn">{`The worker’s information is no longer available to you because this request was ${d.request.status}.`}</Notice>
            )}

            {d.request.status === 'accepted' ? <NoteComposer requestId={requestId} onSaved={refresh} /> : null}

            <Section title="Your notes" subtitle="Feedback is shared with the worker; progress notes stay private to you">
              {d.notes.length === 0 ? (
                <Text variant="small">No notes yet.</Text>
              ) : (
                d.notes.map((n) => (
                  <Card key={n.id} tone={n.kind === 'feedback' ? 'success' : 'muted'}>
                    <Row style={{ justifyContent: 'space-between' }} wrap>
                      <Text variant="label">{n.kind === 'feedback' ? 'Feedback · visible to worker' : 'Progress · private to you'}</Text>
                      <Text variant="mono">{new Date(n.created_at).toLocaleString()}</Text>
                    </Row>
                    <Text variant="small" style={{ color: colors.ink900 }}>{n.body}</Text>
                    {n.action_items.map((a) => <Bullet key={a}>{a}</Bullet>)}
                  </Card>
                ))
              )}
            </Section>
          </Stack>
        )}
      </QueryView>
    </Screen>
  );
}

function NoteComposer({ requestId, onSaved }: { requestId: string; onSaved: () => Promise<unknown> }) {
  const [kind, setKind] = useState<'feedback' | 'progress'>('feedback');
  const [body, setBody] = useState('');
  const [items, setItems] = useState('');
  const save = useMutation({
    mutationFn: () =>
      api(`/mentor/requests/${requestId}/notes`, {
        method: 'POST',
        body: { kind, body, action_items: items.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 5) },
      }),
    onSuccess: async () => {
      setBody('');
      setItems('');
      await onSaved();
    },
  });
  return (
    <Section title="Record mentoring progress">
      <Card>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'feedback', label: 'Feedback (shared)' },
            { value: 'progress', label: 'Progress (private)' },
          ]}
        />
        <Field label={kind === 'feedback' ? 'Feedback for the worker' : 'Private progress note'} value={body} onChangeText={setBody} multiline maxLength={1000} placeholder="Session notes, observations, next steps…" />
        {kind === 'feedback' ? <Field label="Action items (one per line, up to 5)" value={items} onChangeText={setItems} multiline placeholder={'Run the suite in CI\nAdd one API test'} /> : null}
        <Text variant="caption">Mentor feedback is guidance only — it never changes a skill’s verified status.</Text>
        {save.isError ? <Notice tone="danger">{errorMessage(save.error)}</Notice> : null}
        <Button label="Save note" color={roleTheme.mentor.color} disabled={!body.trim()} loading={save.isPending} onPress={() => save.mutate()} />
      </Card>
    </Section>
  );
}
