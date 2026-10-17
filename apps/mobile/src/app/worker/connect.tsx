import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMe } from '../../auth/AuthProvider';
import {
  fieldLabel,
  useMentorMatches,
  useMentorships,
  useOrganizations,
  useRecommendations,
  useRequestMentor,
  useRevokeMentorship,
  useRevokeShare,
  useShareFields,
  useShares,
  useShareWithRecruiter,
} from '../../features/queries';
import { errorMessage } from '../../lib/api';
import { colors, fonts, roleTheme } from '../../lib/theme';
import type { MentorMatch, ShareField } from '../../lib/types';
import { Chip, Provenance, tones } from '../../ui/badges';
import { CheckRow, ConfirmButton, ConsentBox, Field, Segmented } from '../../ui/forms';
import { Bullet, Button, Card, Row, Section, Stack, Text } from '../../ui/primitives';
import { Screen, useRefetchOnFocus } from '../../ui/Screen';
import { Empty, Notice, QueryView } from '../../ui/states';

const MENTOR_DEFAULT = ['display_name', 'career_goal', 'gap_areas', 'assessment_results', 'skills_summary'];
const RECRUITER_DEFAULT = ['display_name', 'career_goal', 'skills_summary', 'assessment_results', 'career_preferences', 'role_suitability'];

export default function WorkerConnect() {
  const me = useMe();
  const profileId = me.profile_id!;
  const [tab, setTab] = useState<'mentor' | 'recruiter'>('mentor');
  const recs = useRecommendations(profileId);
  const fields = useShareFields();
  const mentorships = useMentorships(profileId);
  const shares = useShares(profileId);
  useRefetchOnFocus(mentorships.refetch);

  const roleOptions = useMemo(() => {
    const r = recs.data;
    if (!r) return [];
    return [...r.top, ...r.other_eligible, ...r.stretch].map((e) => ({ value: e.role_id, label: e.title }));
  }, [recs.data]);
  const [pickedRoleId, setRoleId] = useState<string | null>(null);
  // Default to the demo's target role once recommendations load; the user can change it.
  const roleId = pickedRoleId ?? roleOptions.find((o) => o.value === 'qa-automation-engineer-bfsi')?.value ?? roleOptions[0]?.value ?? null;

  return (
    <Screen
      title="Connect"
      subtitle="Nothing leaves your profile until you approve exactly what is shared, and with whom."
      onRefresh={() => void Promise.all([mentorships.refetch(), shares.refetch(), recs.refetch()])}
      refreshing={mentorships.isRefetching}
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mentor', label: 'Mentor' },
          { value: 'recruiter', label: 'Recruiter sharing' },
        ]}
      />

      <Section title="Target role" subtitle="Used to find gap areas and to label what you share">
        <Row wrap>
          {roleOptions.map((o) => (
            <Button key={o.value} label={o.label} compact kind={o.value === roleId ? 'primary' : 'secondary'} onPress={() => setRoleId(o.value)} />
          ))}
        </Row>
      </Section>

      {tab === 'mentor' ? (
        <MentorPanel profileId={profileId} roleId={roleId} fields={fields.data ?? []} />
      ) : (
        <RecruiterPanel profileId={profileId} roleId={roleId} fields={fields.data ?? []} />
      )}
    </Screen>
  );
}

function FieldPicker({ fields, selected, onChange, color }: { fields: ShareField[]; selected: string[]; onChange: (next: string[]) => void; color: string }) {
  return (
    <View>
      {fields.map((f) => (
        <CheckRow
          key={f.id}
          label={f.label}
          checked={selected.includes(f.id)}
          color={color}
          onToggle={() => onChange(selected.includes(f.id) ? selected.filter((x) => x !== f.id) : [...selected, f.id])}
        />
      ))}
    </View>
  );
}

