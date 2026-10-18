import { Target } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '../../auth/AuthProvider';
import { familyLabel } from '../../lib/format';
import { useRecommendations } from '../../lib/queries';
import type { RoleEvaluation } from '../../lib/types';
import { Chips, cn, Empty, ErrorState, PageHeader, SectionTitle, Spinner } from '../../ui/kit';
import { RoleCard } from '../../ui/RoleCard';

type Tab = 'recommended' | 'eligible' | 'stretch' | 'filtered';

export default function Roles() {
  const me = useMe();
  const recs = useRecommendations(me.profile_id!);
  const [tab, setTab] = useState<Tab>('recommended');
  const [family, setFamily] = useState<string[]>([]);

  if (recs.isPending) return <Spinner />;
  if (recs.isError) return <ErrorState error={recs.error} onRetry={() => void recs.refetch()} />;
  const r = recs.data;

  const lists: Record<Tab, { label: string; hint: string; roles: RoleEvaluation[] }> = {
    recommended: { label: 'Recommended', hint: 'Up to three eligible roles with the highest estimated fit that clear the bar.', roles: r.top },
    eligible: { label: 'Other eligible', hint: 'Eligible roles below the top three.', roles: r.other_eligible },
    stretch: { label: 'Stretch', hint: 'A mandatory requirement blocks these today, however high the score.', roles: r.stretch },
    filtered: { label: 'Filtered out', hint: 'Your preferences exclude these before ranking. The reason is shown.', roles: r.filtered },
  };
  const families = [...new Set([...r.top, ...r.other_eligible, ...r.stretch, ...r.filtered].map((x) => x.family))];
  const shown = lists[tab].roles.filter((x) => family.length === 0 || family.includes(x.family));

  return (
    <>
      <PageHeader
        eyebrow="Adjacent roles"
        title="Roles you can reach"
        subtitle={`${r.score_disclaimer} Unknown skills are listed as unknown, never counted as missing.`}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="inline-flex rounded-xl border border-ink-200 bg-white p-1">
          {(Object.keys(lists) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn('px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors', tab === t ? 'bg-ink-950 text-white' : 'text-ink-600 hover:text-ink-950')}
            >
              {lists[t].label} <span className="opacity-60">{lists[t].roles.length}</span>
            </button>
          ))}
        </div>
        {families.length > 1 ? (
          <Chips multiple options={families.map((f) => ({ value: f, label: familyLabel(f) }))} value={family} onChange={setFamily} />
        ) : null}
      </div>
      <SectionTitle title={lists[tab].label} subtitle={lists[tab].hint} />
      {shown.length === 0 ? (
        <Empty icon={<Target className="w-5 h-5" />} title="Nothing here">
          {tab === 'recommended' ? 'No role clears the recommendation bar yet. Add skills or adjust your levels.' : 'No roles in this group.'}
        </Empty>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((role) => (
            <RoleCard key={role.role_id} role={role} highlight={tab === 'recommended' && role.rank === 1} />
          ))}
        </div>
      )}
      <p className="text-[11px] font-mono text-ink-400 mt-8">
        {r.scoring_version} · {r.dataset_version} · input {r.input_hash.slice(0, 10)}
      </p>
    </>
  );
}
