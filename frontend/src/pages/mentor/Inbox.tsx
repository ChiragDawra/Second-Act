import { ArrowUpRight, Inbox as InboxIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/AuthProvider';
import { firstName, formatDate } from '../../lib/format';
import { useMentorRequests } from '../../lib/queries';
import type { MentorRequestSummary } from '../../lib/types';
import { Badge, Card, Chips, Empty, ErrorState, PageHeader, Provenance, Spinner, Stat } from '../../ui/kit';

const TONE = { requested: 'amber', accepted: 'green', declined: 'grey', revoked: 'grey', completed: 'sap' } as const;
type Filter = 'open' | 'all';

export default function Inbox() {
  const me = useMe();
  const requests = useMentorRequests();
  const [filter, setFilter] = useState<Filter[]>(['open']);

  if (requests.isPending) return <Spinner />;
  if (requests.isError) return <ErrorState error={requests.error} onRetry={() => void requests.refetch()} />;
  const all = requests.data;
  const open = all.filter((r) => r.status === 'requested' || r.status === 'accepted');
  const shown: MentorRequestSummary[] = filter.includes('open') ? open : all;

  return (
    <>
      <PageHeader
        eyebrow="Mentor workspace"
        title={`Hello, ${firstName(me.display_name)}`}
        subtitle="People who asked for your help. You see only the fields each person approved, and they can withdraw at any time."
      />
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Waiting for you" value={all.filter((r) => r.status === 'requested').length} accent="amber" />
        <Stat label="Active" value={all.filter((r) => r.status === 'accepted').length} accent="sap" />
        <Stat label="All time" value={all.length} />
      </div>
      <div className="mb-4">
        <Chips
          options={[
            { value: 'open', label: 'Open' },
            { value: 'all', label: 'All' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      {shown.length === 0 ? (
        <Empty icon={<InboxIcon className="w-5 h-5" />} title="No requests yet">
          Job seekers whose gaps match your skills will find you here.
        </Empty>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <Link key={r.id} to={`/app/mentor/requests/${r.id}`}>
              <Card className="hover:shadow-elevated transition-shadow flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-sap-100 text-sap-700 font-bold flex items-center justify-center shrink-0">
                  {(r.worker_display_name ?? '?').slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-950">{r.worker_display_name ?? 'Name not shared'}</p>
                    <Badge tone={TONE[r.status]}>{r.status}</Badge>
                    {r.worker_is_synthetic ? <Provenance kind="synthetic" /> : null}
                  </div>
                  <p className="text-sm text-ink-500">
                    Towards {r.target_role.title} · {r.shared_fields.length} items shared · {formatDate(r.created_at)}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-ink-300" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
