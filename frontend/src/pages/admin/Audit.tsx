import { useState } from 'react';
import { describeEvent, formatDateTime } from '../../lib/format';
import { useAdminAudit } from '../../lib/queries';
import { Badge, Card, Chips, cn, ErrorState, PageHeader, Spinner } from '../../ui/kit';

type Filter = 'all' | 'denied';

export default function Audit() {
  const [filter, setFilter] = useState<Filter[]>(['all']);
  const events = useAdminAudit(filter[0] === 'denied' ? 'denied' : undefined);
  return (
    <>
      <PageHeader eyebrow="Append-only" title="Audit trail" subtitle="Who did what, when. Actions, roles and counts only: no resume text, notes, answers or tokens are ever recorded." />
      <div className="mb-4">
        <Chips
          options={[
            { value: 'all', label: 'Everything' },
            { value: 'denied', label: 'Refused only' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      {events.isPending ? (
        <Spinner />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-fg-subtle bg-surface-2 border-b border-line">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">What happened</th>
                  <th className="px-5 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.data.map((e) => (
                  <tr key={e.id} className={cn(e.outcome === 'denied' && 'bg-ember/10')}>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-fg-subtle">{formatDateTime(e.created_at)}</td>
                    <td className="px-3 py-3">
                      <Badge>{e.actor_role ?? 'system'}</Badge>
                    </td>
                    <td className="px-3 py-3 text-fg">
                      {describeEvent(e)}
                      {e.outcome === 'denied' ? <Badge tone="ember" className="ml-2">refused</Badge> : null}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-fg-subtle whitespace-nowrap">{e.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
