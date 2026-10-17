import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../lib/api';
import { colors, fonts } from '../../lib/theme';
import type { AuditEvent } from '../../lib/types';
import { Chip, tones } from '../../ui/badges';
import { Segmented } from '../../ui/forms';
import { Card, Row, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Empty, Notice, QueryView } from '../../ui/states';

const roleTone = { worker: tones.blue, mentor: tones.green, recruiter: tones.violet, admin: tones.grey } as Record<string, typeof tones.grey>;

export default function AdminAudit() {
  const [filter, setFilter] = useState<'all' | 'denied'>('all');
  const audit = useQuery({
    queryKey: ['admin-audit', filter],
    queryFn: () => api<{ events: AuditEvent[] }>(`/admin/audit?limit=150${filter === 'denied' ? '&outcome=denied' : ''}`).then((r) => r.events),
    refetchInterval: 8_000,
  });
  useRefetchOnFocus(audit.refetch);

  return (
    <Screen title="Audit trail" subtitle="Append-only. Actions, actors and IDs — never resume text, notes or answers." onRefresh={() => void audit.refetch()} refreshing={audit.isRefetching}>
      <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All events' }, { value: 'denied', label: 'Refused requests' }]} />
      <Notice tone="muted">Subjects appear as profile IDs. This account cannot open worker profiles.</Notice>
      <QueryView query={audit} loadingLabel="Loading audit events…">
        {(events) =>
          events.length === 0 ? (
            <Empty title="No events" />
          ) : (
            <Stack gap={8}>
              {events.map((e) => (
                <Card key={e.id} tone={e.outcome === 'denied' ? 'warn' : undefined} style={{ paddingVertical: 10 }}>
                  <Row style={{ justifyContent: 'space-between' }} wrap>
                    <Text style={{ fontFamily: fonts.semibold, color: colors.ink900, fontSize: 13.5 }}>{e.action}</Text>
                    <Row>
                      {e.actor_role ? <Chip label={e.actor_role} t={roleTone[e.actor_role] ?? tones.grey} /> : null}
                      {e.outcome !== 'success' ? <Chip label={e.outcome.toUpperCase()} mono t={tones.red} /> : null}
                    </Row>
                  </Row>
                  <Text variant="mono">
                    {new Date(e.created_at).toLocaleString()} · {e.object_type}
                    {e.object_id ? ` ${String(e.object_id).slice(0, 36)}` : ''}
                  </Text>
                  {Object.keys(e.metadata).length > 0 ? (
                    <View>
                      <Text variant="caption" numberOfLines={3}>
                        {Object.entries(e.metadata).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' · ')}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              ))}
            </Stack>
          )
        }
      </QueryView>
    </Screen>
  );
}
