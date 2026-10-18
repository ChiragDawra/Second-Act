import { Target } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '../../auth/AuthProvider';
import { familyLabel } from '../../lib/format';
import { useProfile, useRecommendations } from '../../lib/queries';
import type { RoleEvaluation } from '../../lib/types';
import { Chips, Empty, ErrorState, PageHeader, Skeleton, Tabs } from '../../ui/kit';
import { RoleCard } from '../../ui/RoleCard';

type Tab = 'recommended' | 'eligible' | 'stretch' | 'filtered';

const HINT: Record<Tab, string> = {
  recommended: 'Up to three eligible roles with the highest estimated fit that clear the recommendation bar.',
  eligible: 'Eligible roles below the top three.',
  stretch: 'A mandatory requirement blocks these today, however high the score. The plan shows what unlocks them.',
  filtered: 'Your preferences exclude these before ranking. The reason is on each card.',
};

export default function Roles() {
  const me = useMe();
  const recs = useRecommendations(me.profile_id!);
  const profile = useProfile(me.profile_id!);
  const [tab, setTab] = useState<Tab>('recommended');
  const [family, setFamily] = useState<string[]>([]);

  const header = (
    <PageHeader
      eyebrow="Adjacent roles"
      title={
        <>
          Roles within <em>reach</em>
        </>
      }
      subtitle="Ranked by estimated skill fit — never a hiring probability. Skills with no evidence are shown as unknown, not counted as missing."
    />
  );
  if (recs.isPending) {
    return (
      <>
        {header}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </>
    );
  }
  if (recs.isError) return <ErrorState error={recs.error} onRetry={() => void recs.refetch()} />;
  const r = recs.data;
  const weekly = profile.data?.preferences.weekly_learning_hours ?? null;
  const currentTitle = profile.data?.current_role_title ?? null;

  const lists: Record<Tab, RoleEvaluation[]> = { recommended: r.top, eligible: r.other_eligible, stretch: r.stretch, filtered: r.filtered };
  const families = [...new Set(Object.values(lists).flat().map((x) => x.family))];
  const shown = lists[tab].filter((x) => family.length === 0 || family.includes(x.family));

  return (
    <>
      {header}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'recommended', label: 'Recommended', count: r.top.length },
            { value: 'eligible', label: 'Other eligible', count: r.other_eligible.length },
            { value: 'stretch', label: 'Stretch', count: r.stretch.length },
            { value: 'filtered', label: 'Filtered out', count: r.filtered.length },
          ]}
        />
        {families.length > 1 ? <Chips multiple options={families.map((f) => ({ value: f, label: familyLabel(f) }))} value={family} onChange={setFamily} /> : null}
      </div>
      <p className="text-xs text-fg-subtle mb-6">{HINT[tab]}</p>
      {shown.length === 0 ? (
        <Empty icon={<Target className="w-5 h-5" />} title="Nothing here">
          {tab === 'recommended' ? 'No role clears the recommendation bar yet. Add skills or check your levels.' : 'No roles in this group.'}
        </Empty>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((role) => (
            <RoleCard
              key={role.role_id}
              role={role}
              plan={r.plans?.[role.role_id]}
              weeklyHours={weekly}
              current={r.notes?.[role.role_id]?.is_current ?? currentTitle === role.title}
              stepBack={r.notes?.[role.role_id]?.step_back ?? false}
              highlight={tab === 'recommended' && role.rank === 1 && currentTitle !== role.title}
            />
          ))}
        </div>
      )}
      <p className="text-[11px] font-mono text-fg-subtle mt-10">
        {r.scoring_version} · {r.dataset_version} · input {r.input_hash.slice(0, 10)}
      </p>
    </>
  );
}
