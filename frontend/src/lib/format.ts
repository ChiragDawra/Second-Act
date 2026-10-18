import type { AuditEvent, RoleEvaluation, Sector } from './types';

export const SECTOR_LABEL: Record<Sector, string> = {
  qa: 'QA & software testing',
  'banking-ba': 'Banking ops & business analysis',
  support: 'Customer & IT support',
  data: 'Data & reporting',
};

/** Delhi-NCR roles carry their sector as `family`; demo roles carry a free-text family. */
export const familyLabel = (family: string) => SECTOR_LABEL[family as Sector] ?? family;

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** "40h" or "40h · ~7 weeks" when the worker set a weekly learning time. */
export function hoursLabel(hours: number, weeklyHours?: number | null): string {
  if (hours <= 0) return 'no study needed';
  return weeklyHours && weeklyHours > 0 ? `${hours}h · ~${Math.ceil(hours / weeklyHours)} wk` : `${hours}h of study`;
}

/** Morning, afternoon or evening greeting in the viewer's own time zone. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** The single most useful next step for a role: a mandatory blocker first, then the largest gap. */
export function nextStep(e: RoleEvaluation): { kind: 'prove' | 'learn' | 'ready'; text: string } {
  const blocker = e.mandatory.find((m) => m.gate === 'blocker');
  if (blocker) return { kind: 'prove', text: `Reach level ${blocker.required_level} in ${blocker.name} — it is mandatory for this role.` };
  const gap = e.critical_gaps[0];
  if (gap) return { kind: 'learn', text: `Close your largest gap: ${gap.name} (level ${gap.worker_level ?? 0} → ${gap.required_level}).` };
  const pending = e.mandatory.find((m) => m.gate === 'needs_validation');
  if (pending) return { kind: 'prove', text: `Verify ${pending.name} with an assessment to move from self-reported to verified.` };
  return { kind: 'ready', text: 'You meet every requirement at the required level.' };
}

export function describeEvent(e: AuditEvent, forWorker = false): string {
  const who = e.actor_role === 'worker' && forWorker ? 'You' : e.actor_role ? `The ${e.actor_role}` : 'The system';
  const m = e.metadata ?? {};
  switch (e.action) {
    case 'share.viewed':
      return `${who} viewed the information you shared`;
    case 'skill.reviewed':
      return `${who} reviewed ${String(m.skill_id ?? 'a skill')} (${String(m.action ?? '')})`;
    case 'skills.imported':
      return `${who} saved ${String(m.written ?? '')} skills from a resume review`;
    case 'assessment.submitted':
      return `${who} completed an assessment: ${String(m.score)}/${String(m.max_score)}${m.passed ? ', passed' : ''}`;
    case 'skill.status_changed':
      return `${m.cause === 'assessment' ? 'Assessment' : 'Change'}: ${String(m.from_status)} → ${String(m.to_status)}`;
    case 'consent.granted':
      return `${who} approved sharing (${String(m.purpose ?? '').replace('_', ' ')})`;
    case 'consent.revoked':
      return `${who} revoked sharing (${String(m.purpose ?? '').replace('_', ' ')})`;
    case 'mentorship.requested':
      return `${who} requested a mentor`;
    case 'mentorship.accepted':
      return 'The mentor accepted a request';
    case 'mentorship.declined':
      return 'The mentor declined a request';
    case 'mentor_note.created':
      return m.visible_to_worker ? 'A mentor left feedback' : 'A mentor recorded a private progress note';
    case 'share.granted':
      return `${who} shared with a recruiter organisation`;
    case 'recommendations.computed':
      return 'Role recommendations were recomputed';
    case 'preferences.updated':
      return `${who} updated preferences`;
    case 'authz.denied':
      return `A ${e.actor_role ?? 'signed-in'} account was refused access (${String(m.reason ?? 'not permitted')})`;
    case 'skills.extracted':
      return 'Skills were extracted from work history';
    case 'account.onboarded':
      return `A new ${String(m.account_type ?? 'account')} signed up (${String(m.status ?? '')})`;
    case 'account.approved':
      return `An administrator approved a ${String(m.role ?? '')} account`;
    case 'account.rejected':
      return `An administrator rejected a ${String(m.role ?? '')} account`;
    case 'opening.posted':
      return 'A recruiter posted an opening';
    case 'opening.closed':
      return 'A recruiter closed an opening';
    case 'ncr.resume.extract':
      return `A resume was read (${String(m.skills ?? 0)} suggestions, not stored)`;
    case 'demo.reset':
      return 'The demo scenario was reset';
    default:
      return e.action;
  }
}
