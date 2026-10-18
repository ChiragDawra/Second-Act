import { Briefcase, MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../lib/api';
import { familyLabel, formatDate } from '../../lib/format';
import { useCloseOpening, useOpenings, usePostOpening, useRoles } from '../../lib/queries';
import { Badge, Button, Card, Empty, ErrorState, Field, Notice, PageHeader, Provenance, SectionTitle, Select, Spinner } from '../../ui/kit';

const CITIES = ['Delhi', 'Gurugram', 'Noida', 'Ghaziabad', 'Faridabad'];

export default function Openings() {
  const openings = useOpenings();
  const roles = useRoles();
  const post = usePostOpening();
  const close = useCloseOpening();
  const [roleId, setRoleId] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Gurugram');
  const [mode, setMode] = useState('hybrid');
  const [salary, setSalary] = useState('');

  if (openings.isPending) return <Spinner />;
  if (openings.isError) return <ErrorState error={openings.error} onRetry={() => void openings.refetch()} />;
  const ncr = (roles.data ?? []).filter((r) => r.catalogue === 'ncr');
  const demo = (roles.data ?? []).filter((r) => r.catalogue === 'demo');

  return (
    <>
      <PageHeader eyebrow={openings.data.organization.name} title="Openings" subtitle="Candidates who share role suitability see an estimated fit for each open role. Openings you post are labelled as posted by your organisation." />
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
        <Card className="space-y-4 h-fit">
          <SectionTitle title="Post an opening" />
          <Select
            label="Role it maps to"
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value);
              if (!title) setTitle(roles.data?.find((r) => r.id === e.target.value)?.title ?? '');
            }}
          >
            <option value="">Choose a role…</option>
            {ncr.length ? (
              <optgroup label="Delhi-NCR roles">
                {ncr.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} · {familyLabel(r.family)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {demo.length ? (
              <optgroup label="Demo roles">
                {demo.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
          <Field label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="City" value={location} onChange={(e) => setLocation(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select label="Work mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
          </div>
          <Field label="Salary band (optional)" placeholder="e.g. ₹4–6 LPA" value={salary} onChange={(e) => setSalary(e.target.value)} maxLength={60} />
          {post.isError ? <Notice tone="danger">{errorMessage(post.error)}</Notice> : null}
          <Button
            icon={<Plus className="w-4 h-4" />}
            disabled={!roleId || title.trim().length < 3}
            loading={post.isPending}
            onClick={() =>
              post.mutate(
                { role_id: roleId, title: title.trim(), location, work_mode: mode, salary_band_text: salary.trim() || undefined },
                {
                  onSuccess: () => {
                    setRoleId('');
                    setTitle('');
                    setSalary('');
                  },
                },
              )
            }
          >
            Post opening
          </Button>
        </Card>

        <div>
          <SectionTitle title="Your openings" />
          {openings.data.openings.length === 0 ? (
            <Empty icon={<Briefcase className="w-5 h-5" />} title="No openings yet" />
          ) : (
            <div className="space-y-3">
              {openings.data.openings.map((o) => (
                <Card key={o.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink-950">{o.title}</p>
                      {o.is_simulated ? <Provenance kind="simulated" /> : <Provenance kind="employer" />}
                      <Badge tone={o.status === 'closed' ? 'grey' : 'green'}>{o.status === 'simulated_open' ? 'simulated' : o.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {o.location} · {o.work_mode} · maps to {o.role_title}
                      {o.posted_at ? ` · posted ${formatDate(o.posted_at)}` : ''}
                    </p>
                  </div>
                  {o.source_type === 'employer_posted' && o.status === 'open' ? (
                    <Button size="sm" kind="secondary" loading={close.isPending} onClick={() => close.mutate(o.id)}>
                      Close
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
