import { Save } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '../../auth/AuthProvider';
import { errorMessage } from '../../lib/api';
import { SECTOR_LABEL } from '../../lib/format';
import { useOnboardingOptions, useProfile, useUpdatePreferences } from '../../lib/queries';
import type { Profile } from '../../lib/types';
import { Badge, Button, Card, Chips, ErrorState, Field, Notice, PageHeader, SectionTitle, Spinner } from '../../ui/kit';

const MODES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

function PreferencesForm({ profile, cities }: { profile: Profile; cities: string[] }) {
  const me = useMe();
  const update = useUpdatePreferences(me.profile_id!);
  const p = profile.preferences;
  const [headline, setHeadline] = useState(profile.headline);
  const [locations, setLocations] = useState<string[]>(p.locations ?? []);
  const [modes, setModes] = useState<string[]>(p.work_modes ?? []);
  const [hours, setHours] = useState(p.weekly_learning_hours ? String(p.weekly_learning_hours) : '');
  const [weeks, setWeeks] = useState(p.max_transition_weeks ? String(p.max_transition_weeks) : '');

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <SectionTitle title="About you" />
        <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
        {profile.sector ? (
          <p className="text-sm text-ink-600">
            Sector: <Badge tone="sap">{SECTOR_LABEL[profile.sector]}</Badge>
          </p>
        ) : null}
      </Card>
      <Card className="space-y-5">
        <SectionTitle title="Hard constraints" subtitle="Applied before ranking. A role that breaks one is filtered out, with the reason shown." />
        <div>
          <p className="text-xs font-semibold text-ink-700 mb-2">Cities</p>
          <Chips multiple options={cities.map((c) => ({ value: c, label: c }))} value={locations} onChange={setLocations} />
          <p className="text-[11px] text-ink-500 mt-1.5">Leave empty to consider all of Delhi-NCR.</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-700 mb-2">Work modes</p>
          <Chips multiple options={MODES} value={modes} onChange={setModes} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Learning hours per week" type="number" min={1} max={60} value={hours} onChange={(e) => setHours(e.target.value)} hint="Used to estimate weeks to close a gap" />
          <Field label="Longest transition you accept (weeks)" type="number" min={1} max={260} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </div>
      </Card>
      {update.isError ? <Notice tone="danger">{errorMessage(update.error)}</Notice> : null}
      {update.isSuccess ? <Notice tone="success">Saved. Your roles were recalculated.</Notice> : null}
      <Button
        icon={<Save className="w-4 h-4" />}
        loading={update.isPending}
        onClick={() =>
          update.mutate({
            headline: headline.trim() || undefined,
            locations,
            work_modes: modes,
            weekly_learning_hours: hours ? Number(hours) : null,
            max_transition_weeks: weeks ? Number(weeks) : null,
          })
        }
      >
        Save preferences
      </Button>
    </div>
  );
}

export default function Settings() {
  const me = useMe();
  const profile = useProfile(me.profile_id!);
  const options = useOnboardingOptions();
  return (
    <>
      <PageHeader eyebrow="Your rules" title="Preferences" subtitle="Constraints filter roles before any score is computed. Salary is never shared with anyone." />
      {profile.isPending || options.isPending ? (
        <Spinner />
      ) : profile.isError ? (
        <ErrorState error={profile.error} />
      ) : (
        <PreferencesForm profile={profile.data} cities={options.data?.cities ?? []} />
      )}
    </>
  );
}
