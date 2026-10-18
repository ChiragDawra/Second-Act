import { ArrowUpRight, Briefcase, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/format';
import { useCandidates, useOpenings } from '../../lib/queries';
import { Badge, Button, Card, Empty, ErrorState, PageHeader, Provenance, Spinner, Stat } from '../../ui/kit';

export default function Candidates() {
  const list = useCandidates();
  const openings = useOpenings();
  if (list.isPending) return <Spinner />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  const open = (openings.data?.openings ?? []).filter((o) => o.status !== 'closed').length;

  return (
    <>
      <PageHeader
        eyebrow={list.data.organization.name}
        title="Candidates"
        subtitle={list.data.eligibility_rule}
        actions={
          <Link to="/app/recruiter/openings">
            <Button kind="contrast" icon={<Briefcase className="w-4 h-4" />}>
              Openings
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Stat label="Candidates sharing with you" value={list.data.candidates.length} accent="accent" />
        <Stat label="Open roles" value={open} />
        <Card className="p-4 hidden lg:flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-sage" />
          <p className="text-xs text-fg-muted">Every view is recorded in the candidate&rsquo;s activity log. Revoked shares disappear immediately.</p>
        </Card>
      </div>
      {list.data.candidates.length === 0 ? (
        <Empty icon={<Users className="w-5 h-5" />} title="No candidates yet">
          Candidates appear when they choose to share with {list.data.organization.name}. Posting openings helps them see how well they fit.
        </Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.data.candidates.map((c) => (
            <Link key={c.grant_id} to={`/app/recruiter/candidates/${c.grant_id}`}>
              <Card className="hover:shadow-pop transition-shadow h-full">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center shrink-0">{(c.display_name ?? '?').slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-fg">{c.display_name ?? 'Name not shared'}</p>
                      {c.is_synthetic ? <Provenance kind="synthetic" /> : null}
                    </div>
                    {c.career_goal ? <p className="text-sm text-fg-subtle">Interested in {c.career_goal.title}</p> : null}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge>{c.fields.length} items shared</Badge>
                      <Badge>since {formatDate(c.granted_at)}</Badge>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-fg-subtle" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
