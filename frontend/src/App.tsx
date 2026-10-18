import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAccount, RequireRole, RequireSession, RoleRedirect } from './auth/guards';
import AuthCallback from './pages/AuthCallback';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import Pending from './pages/Pending';
import { AppShell } from './ui/AppShell';
import { FullPageLoader, Spinner } from './ui/kit';

// Dashboards load on demand so the landing page stays light.
const SeekerOverview = lazy(() => import('./pages/seeker/Overview'));
const SeekerResume = lazy(() => import('./pages/seeker/Resume'));
const SeekerSkills = lazy(() => import('./pages/seeker/Skills'));
const SeekerRoles = lazy(() => import('./pages/seeker/Roles'));
const SeekerRoleDetail = lazy(() => import('./pages/seeker/RoleDetail'));
const SeekerProve = lazy(() => import('./pages/seeker/Prove'));
const SeekerMentors = lazy(() => import('./pages/seeker/Mentors'));
const SeekerSharing = lazy(() => import('./pages/seeker/Sharing'));
const SeekerActivity = lazy(() => import('./pages/seeker/Activity'));
const SeekerSettings = lazy(() => import('./pages/seeker/Settings'));
const MentorInbox = lazy(() => import('./pages/mentor/Inbox'));
const MentorRequest = lazy(() => import('./pages/mentor/RequestDetail'));
const RecruiterCandidates = lazy(() => import('./pages/recruiter/Candidates'));
const RecruiterCandidate = lazy(() => import('./pages/recruiter/CandidateDetail'));
const RecruiterOpenings = lazy(() => import('./pages/recruiter/Openings'));
const AdminSystem = lazy(() => import('./pages/admin/System'));
const AdminApprovals = lazy(() => import('./pages/admin/Approvals'));
const AdminAudit = lazy(() => import('./pages/admin/Audit'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 5_000 } },
});

function Shell() {
  return (
    <AppShell>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<RequireRole role="worker" />}>
            <Route path="seeker" element={<SeekerOverview />} />
            <Route path="seeker/resume" element={<SeekerResume />} />
            <Route path="seeker/skills" element={<SeekerSkills />} />
            <Route path="seeker/roles" element={<SeekerRoles />} />
            <Route path="seeker/roles/:roleId" element={<SeekerRoleDetail />} />
            <Route path="seeker/prove" element={<SeekerProve />} />
            <Route path="seeker/mentors" element={<SeekerMentors />} />
            <Route path="seeker/sharing" element={<SeekerSharing />} />
            <Route path="seeker/activity" element={<SeekerActivity />} />
            <Route path="seeker/settings" element={<SeekerSettings />} />
          </Route>
          <Route element={<RequireRole role="mentor" />}>
            <Route path="mentor" element={<MentorInbox />} />
            <Route path="mentor/requests/:id" element={<MentorRequest />} />
          </Route>
          <Route element={<RequireRole role="recruiter" />}>
            <Route path="recruiter" element={<RecruiterCandidates />} />
            <Route path="recruiter/candidates/:grantId" element={<RecruiterCandidate />} />
            <Route path="recruiter/openings" element={<RecruiterOpenings />} />
          </Route>
          <Route element={<RequireRole role="admin" />}>
            <Route path="admin" element={<AdminSystem />} />
            <Route path="admin/approvals" element={<AdminApprovals />} />
            <Route path="admin/audit" element={<AdminAudit />} />
          </Route>
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route element={<RequireSession />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/pending" element={<Pending />} />
                <Route element={<RequireAccount />}>
                  <Route path="/app" element={<RoleRedirect />} />
                  <Route path="/app/*" element={<Shell />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
