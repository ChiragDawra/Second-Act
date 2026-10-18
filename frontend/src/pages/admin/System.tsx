import { ClipboardCheck, Database, RotateCcw, Server, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useAdminOverview, useResetDemo } from '../../lib/queries';
import { Badge, Button, Card, ErrorState, Notice, PageHeader, Provenance, SectionTitle, Spinner, Stat } from '../../ui/kit';

export default function System() {
  const o = useAdminOverview();
  const reset = useResetDemo();
  const [confirm, setConfirm] = useState(false);
  if (o.isPending) return <Spinner />;
  if (o.isError) return <ErrorState error={o.error} onRetry={() => void o.refetch()} />;
  const d = o.data;
  const lastReset = d.demo_state.find((s) => s.key === 'last_reset');
  const users = d.synthetic_data.app_users_by_role as Record<string, number> | undefined;

  return (
    <>
      <PageHeader eyebrow="Administrator" title="System" subtitle={d.access_note} />

      {d.pending_accounts > 0 ? (
        <Card tone="amber" className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-gapAmber-600" />
            <p className="font-semibold text-ink-950">
              {d.pending_accounts} account{d.pending_accounts > 1 ? 's' : ''} waiting for approval
            </p>
          </div>
          <Link to="/app/admin/approvals">
            <Button kind="dark" size="sm">
              Review
            </Button>
          </Link>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="API" value={d.api.status} hint={`up ${Math.round(d.api.uptime_seconds / 60)} min · ${d.api.node}`} accent="green" />
        <Stat label="Database" value={d.database.status} hint={d.database.latency_ms !== null ? `${d.database.latency_ms} ms` : 'unreachable'} accent={d.database.status === 'ok' ? 'green' : 'amber'} />
        <Stat label="Refused requests (24h)" value={d.denied_requests_24h} accent="amber" />
        <Stat label="Accounts" value={Object.values(users ?? {}).reduce((a, b) => a + b, 0)} hint={Object.entries(users ?? {}).map(([k, v]) => `${v} ${k}`).join(' · ')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <SectionTitle title="What is live, synthetic, simulated or planned" />
          <div className="divide-y divide-ink-100">
            {d.integrations.map((i) => (
              <div key={i.name} className="py-3 flex items-start gap-3">
                <Provenance kind={i.status} />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{i.name}</p>
                  <p className="text-xs text-ink-500">{i.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionTitle title="Engine" />
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="sap">{d.engine.scoring_version}</Badge>
              <Badge>{d.engine.mentor_match_version}</Badge>
              <Badge>{d.engine.extraction_version}</Badge>
            </div>
            <p className="text-xs text-ink-500 mt-3">
              Evidence factors:{' '}
              {Object.entries(d.engine.evidence_factors)
                .map(([k, v]) => `${k} ${v}`)
                .join(' · ')}
            </p>
          </Card>
          <Card>
            <SectionTitle title="Datasets" />
            <div className="space-y-2">
              {d.dataset_versions.map((v) => (
                <div key={v.id} className="flex items-start gap-2">
                  <Database className="w-3.5 h-3.5 text-ink-400 mt-1" />
                  <div>
                    <p className="text-sm font-mono text-ink-800">
                      {v.id} <span className="text-ink-400">· {v.kind}</span>
                    </p>
                    <p className="text-xs text-ink-500">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card tone="muted">
            <SectionTitle title="Demo scenario" subtitle={lastReset ? `Last reset ${formatDateTime(lastReset.updated_at)}` : 'Never reset'} />
            <p className="text-xs text-ink-600 mb-3">
              Restores the synthetic Harpreet scenario. Real (Google) accounts are never touched.
            </p>
            {reset.isError ? <Notice tone="danger">{errorMessage(reset.error)}</Notice> : null}
            {reset.isSuccess ? <Notice tone="success">Demo reset.</Notice> : null}
            {confirm ? (
              <div className="flex gap-2">
                <Button kind="danger" icon={<RotateCcw className="w-4 h-4" />} loading={reset.isPending} onClick={() => reset.mutate(undefined, { onSettled: () => setConfirm(false) })}>
                  Confirm reset
                </Button>
                <Button kind="ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button kind="secondary" icon={<RotateCcw className="w-4 h-4" />} onClick={() => setConfirm(true)}>
                Reset demo scenario
              </Button>
            )}
          </Card>
          <p className="text-[11px] text-ink-400 flex items-center gap-1.5">
            <Server className="w-3 h-3" /> <ShieldAlert className="w-3 h-3" /> Admins never see worker profiles, skills or resumes.
          </p>
        </div>
      </div>
    </>
  );
}
