import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiUpload } from './api';
import type {
  AdminOverview,
  AssessmentDetail,
  AssessmentOutcome,
  AssessmentSummary,
  AuditEvent,
  MentorMatches,
  MentorRequestDetail,
  MentorRequestSummary,
  MeState,
  NcrExtraction,
  OnboardingOptions,
  Opportunity,
  PendingAccount,
  Profile,
  RecruiterCandidate,
  RecruiterCandidateDetail,
  RecruiterOpening,
  Recommendations,
  RoleDetail,
  RoleGaps,
  ShareField,
  WorkerMentorship,
  WorkerShare,
  WorkerSkill,
} from './types';

export const CONSENT_VERSION = 'share-consent-v1';
const LIVE = 10_000;

// ----------------------------------------------------------- onboarding
export const useOnboardingOptions = () =>
  useQuery({ queryKey: ['onboarding-options'], queryFn: () => api<OnboardingOptions>('/onboarding/options'), staleTime: Infinity });

export function useOnboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api<MeState>('/onboarding', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

// --------------------------------------------------------------- worker
export const workerKeys = {
  profile: (id: string) => ['profile', id] as const,
  skills: (id: string) => ['skills', id] as const,
  recs: (id: string) => ['recs', id] as const,
};

export const useProfile = (id: string) =>
  useQuery({ queryKey: workerKeys.profile(id), queryFn: () => api<{ profile: Profile }>(`/profiles/${id}`).then((r) => r.profile) });
export const useSkills = (id: string) =>
  useQuery({ queryKey: workerKeys.skills(id), queryFn: () => api<{ skills: WorkerSkill[]; extraction_version: string }>(`/profiles/${id}/skills`) });
export const useRecommendations = (id: string) =>
  useQuery({ queryKey: workerKeys.recs(id), queryFn: () => api<Recommendations>(`/recommendations/latest?profile_id=${id}`) });
export const useRoleGaps = (id: string, roleId: string) =>
  useQuery({ queryKey: ['gaps', id, roleId], queryFn: () => api<RoleGaps>(`/roles/${roleId}/gaps?profile_id=${id}`) });
export const useRoleDetail = (roleId: string) => useQuery({ queryKey: ['role', roleId], queryFn: () => api<RoleDetail>(`/roles/${roleId}`) });
export const useAssessments = () =>
  useQuery({ queryKey: ['assessments'], queryFn: () => api<{ assessments: AssessmentSummary[] }>('/assessments').then((r) => r.assessments) });
export const useAssessment = (id: string | null) =>
  useQuery({ queryKey: ['assessment', id], queryFn: () => api<AssessmentDetail>(`/assessments/${id}`), enabled: !!id });
export const useShareFields = () =>
  useQuery({ queryKey: ['share-fields'], queryFn: () => api<{ fields: ShareField[] }>('/share-fields').then((r) => r.fields), staleTime: Infinity });
export const useOrganizations = () =>
  useQuery({ queryKey: ['orgs'], queryFn: () => api<{ organizations: { id: string; name: string; is_synthetic: boolean }[] }>('/organizations').then((r) => r.organizations) });
export const useOpportunities = () =>
  useQuery({ queryKey: ['opportunities'], queryFn: () => api<{ opportunities: Opportunity[] }>('/opportunities').then((r) => r.opportunities) });
export const useMentorMatches = (id: string, roleId: string | null) =>
  useQuery({ queryKey: ['matches', id, roleId], queryFn: () => api<MentorMatches>(`/mentors/matches?profile_id=${id}&role_id=${roleId}`), enabled: !!roleId });
export const useMentorships = (id: string) =>
  useQuery({ queryKey: ['mentorships', id], queryFn: () => api<{ requests: WorkerMentorship[] }>(`/mentorships?profile_id=${id}`).then((r) => r.requests), refetchInterval: LIVE });
export const useShares = (id: string) =>
  useQuery({ queryKey: ['shares', id], queryFn: () => api<{ shares: WorkerShare[] }>(`/profiles/${id}/shares`).then((r) => r.shares) });
export const useWorkerAudit = (id: string) =>
  useQuery({ queryKey: ['audit', id], queryFn: () => api<{ events: AuditEvent[] }>(`/audit/${id}`).then((r) => r.events), refetchInterval: LIVE });

/** Any change to evidence re-ranks roles server-side, so refresh every dependent view. */
function useInvalidateWorker(id: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [workerKeys.skills(id), workerKeys.recs(id), workerKeys.profile(id), ['gaps', id], ['matches', id], ['audit', id]].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
}

export type SkillAction = { skill_id: string; action: 'confirm' | 'edit' | 'reject'; proficiency?: number };

export function useReviewSkills(id: string) {
  const invalidate = useInvalidateWorker(id);
  return useMutation({
    mutationFn: (updates: SkillAction[]) => api<{ recommendations: Recommendations }>(`/profiles/${id}/skills`, { method: 'PATCH', body: { updates } }),
    onSuccess: invalidate,
  });
}

export function useExtractResume() {
  return useMutation({
    mutationFn: (input: { file?: File; text?: string }) =>
      input.file
        ? apiUpload<NcrExtraction>('/ncr/resume/extract', input.file, 'application/octet-stream')
        : apiUpload<NcrExtraction>('/ncr/resume/extract', input.text ?? '', 'text/plain'),
  });
}

export type ImportSkill = { skill_id: string; level: number; mention_type: string; evidence?: string | null };

export function useImportSkills(id: string) {
  const invalidate = useInvalidateWorker(id);
  return useMutation({
    mutationFn: ({ skills, currentRoleId }: { skills: ImportSkill[]; currentRoleId?: string | null }) =>
      api<{ imported: string[]; recommendations: Recommendations }>(`/profiles/${id}/skills/import`, {
        method: 'POST',
        body: { skills, current_role_id: currentRoleId ?? undefined },
      }),
    onSuccess: invalidate,
  });
}

export function useUpdatePreferences(id: string) {
  const invalidate = useInvalidateWorker(id);
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api<{ recommendations: Recommendations }>(`/profiles/${id}/preferences`, { method: 'PATCH', body }),
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
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['mentorships', id] }), qc.invalidateQueries({ queryKey: ['matches', id] })]),
  });
}

