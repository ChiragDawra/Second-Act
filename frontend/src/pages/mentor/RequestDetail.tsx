import { ArrowLeft, Check, Lock, MessageSquare, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useAddNote, useMentorRequest, useRespond } from '../../lib/queries';
import { Badge, Button, Card, Chips, ErrorState, Notice, SectionTitle, Spinner, TextArea } from '../../ui/kit';
import { SharedProjectionView } from '../../ui/SharedProjection';

export default function RequestDetail() {
  const { id = '' } = useParams();
  const req = useMentorRequest(id);
  const respond = useRespond(id);
  const note = useAddNote(id);
  const [kind, setKind] = useState<('feedback' | 'progress')[]>(['feedback']);
  const [body, setBody] = useState('');

  if (req.isPending) return <Spinner />;
  if (req.isError) return <ErrorState error={req.error} onRetry={() => void req.refetch()} />;
  const { request, shared, notes } = req.data;

  return (
    <>
      <Link to="/app/mentor" className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-subtle hover:text-fg mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> All requests
      </Link>

      {request.status === 'requested' ? (
        <Card tone="accent" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="font-semibold text-fg">This person asked for your help</p>
            {request.message ? <p className="text-sm text-fg-muted mt-1 italic">“{request.message}”</p> : null}
          </div>
          <div className="flex gap-2">
            <Button kind="secondary" icon={<X className="w-4 h-4" />} loading={respond.isPending} onClick={() => respond.mutate('decline')}>
              Decline
            </Button>
            <Button icon={<Check className="w-4 h-4" />} loading={respond.isPending} onClick={() => respond.mutate('accept')}>
              Accept
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mb-6">
          <Badge tone={request.status === 'accepted' ? 'sage' : 'grey'}>{request.status}</Badge>
        </div>
      )}
      {respond.isError ? (
        <div className="mb-4">
          <Notice tone="danger">{errorMessage(respond.error)}</Notice>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <SharedProjectionView shared={shared} withheld={request.withheld_fields} />

        <div className="space-y-4">
          {request.status === 'accepted' ? (
            <Card className="space-y-3">
              <SectionTitle title="Add a note" />
              <Chips
                options={[
                  { value: 'feedback', label: 'Feedback (they see it)' },
                  { value: 'progress', label: 'Progress (private)' },
                ]}
                value={kind}
                onChange={setKind}
              />
              <TextArea label="Note" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
              {note.isError ? <Notice tone="danger">{errorMessage(note.error)}</Notice> : null}
              <Button
                disabled={!body.trim()}
                loading={note.isPending}
                onClick={() => note.mutate({ kind: kind[0] ?? 'feedback', body: body.trim(), action_items: [] }, { onSuccess: () => setBody('') })}
              >
                Save note
              </Button>
            </Card>
          ) : null}
          <SectionTitle title="Notes" />
          {notes.length === 0 ? (
            <Card tone="muted">
              <p className="text-sm text-fg-subtle">No notes yet.</p>
            </Card>
          ) : (
            notes.map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex items-center gap-2 text-xs">
                  {n.kind === 'feedback' ? <MessageSquare className="w-3.5 h-3.5 text-accent" /> : <Lock className="w-3.5 h-3.5 text-fg-subtle" />}
                  <span className="font-semibold">{n.kind === 'feedback' ? 'Feedback · visible to them' : 'Private progress note'}</span>
                  <span className="ml-auto text-fg-subtle">{formatDateTime(n.created_at)}</span>
                </div>
                <p className="text-sm text-fg mt-2">{n.body}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
