import { Briefcase, Check, ClipboardCheck, GraduationCap, X } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useAccounts, useDecide } from '../../lib/queries';
import { Badge, Button, Card, Chips, Empty, ErrorState, Notice, PageHeader, Spinner } from '../../ui/kit';

type Status = 'pending' | 'active' | 'rejected' | 'all';

export default function Approvals() {
  const [status, setStatus] = useState<Status[]>(['pending']);
  const accounts = useAccounts(status[0] ?? 'pending');
  const decide = useDecide();

  return (
    <>
      <PageHeader
        eyebrow="Trust & safety"
        title="Account approvals"
        subtitle="Mentors and recruiters wait here before they can see anyone. Check that the person and organisation are real. Job seekers never need approval."
      />
      <div className="mb-5">
        <Chips
          options={[
            { value: 'pending', label: 'Waiting' },
            { value: 'active', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'all', label: 'All' },
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>
      {decide.isError ? (
        <div className="mb-4">
          <Notice tone="danger">{errorMessage(decide.error)}</Notice>
        </div>
      ) : null}
      {accounts.isPending ? (
        <Spinner />
      ) : accounts.isError ? (
        <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
      ) : accounts.data.length === 0 ? (
        <Empty icon={<ClipboardCheck className="w-5 h-5" />} title="Nothing here">
          New mentor and recruiter sign-ups appear in Waiting.
        </Empty>
      ) : (
        <div className="space-y-4">
          {accounts.data.map((a) => (
            <Card key={a.user_id}>
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${a.role === 'mentor' ? 'bg-accent/10 text-accent' : 'bg-coral/10 text-coral'}`}>
                  {a.role === 'mentor' ? <GraduationCap className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-fg">{a.display_name}</p>
                    <Badge tone={a.role === 'mentor' ? 'accent' : 'coral'}>{a.role}</Badge>
                    <Badge tone={a.status === 'active' ? 'sage' : a.status === 'rejected' ? 'ember' : 'grey'}>{a.status}</Badge>
                  </div>
                  <p className="text-sm text-fg-subtle">
                    {a.email ?? 'no email'} · signed up {formatDateTime(a.onboarded_at ?? a.created_at)}
                  </p>
                  {a.org ? (
                    <p className="text-sm text-fg-muted mt-2">
                      Organisation: <span className="font-semibold">{a.org.name}</span> <Badge>{a.org.status}</Badge>
                    </p>
                  ) : null}
                  {a.mentor ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-semibold text-fg">{a.mentor.headline}</p>
                      <p className="text-sm text-fg-muted">{a.mentor.bio}</p>
                      <div className="flex flex-wrap gap-1">
                        {a.mentor.skills.map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                      </div>
                      <p className="text-[11px] text-fg-subtle">
                        {a.mentor.languages.join(', ')} · {a.mentor.availability_hours_per_week} h/week
                      </p>
                    </div>
                  ) : null}
                </div>
                {a.status === 'pending' ? (
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <Button icon={<Check className="w-4 h-4" />} loading={decide.isPending} onClick={() => decide.mutate({ userId: a.user_id, decision: 'approve' })}>
                      Approve
                    </Button>
                    <Button kind="secondary" icon={<X className="w-4 h-4" />} loading={decide.isPending} onClick={() => decide.mutate({ userId: a.user_id, decision: 'reject' })}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