export function useRevokeMentorship(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api(`/mentorships/${requestId}/revoke`, { method: 'POST', body: {} }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['mentorships', id] }), qc.invalidateQueries({ queryKey: ['matches', id] })]),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares', id] }),
  });
}

export function useRevokeShare(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => api(`/shares/${grantId}/revoke`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares', id] }),
  });
}

// --------------------------------------------------------------- mentor
export const useMentorRequests = () =>
  useQuery({ queryKey: ['mentor-requests'], queryFn: () => api<{ requests: MentorRequestSummary[] }>('/mentor/requests').then((r) => r.requests), refetchInterval: LIVE });
export const useMentorRequest = (id: string) =>
  useQuery({ queryKey: ['mentor-request', id], queryFn: () => api<MentorRequestDetail>(`/mentor/requests/${id}`), refetchInterval: LIVE });

export function useRespond(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decision: 'accept' | 'decline') => api(`/mentor/requests/${id}/respond`, { method: 'POST', body: { decision } }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['mentor-request', id] }), qc.invalidateQueries({ queryKey: ['mentor-requests'] })]),
  });
}

export function useAddNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: 'progress' | 'feedback'; body: string; action_items: string[] }) =>
      api(`/mentor/requests/${id}/notes`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-request', id] }),
  });
}

// ------------------------------------------------------------ recruiter
export const useCandidates = () =>
  useQuery({
    queryKey: ['candidates'],
    queryFn: () => api<{ organization: { id: string; name: string }; eligibility_rule: string; candidates: RecruiterCandidate[] }>('/recruiter/candidates'),
    refetchInterval: LIVE,
  });
export const useCandidate = (grantId: string) =>
  useQuery({ queryKey: ['candidate', grantId], queryFn: () => api<RecruiterCandidateDetail>(`/recruiter/candidates/${grantId}`), retry: false });
export const useOpenings = () =>
  useQuery({ queryKey: ['openings'], queryFn: () => api<{ organization: { id: string; name: string }; openings: RecruiterOpening[] }>('/recruiter/openings') });
export const useRoles = (catalogue?: 'demo' | 'ncr') =>
  useQuery({
    queryKey: ['roles', catalogue],
    queryFn: () => api<{ roles: { id: string; title: string; family: string; catalogue: string }[] }>(`/roles${catalogue ? `?catalogue=${catalogue}` : ''}`).then((r) => r.roles),
    staleTime: 300_000,
  });

export function usePostOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { role_id: string; title: string; location: string; work_mode: string; salary_band_text?: string }) =>
      api('/recruiter/openings', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['openings'] }),
  });
}

export function useCloseOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/recruiter/openings/${id}/close`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['openings'] }),
  });
}

// ---------------------------------------------------------------- admin
export const useAdminOverview = () => useQuery({ queryKey: ['admin-overview'], queryFn: () => api<AdminOverview>('/admin/overview'), refetchInterval: 15_000 });
export const useAdminAudit = (outcome?: string) =>
  useQuery({
    queryKey: ['admin-audit', outcome],
    queryFn: () => api<{ events: AuditEvent[] }>(`/admin/audit?limit=150${outcome ? `&outcome=${outcome}` : ''}`).then((r) => r.events),
    refetchInterval: 15_000,
  });
export const useAccounts = (status: 'pending' | 'active' | 'rejected' | 'all') =>
  useQuery({ queryKey: ['accounts', status], queryFn: () => api<{ accounts: PendingAccount[] }>(`/admin/accounts?status=${status}`).then((r) => r.accounts) });

export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, decision }: { userId: string; decision: 'approve' | 'reject' }) =>
      api(`/admin/accounts/${userId}/decision`, { method: 'POST', body: { decision } }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['accounts'] }), qc.invalidateQueries({ queryKey: ['admin-overview'] })]),
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/admin/demo/reset', { method: 'POST', body: { confirm: 'RESET' } }),
    onSuccess: () => qc.invalidateQueries(),
  });
}
