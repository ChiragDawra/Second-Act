import { EyeOff, Lock } from 'lucide-react';
import { formatDate } from '../lib/format';
import type { SharedProjection } from '../lib/types';
import { Badge, Card, FitDial, LevelBar, ReadinessBadge, SectionTitle, StatusBadge } from './kit';

/**
 * Renders exactly what a worker approved for this mentor or recruiter. Fields that were not
 * shared are absent from the API response, so they cannot be rendered by mistake.
 */
export function SharedProjectionView({ shared, withheld }: { shared: SharedProjection | null; withheld: string[] }) {
  if (!shared) {
    return (
      <Card tone="muted">
        <p className="text-sm text-ink-600">Nothing is visible right now. The worker may have withdrawn sharing.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {shared.display_name ? <h2 className="text-xl font-extrabold text-ink-950 mr-2">{shared.display_name}</h2> : <h2 className="text-xl font-extrabold text-ink-400 mr-2">Name not shared</h2>}
        {shared.is_synthetic ? <Badge tone="violet">Synthetic person</Badge> : <Badge tone="green">Real user</Badge>}
        {shared.career_goal ? <Badge tone="sap">Target: {shared.career_goal.title}</Badge> : null}
      </div>

      {shared.skills_summary ? (
        <Card>
          <SectionTitle title="Skills" subtitle="Status and level as the worker's profile records them" />
          <div className="divide-y divide-ink-100">
            {shared.skills_summary.map((s) => (
              <div key={s.skill_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium text-ink-900">{s.name}</span>
                <div className="flex items-center gap-3">
                  <LevelBar level={s.proficiency} />
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {shared.skill_evidence ? (
        <Card>
          <SectionTitle title="Evidence" subtitle="Sentences from the worker's own resume or work history" />
          <div className="space-y-3">
            {shared.skill_evidence.map((e) => (
              <div key={e.skill_id} className="rounded-xl bg-ink-50 px-4 py-3">
                <p className="text-xs font-semibold text-ink-700">{e.name}</p>
                <p className="text-sm text-ink-600 mt-1 italic">“{e.evidence_snippet}”</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {shared.gap_areas ? (
        <Card tone="amber">
          <SectionTitle title="Gaps for the target role" right={<ReadinessBadge status={shared.gap_areas.readiness_status} />} />
          <ul className="space-y-1.5 text-sm text-ink-800">
            {shared.gap_areas.critical_gaps.map((g) => (
              <li key={g.skill_id}>
                {g.name}: level {g.worker_level ?? 0} → {g.required_level}
                {g.is_mandatory ? <Badge tone="red" className="ml-2">Mandatory</Badge> : null}
              </li>
            ))}
            {shared.gap_areas.unknowns.map((g) => (
              <li key={g.skill_id} className="text-ink-500">
                {g.name}: no evidence yet (unknown, not missing)
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {shared.role_suitability ? (
        <Card>
          <SectionTitle title="Role suitability" subtitle={`Estimated skill fit, not hiring probability · ${shared.role_suitability.scoring_version}`} />
          <div className="grid sm:grid-cols-2 gap-3">
            {shared.role_suitability.roles.slice(0, 6).map((r) => (
              <div key={r.role_id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                <FitDial score={r.role_fit_score} size={48} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{r.title}</p>
                  <ReadinessBadge status={r.readiness_status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {shared.assessment_results?.length ? (
        <Card>
          <SectionTitle title="Assessment results" />
          {shared.assessment_results.map((a) => (
            <div key={a.assessment_id + a.created_at} className="flex items-center justify-between text-sm py-1.5">
              <span>{a.title}</span>
              <span className="font-mono text-xs">
                {a.score}/{a.max_score} {a.passed ? '· passed' : ''} · {formatDate(a.created_at)}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      {shared.career_preferences ? (
        <Card>
          <SectionTitle title="Preferences" subtitle="Salary expectations are never shared" />
          <p className="text-sm text-ink-700">
            {[shared.career_preferences.locations?.join(', '), shared.career_preferences.work_modes?.join(', '), shared.career_preferences.weekly_learning_hours ? `${shared.career_preferences.weekly_learning_hours} h/week learning` : null]
              .filter(Boolean)
              .join(' · ') || 'No preferences set'}
          </p>
        </Card>
      ) : null}

      {shared.experience_summary ? (
        <Card>
          <SectionTitle title="Work history" />
          <p className="text-sm text-ink-700 whitespace-pre-line leading-relaxed">{shared.experience_summary}</p>
        </Card>
      ) : null}

      {withheld.length > 0 ? (
        <Card tone="muted">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <EyeOff className="w-4 h-4" /> Not shared with you
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {withheld.map((w) => (
              <Badge key={w} tone="grey">
                <Lock className="w-3 h-3" /> {w}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