function MentorPanel({ profileId, roleId, fields }: { profileId: string; roleId: string | null; fields: ShareField[] }) {
  const matches = useMentorMatches(profileId, roleId);
  const mentorships = useMentorships(profileId);
  const request = useRequestMentor(profileId);
  const revoke = useRevokeMentorship(profileId);
  const [chosen, setChosen] = useState<MentorMatch | null>(null);
  const [selected, setSelected] = useState<string[]>(MENTOR_DEFAULT);
  const [message, setMessage] = useState('');
  const [approved, setApproved] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const statement = chosen && roleId
    ? `I approve sharing these items with ${chosen.mentor.display_name} (synthetic demo mentor) for mentorship towards ${matches.data?.target_role.title ?? 'this role'}: ${selected.map((s) => fieldLabel(fields, s)).join('; ') || 'nothing selected'}. Nothing else is shared, and I can revoke this at any time.`
    : '';

  return (
    <Stack gap={20}>
      {done ? <Notice tone="success">{done}</Notice> : null}

      <Section title="Your mentorship requests">
        <QueryView query={mentorships}>
          {(list) =>
            list.length === 0 ? (
              <Text variant="small">No requests yet.</Text>
            ) : (
              list.map((r) => (
                <Card key={r.id} tone={r.status === 'accepted' ? 'success' : r.status === 'requested' ? 'info' : 'muted'}>
                  <Row style={{ justifyContent: 'space-between' }} wrap>
                    <Text variant="heading">{r.mentor.display_name}</Text>
                    <Chip label={r.status.toUpperCase()} mono t={r.status === 'accepted' ? tones.green : r.status === 'requested' ? tones.blue : tones.grey} />
                  </Row>
                  <Text variant="caption">Towards {r.target_role.title} · shared: {r.shared_fields.map((f) => fieldLabel(fields, f)).join(', ')}</Text>
                  {r.feedback.map((f) => (
                    <Card key={f.id} tone="muted">
                      <Text variant="label">Mentor feedback · {new Date(f.created_at).toLocaleString()}</Text>
                      <Text variant="small" style={{ color: colors.ink900 }}>{f.body}</Text>
                      {f.action_items.map((a) => <Bullet key={a}>{a}</Bullet>)}
                    </Card>
                  ))}
                  {r.status === 'requested' || r.status === 'accepted' ? (
                    <ConfirmButton label="Revoke sharing" confirmLabel="Yes, revoke now" loading={revoke.isPending} onConfirm={() => revoke.mutate(r.id)} />
                  ) : null}
                </Card>
              ))
            )
          }
        </QueryView>
      </Section>

      <Section title="Suggested mentors" subtitle="Ranked by gap coverage, role experience, availability and language">
        {!roleId ? <Text variant="small">Choose a target role.</Text> : null}
        <QueryView query={matches} loadingLabel="Matching mentors…">
          {(m) => (
            <Stack>
              <Notice tone="muted">{m.privacy_note}</Notice>
              <Row wrap>
                <Text variant="caption">Gap areas for {m.target_role.title}:</Text>
                {m.gap_skills.map((g) => <Chip key={g.id} label={g.name} t={tones.amber} />)}
              </Row>
              {m.matches.map((x) => (
                <Card key={x.mentor.id} tone={x.eligible ? undefined : 'muted'} style={chosen?.mentor.id === x.mentor.id ? { borderColor: roleTheme.mentor.color, borderWidth: 2 } : undefined}>
                  <Row style={{ justifyContent: 'space-between' }} wrap>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading">{x.mentor.display_name}</Text>
                      <Text variant="caption">{x.mentor.headline}</Text>
                    </View>
                    {x.score !== null ? <Text style={{ fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink950 }}>{x.score.toFixed(0)}</Text> : null}
                  </Row>
                  <Row wrap>
                    {x.mentor.is_synthetic ? <Provenance kind="synthetic" /> : null}
                    {x.mentor.has_demo_login ? <Chip label="Has demo login" t={tones.green} /> : <Chip label="Catalogue only" />}
                  </Row>
                  {x.exclusion_reason ? <Text variant="small" style={{ color: colors.red }}>Not available: {x.exclusion_reason}</Text> : x.reasons.map((r) => <Bullet key={r}>{r}</Bullet>)}
                  {x.open_request ? (
                    <Text variant="caption">You already have a {x.open_request.status} request with this mentor.</Text>
                  ) : x.eligible ? (
                    <Button label={chosen?.mentor.id === x.mentor.id ? 'Selected' : 'Choose this mentor'} kind="secondary" compact onPress={() => { setChosen(x); setApproved(false); setDone(null); }} />
                  ) : null}
                </Card>
              ))}
            </Stack>
          )}
        </QueryView>
      </Section>

      {chosen && roleId ? (
        <Section title={`Share with ${chosen.mentor.display_name}`} subtitle="Choose the minimum the mentor needs">
          <Card>
            <FieldPicker fields={fields} selected={selected} onChange={(s) => { setSelected(s); setApproved(false); }} color={roleTheme.mentor.color} />
            <Field label="Message (optional)" value={message} onChangeText={setMessage} maxLength={500} multiline placeholder="What would you like help with?" />
            <ConsentBox statement={statement} approved={approved} onToggle={() => setApproved((a) => !a)} />
            {request.isError ? <Notice tone="danger">{errorMessage(request.error)}</Notice> : null}
            <Button
              label="Send mentorship request"
              disabled={!approved || selected.length === 0}
              loading={request.isPending}
              onPress={() =>
                request.mutate(
                  { mentor_id: chosen.mentor.id, target_role_id: roleId, shared_fields: selected, message, approved },
                  {
                    onSuccess: () => {
                      setDone(`Request sent to ${chosen.mentor.display_name}. They can now see only the items you selected.`);
                      setChosen(null);
                      setApproved(false);
                      setMessage('');
                    },
                  },
                )
              }
            />
          </Card>
        </Section>
      ) : null}
    </Stack>
  );
}

