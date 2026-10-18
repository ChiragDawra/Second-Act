import { Building2, Share2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '../../auth/AuthProvider';
import { errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useOrganizations, useRecommendations, useRevokeShare, useShareFields, useShares, useShareWithRecruiter } from '../../lib/queries';
import { Badge, Button, Card, Checkbox, Empty, Notice, PageHeader, Provenance, SectionTitle, Select, Spinner } from '../../ui/kit';

const DEFAULT_FIELDS = ['display_name', 'skills_summary', 'role_suitability'];

export default function Sharing() {
  const me = useMe();
  const id = me.profile_id!;
  const orgs = useOrganizations();
  const fields = useShareFields();
  const shares = useShares(id);
  const recs = useRecommendations(id);
  const share = useShareWithRecruiter(id);
  const revoke = useRevokeShare(id);
  const [orgId, setOrgId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [chosen, setChosen] = useState<string[]>(DEFAULT_FIELDS);
  const [approved, setApproved] = useState(false);

  const active = (shares.data ?? []).filter((s) => !s.revoked_at);
  const sharedOrgIds = new Set(active.map((s) => s.org.id));
  const available = (orgs.data ?? []).filter((o) => !sharedOrgIds.has(o.id));
  const orgName = orgs.data?.find((o) => o.id === orgId)?.name;
  const roles = recs.data ? [...recs.data.top, ...recs.data.other_eligible, ...recs.data.stretch] : [];

  return (
    <>
      <PageHeader eyebrow="You decide" title="Sharing with recruiters" subtitle="Recruiters only see people who chose to share with their organisation, and only the items you tick. Salary expectations are never shared." />
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <Card className="space-y-5">
          <SectionTitle title="Share with an organisation" />
          <Select label="Organisation" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">Choose…</option>
            {available.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.is_synthetic ? ' (demo)' : ''}
              </option>
            ))}
          </Select>
          <Select label="For a role (optional)" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Any role</option>
            {roles.map((r) => (
              <option key={r.role_id} value={r.role_id}>
                {r.title}
              </option>
            ))}
          </Select>
          <div>
            <p className="text-xs font-semibold text-ink-700 mb-3">What they may see</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(fields.data ?? []).map((f) => (
                <Checkbox key={f.id} checked={chosen.includes(f.id)} onChange={(on) => setChosen((p) => (on ? [...p, f.id] : p.filter((x) => x !== f.id)))} label={f.label} />
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-sap-50 border border-sap-200 p-4">
            <Checkbox
              checked={approved}
              onChange={setApproved}
              label={`I approve sharing these items with recruiters at ${orgName ?? 'this organisation'}`}
              description="This does not apply for any job on my behalf, and I can revoke it at any time."
            />
          </div>
          {share.isError ? <Notice tone="danger">{errorMessage(share.error)}</Notice> : null}
          {share.isSuccess ? <Notice tone="success">Shared. You can revoke it below at any time.</Notice> : null}
          <Button
            icon={<Share2 className="w-4 h-4" />}
            disabled={!orgId || !approved || chosen.length === 0}
            loading={share.isPending}
            onClick={() =>
              share.mutate(
                { org_id: orgId, target_role_id: roleId || undefined, fields: chosen, approved },
                {
                  onSuccess: () => {
                    setOrgId('');
                    setApproved(false);
                  },
                },
              )
            }
          >
            Share
          </Button>
        </Card>

        <div>
          <SectionTitle title="Currently shared" />
          {shares.isPending ? (
            <Spinner />
          ) : active.length === 0 ? (
            <Empty icon={<ShieldCheck className="w-5 h-5" />} title="Nothing shared">
              No recruiter can see you.
            </Empty>
          ) : (
            <div className="space-y-3">
              {active.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-ink-400" />
                    <p className="font-semibold text-sm text-ink-950 flex-1">{s.org.name}</p>
                    {s.org.is_synthetic ? <Provenance kind="synthetic" /> : null}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.fields.map((f) => (
                      <Badge key={f}>{fields.data?.find((x) => x.id === f)?.label ?? f}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-ink-400">Since {formatDate(s.granted_at)}</span>
                    <Button size="sm" kind="secondary" loading={revoke.isPending} onClick={() => revoke.mutate(s.id)}>
                      Revoke
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
