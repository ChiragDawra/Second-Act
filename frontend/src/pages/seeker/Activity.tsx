import { Activity as ActivityIcon } from 'lucide-react';
import { useMe } from '../../auth/AuthProvider';
import { describeEvent, formatDateTime } from '../../lib/format';
import { useWorkerAudit } from '../../lib/queries';
import { Badge, Card, cn, Empty, ErrorState, PageHeader, Spinner } from '../../ui/kit';

export default function Activity() {
  const me = useMe();
  const audit = useWorkerAudit(me.profile_id!);
  return (
    <>
      <PageHeader eyebrow="Transparency" title="Activity" subtitle="Who did what with your information. Every view of what you shared is recorded here." />
      {audit.isPending ? (
        <Spinner />
      ) : audit.isError ? (
        <ErrorState error={audit.error} onRetry={() => void audit.refetch()} />
      ) : audit.data.length === 0 ? (
        <Empty icon={<ActivityIcon className="w-5 h-5" />} title="No activity yet" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ol className="divide-y divide-ink-100">
            {audit.data.map((e) => (
              <li key={e.id} className={cn('flex items-start gap-4 px-5 py-4', e.outcome === 'denied' && 'bg-red-50/50')}>
                <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', e.outcome === 'denied' ? 'bg-red-500' : e.action === 'share.viewed' ? 'bg-sap-500' : 'bg-ink-300')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-900">{describeEvent(e, true)}</p>
                  <p className="text-[11px] font-mono text-ink-400 mt-0.5">
                    {formatDateTime(e.created_at)} · {e.action}
                  </p>
                </div>
                {e.outcome === 'denied' ? <Badge tone="red" mono>Denied</Badge> : null}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  );
}
