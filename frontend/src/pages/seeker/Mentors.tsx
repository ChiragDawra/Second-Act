import { MessageSquare, Send, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useMentorMatches, useMentorships, useRecommendations, useRequestMentor, useRevokeMentorship, useShareFields } from '../../lib/queries';
import type { MentorMatch } from '../../lib/types';
import { Badge, Button, Card, Checkbox, Empty, ErrorState, Notice, PageHeader, Provenance, SectionTitle, Select, Spinner, TextArea } from '../../ui/kit';

const DEFAULT_FIELDS = ['display_name', 'career_goal', 'gap_areas', 'skills_summary'];
const STATUS_TONE = { requested: 'amber', accepted: 'green', declined: 'grey', revoked: 'grey', completed: 'sap' } as const;

function RequestPanel({ match, roleId, roleTitle, onClose }: { match: MentorMatch; roleId: string; roleTitle: string; onClose: () => void }) {
  const me = useMe();
  const fields = useShareFields();
  const send = useRequestMentor(me.profile_id!);
  const [chosen, setChosen] = useState<string[]>(DEFAULT_FIELDS);
  const [message, setMessage] = useState('');
  const [approved, setApproved] = useState(false);
  const labels = (fields.data ?? []).filter((f) => chosen.includes(f.id)).map((f) => f.label);

  return (
    <Card tone="sap" className="mt-4 space-y-4">
      <p className="text-sm font-semibold text-ink-950">Choose exactly what {match.mentor.display_name} may see</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {(fields.data ?? []).map((f) => (
          <Checkbox key={f.id} checked={chosen.includes(f.id)} onChange={(on) => setChosen((p) => (on ? [...p, f.id] : p.filter((x) => x !== f.id)))} label={f.label} />
        ))}
      </div>
      <TextArea label="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} placeholder="What would you like help with?" />
      <div className="rounded-xl bg-white border border-sap-200 p-4">
        <Checkbox
          checked={approved}
          onChange={setApproved}
          label={`I approve sharing with ${match.mentor.display_name} for mentorship towards ${roleTitle}`}
          description={`Shared: ${labels.join('; ') || 'nothing selected'}. Nothing else is shared, and I can withdraw at any time.`}
        />
      </div>
      {send.isError ? <Notice tone="danger">{errorMessage(send.error)}</Notice> : null}
      <div className="flex gap-2 justify-end">
        <Button kind="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          icon={<Send className="w-4 h-4" />}
          disabled={!approved || chosen.length === 0}
          loading={send.isPending}
          onClick={() => send.mutate({ mentor_id: match.mentor.id, target_role_id: roleId, shared_fields: chosen, message, approved }, { onSuccess: onClose })}
        >
          Send request
        </Button>
      </div>
    </Card>
  );
}

export default function Mentors() {
  const me = useMe();
  const id = me.profile_id!;
  const [params, setParams] = useSearchParams();
  const recs = useRecommendations(id);
  const roles = recs.data ? [...recs.data.top, ...recs.data.other_eligible, ...recs.data.stretch] : [];
  const roleId = params.get('role') ?? roles[0]?.role_id ?? null;
  const matches = useMentorMatches(id, roleId);
  const mine = useMentorships(id);
  const revoke = useRevokeMentorship(id);
  const [open, setOpen] = useState<string | null>(null);
  const roleTitle = roles.find((r) => r.role_id === roleId)?.title ?? 'this role';

  return (
    <>
      <PageHeader eyebrow="People who made the move" title="Mentors" subtitle="Matched on your gaps for the role you pick. Nothing is shared until you approve a request." />

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <Select label="Target role" value={roleId ?? ''} onChange={(e) => setParams({ role: e.target.value })}>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </Card>
          {!roleId ? (
            <Empty icon={<Users className="w-5 h-5" />} title="Add skills first">
              Mentor matching works from your gaps for a role. Add skills from your resume to see roles.
            </Empty>
          ) : matches.isPending ? (
            <Spinner />
          ) : matches.isError ? (
            <ErrorState error={matches.error} onRetry={() => void matches.refetch()} />
          ) : matches.data.matches.length === 0 ? (
            <Empty icon={<Users className="w-5 h-5" />} title="No approved mentors yet for this role">
              Mentors join by signing up and being approved. Check back soon.
            </Empty>
          ) : (
            <>
              <p className="text-xs text-ink-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> {matches.data.privacy_note}
              </p>
              {matches.data.matches.map((m) => (
                <Card key={m.mentor.id}>
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-sap-100 text-sap-700 font-bold flex items-center justify-center shrink-0">
                      {m.mentor.display_name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink-950">{m.mentor.display_name}</p>
                        {m.mentor.is_synthetic ? <Provenance kind="synthetic" /> : <Badge tone="green">Approved mentor</Badge>}
                        {m.score !== null ? <Badge tone="sap">Match {Math.round(m.score)}</Badge> : null}
                      </div>
                      <p className="text-sm text-ink-600">{m.mentor.headline}</p>
                      <p className="text-xs text-ink-500 mt-2 line-clamp-2">{m.mentor.bio}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {m.covered_gaps.map((g) => (
                          <Badge key={g.id} tone="green">
                            {g.name}
                          </Badge>
                        ))}
                        {m.uncovered_gaps.slice(0, 3).map((g) => (
                          <Badge key={g.id}>{g.name}</Badge>
                        ))}
                      </div>
                      <p className="text-[11px] text-ink-400 mt-2">
                        {m.mentor.languages.join(', ')} · {m.mentor.availability_hours_per_week} h/week · {m.mentor.capacity_remaining} places left
                      </p>
                      {!m.eligible && m.exclusion_reason ? <p className="text-xs text-gapAmber-700 mt-2">{m.exclusion_reason}</p> : null}
                    </div>
                    <div className="shrink-0">
                      {m.open_request ? (
                        <Badge tone="amber">{m.open_request.status}</Badge>
                      ) : (
                        <Button size="sm" disabled={!m.eligible} onClick={() => setOpen(open === m.mentor.id ? null : m.mentor.id)}>
                          Request
                        </Button>
                      )}
                    </div>
                  </div>
                  {open === m.mentor.id && roleId ? <RequestPanel match={m} roleId={roleId} roleTitle={roleTitle} onClose={() => setOpen(null)} /> : null}
                </Card>
              ))}
            </>
          )}
        </div>

        <div>
          <SectionTitle title="Your requests" />
          {mine.isPending ? (
            <Spinner />
          ) : (mine.data ?? []).length === 0 ? (
            <Card tone="muted">
              <p className="text-sm text-ink-500">No requests yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {mine.data!.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-ink-950">{r.mentor.display_name}</p>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-500">
                    {r.target_role.title} · {formatDate(r.created_at)}
                  </p>
                  {r.feedback.map((f) => (
                    <div key={f.id} className="mt-3 rounded-lg bg-sap-50 px-3 py-2 text-sm text-ink-800 flex gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-sap-600 mt-0.5 shrink-0" />
                      <span>{f.body}</span>
                    </div>
                  ))}
                  {r.status === 'requested' || r.status === 'accepted' ? (
                    <Button size="sm" kind="ghost" className="mt-2 -ml-2" loading={revoke.isPending} onClick={() => revoke.mutate(r.id)}>
                      Withdraw sharing
                    </Button>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
