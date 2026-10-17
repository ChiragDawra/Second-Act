import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  AssessmentDetail,
  AssessmentOutcome,
  AssessmentSummary,
  AuditEvent,
  MentorMatches,
  Opportunity,
  Profile,
  Recommendations,
  RoleDetail,
  RoleGaps,
  ShareField,
  WorkerMentorship,
  WorkerShare,
  WorkerSkill,
} from '../lib/types';

export const CONSENT_VERSION = 'share-consent-v1';
const LIVE = 8_000;

export const keys = {
  profile: (id: string) => ['profile', id] as const,
  skills: (id: string) => ['skills', id] as const,
  recs: (id: string) => ['recs', id] as const,
  gaps: (id: string, role: string) => ['gaps', id, role] as const,
  mentorships: (id: string) => ['mentorships', id] as const,
  shares: (id: string) => ['shares', id] as const,
  audit: (id: string) => ['audit', id] as const,
};

export const useProfile = (id: string) => useQuery({ queryKey: keys.profile(id), queryFn: () => api<{ profile: Profile }>(`/profiles/${id}`).then((r) => r.profile) });
export const useSkills = (id: string) => useQuery({ queryKey: keys.skills(id), queryFn: () => api<{ skills: WorkerSkill[]; extraction_version: string }>(`/profiles/${id}/skills`) });
export const useRecommendations = (id: string) => useQuery({ queryKey: keys.recs(id), queryFn: () => api<Recommendations>(`/recommendations/latest?profile_id=${id}`) });
export const useRoleGaps = (id: string, roleId: string) =>
  useQuery({ queryKey: keys.gaps(id, roleId), queryFn: () => api<RoleGaps>(`/roles/${roleId}/gaps?profile_id=${id}`) });
export const useRoleDetail = (roleId: string) => useQuery({ queryKey: ['role', roleId], queryFn: () => api<RoleDetail>(`/roles/${roleId}`) });
export const useAssessments = () => useQuery({ queryKey: ['assessments'], queryFn: () => api<{ assessments: AssessmentSummary[] }>('/assessments').then((r) => r.assessments) });
export const useAssessment = (id: string | null) =>
  useQuery({ queryKey: ['assessment', id], queryFn: () => api<AssessmentDetail>(`/assessments/${id}`), enabled: !!id });
export const useShareFields = () => useQuery({ queryKey: ['share-fields'], queryFn: () => api<{ fields: ShareField[] }>('/share-fields').then((r) => r.fields), staleTime: Infinity });
export const useOrganizations = () =>
  useQuery({ queryKey: ['orgs'], queryFn: () => api<{ organizations: { id: string; name: string; is_synthetic: boolean }[] }>('/organizations').then((r) => r.organizations) });
export const useOpportunities = () => useQuery({ queryKey: ['opportunities'], queryFn: () => api<{ opportunities: Opportunity[] }>('/opportunities').then((r) => r.opportunities) });
export const useMentorMatches = (id: string, roleId: string | null) =>
  useQuery({ queryKey: ['matches', id, roleId], queryFn: () => api<MentorMatches>(`/mentors/matches?profile_id=${id}&role_id=${roleId}`), enabled: !!roleId });
export const useMentorships = (id: string) =>
  useQuery({ queryKey: keys.mentorships(id), queryFn: () => api<{ requests: WorkerMentorship[] }>(`/mentorships?profile_id=${id}`).then((r) => r.requests), refetchInterval: LIVE });
export const useShares = (id: string) => useQuery({ queryKey: keys.shares(id), queryFn: () => api<{ shares: WorkerShare[] }>(`/profiles/${id}/shares`).then((r) => r.shares) });
export const useWorkerAudit = (id: string) =>
  useQuery({ queryKey: keys.audit(id), queryFn: () => api<{ events: AuditEvent[] }>(`/audit/${id}`).then((r) => r.events), refetchInterval: LIVE });

/** Any change to evidence re-ranks roles server-side, so refresh every dependent view. */
function useInvalidateWorker(id: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.skills(id) }),
      qc.invalidateQueries({ queryKey: keys.recs(id) }),
      qc.invalidateQueries({ queryKey: ['gaps', id] }),
      qc.invalidateQueries({ queryKey: ['matches', id] }),
      qc.invalidateQueries({ queryKey: keys.audit(id) }),
    ]);
}

export type SkillAction = { skill_id: string; action: 'confirm' | 'edit' | 'reject'; proficiency?: number };

export function useReviewSkills(id: string) {
  const invalidate = useInvalidateWorker(id);
  return useMutation({
    mutationFn: (updates: SkillAction[]) =>
      api<{ applied: unknown[]; recommendations: Recommendations }>(`/profiles/${id}/skills`, { method: 'PATCH', body: { updates } }),
    onSuccess: invalidate,
  });
}

export function useSubmitAssessment(id: string) {
  const invalidate = useInvalidateWorker(id);
  return useMutation({
    mutationFn: ({ assessmentId, answers }: { assessmentId: string; answers: Record<string, string> }) =>
      api<AssessmentOutcome>(`/assessments/${assessmentId}/results`, { method: 'POST', body: { profile_id: id, answers } }),
    onSuccess: invalidate,
  });
}

export function useRequestMentor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mentor_id: string; target_role_id: string; shared_fields: string[]; message?: string; approved: boolean }) =>
      api<{ request: { id: string } }>('/mentorships', {
        method: 'POST',
        body: {
          profile_id: id,
          mentor_id: body.mentor_id,
          target_role_id: body.target_role_id,
          shared_fields: body.shared_fields,
          message: body.message || undefined,
          consent: { approved: body.approved, statement_version: CONSENT_VERSION },
        },
      }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.mentorships(id) }), qc.invalidateQueries({ queryKey: ['matches', id] }), qc.invalidateQueries({ queryKey: keys.audit(id) })]),
  });
}

export function useRevokeMentorship(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api(`/mentorships/${requestId}/revoke`, { method: 'POST', body: {} }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.mentorships(id) }), qc.invalidateQueries({ queryKey: ['matches', id] })]),
  });
}

export function useShareWithRecruiter(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { org_id: string; target_role_id?: string; fields: string[]; approved: boolean }) =>
      api(`/profiles/${id}/share-approval`, {
        method: 'POST',
        body: {
          recipient: { type: 'recruiter_org', org_id: body.org_id },
          target_role_id: body.target_role_id,
          fields: body.fields,
          consent: { approved: body.approved, statement_version: CONSENT_VERSION },
        },
      }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.shares(id) }), qc.invalidateQueries({ queryKey: keys.audit(id) })]),
  });
}

export function useRevokeShare(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => api(`/shares/${grantId}/revoke`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.shares(id) }),
  });
}

export const fieldLabel = (fields: ShareField[] | undefined, id: string) => fields?.find((f) => f.id === id)?.label ?? id;
