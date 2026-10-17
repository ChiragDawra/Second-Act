import { useMe } from '../../auth/AuthProvider';
import { useWorkerAudit } from '../../features/queries';
import { colors } from '../../lib/theme';
import type { AuditEvent } from '../../lib/types';
import { Chip, tones } from '../../ui/badges';
import { Card, Row, Stack, Text } from '../../ui/primitives';
import { Screen } from '../../ui/Screen';
import { Empty, QueryView } from '../../ui/states';

const describe = (e: AuditEvent): string => {
  const who = e.actor_role === 'worker' ? 'You' : e.actor_role ? `The ${e.actor_role}` : 'The system';
  switch (e.action) {
    case 'share.viewed':
      return `${who} viewed the information you shared`;
    case 'skill.reviewed':
      return `${who} reviewed ${String(e.metadata.skill_id ?? 'a skill')} (${String(e.metadata.action ?? '')})`;
    case 'assessment.submitted':
      return `${who} completed an assessment: ${String(e.metadata.score)}/${String(e.metadata.max_score)}${e.metadata.passed ? ', passed' : ''}`;
    case 'skill.status_changed':
      return `${String(e.metadata.cause === 'assessment' ? 'Assessment' : 'Change')}: ${String(e.metadata.from_status)} → ${String(e.metadata.to_status)}`;
    case 'consent.granted':
      return `${who} approved sharing (${String(e.metadata.purpose).replace('_', ' ')})`;
    case 'consent.revoked':
      return `${who} revoked sharing (${String(e.metadata.purpose).replace('_', ' ')})`;
    case 'mentorship.requested':
      return `${who} requested a mentor`;
    case 'mentorship.accepted':
      return 'Your mentor accepted the request';
    case 'mentorship.declined':
      return 'The mentor declined the request';
    case 'mentor_note.created':
      return e.metadata.visible_to_worker ? 'Your mentor left feedback' : 'Your mentor recorded a private progress note';
    case 'share.granted':
      return `${who} shared with a recruiter organisation`;
    case 'recommendations.computed':
      return 'Role recommendations were recomputed';
    case 'authz.denied':
      return `A ${e.actor_role ?? 'unknown'} account was refused access to your data`;
    case 'skills.extracted':
      return 'Skills were extracted from your work history';
    default:
      return e.action;
  }
};

export default function WorkerActivity() {
  const me = useMe();
  const audit = useWorkerAudit(me.profile_id!);
  return (
    <Screen title="Activity" subtitle="Who did what with your information. Updates every few seconds." onRefresh={() => void audit.refetch()} refreshing={audit.isRefetching}>
      <QueryView query={audit} loadingLabel="Loading activity…">
        {(events) =>
          events.length === 0 ? (
            <Empty title="No activity yet" />
          ) : (
            <Stack gap={8}>
              {events.map((e) => (
                <Card key={e.id} tone={e.outcome === 'denied' ? 'warn' : e.action === 'share.viewed' ? 'info' : undefined} style={{ paddingVertical: 10 }}>
                  <Row style={{ justifyContent: 'space-between' }} wrap>
                    <Text variant="small" style={{ color: colors.ink900, flex: 1 }}>{describe(e)}</Text>
                    {e.outcome === 'denied' ? <Chip label="DENIED" mono t={tones.red} /> : null}
                  </Row>
                  <Text variant="mono">{new Date(e.created_at).toLocaleString()} · {e.action}</Text>
                </Card>
              ))}
            </Stack>
          )
        }
      </QueryView>
    </Screen>
  );
}
