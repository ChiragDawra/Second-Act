import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCandidate } from '../../lib/queries';
import { Card, ErrorState, FitDial, Notice, Provenance, ReadinessBadge, SectionTitle, Spinner } from '../../ui/kit';
import { SharedProjectionView } from '../../ui/SharedProjection';

export default function CandidateDetail() {
  const { grantId = '' } = useParams();
  const c = useCandidate(grantId);
  if (c.isPending) return <Spinner />;
  if (c.isError) return <ErrorState error={c.error} />;
  const d = c.data;

  return (
    <>
      <Link to="/app/recruiter" className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-subtle hover:text-fg mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> All candidates
      </Link>
      <div className="mb-6">
        <Notice tone="info">{d.notice}</Notice>
      </div>
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <SharedProjectionView shared={d.shared} withheld={d.withheld_field_labels} />
        <div>
          <SectionTitle title="Fit for your openings" subtitle="Only shown when the candidate shared role suitability" />
          {d.opportunity_fit === null ? (
            <Card tone="muted">
              <p className="text-sm text-fg-subtle">The candidate did not share role suitability.</p>
            </Card>
          ) : d.opportunity_fit.length === 0 ? (
            <Card tone="muted">
              <p className="text-sm text-fg-subtle">
                Post an opening to see how this candidate fits it. <Link to="/app/recruiter/openings" className="font-semibold text-accent hover:underline">Openings</Link>
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {d.opportunity_fit.map((o) => (
                <Card key={o.opportunity_id} className="flex items-center gap-4">
                  <FitDial score={o.evaluation?.role_fit_score ?? null} size={56} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg">{o.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {o.evaluation ? <ReadinessBadge status={o.evaluation.readiness_status} /> : null}
                      {o.is_simulated ? <Provenance kind="simulated" /> : <Provenance kind="employer" />}
                    </div>
                    {!o.evaluation ? <p className="text-xs text-fg-subtle mt-1">This role is outside the candidate&rsquo;s catalogue; no estimate.</p> : null}
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