function RecruiterPanel({ profileId, roleId, fields }: { profileId: string; roleId: string | null; fields: ShareField[] }) {
  const orgs = useOrganizations();
  const shares = useShares(profileId);
  const share = useShareWithRecruiter(profileId);
  const revoke = useRevokeShare(profileId);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(RECRUITER_DEFAULT);
  const [approved, setApproved] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const org = orgs.data?.find((o) => o.id === orgId);

  const statement = org
    ? `I approve sharing these items with recruiters at ${org.name} for review: ${selected.map((s) => fieldLabel(fields, s)).join('; ') || 'nothing selected'}. This does not apply for any job on my behalf, and I can revoke it at any time.`
    : '';

  return (
    <Stack gap={20}>
      {done ? <Notice tone="success">{done}</Notice> : null}
      <Section title="Active and past sharing">
        <QueryView query={shares}>
          {(list) =>
            list.length === 0 ? (
              <Text variant="small">You are not sharing with any recruiter.</Text>
            ) : (
              list.map((s) => (
                <Card key={s.id} tone={s.revoked_at ? 'muted' : 'success'}>
                  <Row style={{ justifyContent: 'space-between' }} wrap>
                    <Text variant="heading">{s.org.name}</Text>
                    <Chip label={s.revoked_at ? 'REVOKED' : 'ACTIVE'} mono t={s.revoked_at ? tones.grey : tones.green} />
                  </Row>
                  <Text variant="caption">Shared: {s.fields.map((f) => fieldLabel(fields, f)).join(', ')}</Text>
                  {!s.revoked_at ? <ConfirmButton label="Revoke sharing" confirmLabel="Yes, revoke now" loading={revoke.isPending} onConfirm={() => revoke.mutate(s.id)} /> : null}
                </Card>
              ))
            )
          }
        </QueryView>
      </Section>

      <Section title="Share with a recruiter organisation" subtitle="Recruiters only ever see workers who approved sharing with them">
        <QueryView query={orgs}>
          {(list) =>
            list.length === 0 ? (
              <Empty title="No organisations in the demo dataset" />
            ) : (
              <Row wrap>
                {list.map((o) => (
                  <Button key={o.id} label={o.name} compact kind={o.id === orgId ? 'primary' : 'secondary'} color={roleTheme.recruiter.color} onPress={() => { setOrgId(o.id); setApproved(false); setDone(null); }} />
                ))}
              </Row>
            )
          }
        </QueryView>
        {org ? (
          <Card>
            <FieldPicker fields={fields} selected={selected} onChange={(s) => { setSelected(s); setApproved(false); }} color={roleTheme.recruiter.color} />
            <ConsentBox statement={statement} approved={approved} onToggle={() => setApproved((a) => !a)} />
            {share.isError ? <Notice tone="danger">{errorMessage(share.error)}</Notice> : null}
            <Button
              label={`Share with ${org.name}`}
              color={roleTheme.recruiter.color}
              disabled={!approved || selected.length === 0}
              loading={share.isPending}
              onPress={() =>
                share.mutate(
                  { org_id: org.id, target_role_id: roleId ?? undefined, fields: selected, approved },
                  { onSuccess: () => { setDone(`Shared with ${org.name}. Their recruiters can now see only the items you selected.`); setOrgId(null); setApproved(false); } },
                )
              }
            />
          </Card>
        ) : null}
      </Section>
    </Stack>
  );
}
