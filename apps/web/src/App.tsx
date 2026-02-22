import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AdminGuard } from './components/AdminGuard';
import { AuthGuard } from './components/AuthGuard';
import { AuthenticatedLayout } from './components/AuthenticatedLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerGuard } from './components/PlayerGuard';
import { SupabaseProvider } from './context/SupabaseContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLayoutPage } from './pages/AdminLayoutPage';
import { AdminLevelAverageEditPage } from './pages/AdminLevelAverageEditPage';
import { AdminLevelAverageNewPage } from './pages/AdminLevelAverageNewPage';
import { AdminLevelAveragesPage } from './pages/AdminLevelAveragesPage';
import { AdminLevelRequirementEditPage } from './pages/AdminLevelRequirementEditPage';
import { AdminLevelRequirementNewPage } from './pages/AdminLevelRequirementNewPage';
import { AdminLevelRequirementsPage } from './pages/AdminLevelRequirementsPage';
import { AdminPlayerDetailPage } from './pages/AdminPlayerDetailPage';
import { AdminPlayerSessionRunDetailPage } from './pages/AdminPlayerSessionRunDetailPage';
import { AdminPlayerSessionsPage } from './pages/AdminPlayerSessionsPage';
import { AdminPlayersPage } from './pages/AdminPlayersPage';
import { AdminRoutineEditPage } from './pages/AdminRoutineEditPage';
import { AdminRoutineNewPage } from './pages/AdminRoutineNewPage';
import { AdminRoutinesPage } from './pages/AdminRoutinesPage';
import { AdminCohortCalendarPage } from './pages/AdminCohortCalendarPage';
import { AdminCohortEditPage } from './pages/AdminCohortEditPage';
import { AdminCohortPlayersPage } from './pages/AdminCohortPlayersPage';
import { AdminCohortReportPage } from './pages/AdminCohortReportPage';
import { AdminCompetitionDetailPage } from './pages/AdminCompetitionDetailPage';
import { AdminCompetitionReportPage } from './pages/AdminCompetitionReportPage';
import { AdminCompetitionEditPage } from './pages/AdminCompetitionEditPage';
import { AdminCompetitionNewPage } from './pages/AdminCompetitionNewPage';
import { AdminCheckoutCombinationsPage } from './pages/AdminCheckoutCombinationsPage';
import { AdminCompetitionsPage } from './pages/AdminCompetitionsPage';
import { AdminCohortNewPage } from './pages/AdminCohortNewPage';
import { AdminCohortsPage } from './pages/AdminCohortsPage';
import { AdminScheduleEditPage } from './pages/AdminScheduleEditPage';
import { AdminScheduleNewPage } from './pages/AdminScheduleNewPage';
import { AdminSchedulesPage } from './pages/AdminSchedulesPage';
import { AdminSessionEditPage } from './pages/AdminSessionEditPage';
import { AdminSessionNewPage } from './pages/AdminSessionNewPage';
import { AdminSessionsPage } from './pages/AdminSessionsPage';
import { AnalyzerPage } from './pages/AnalyzerPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PlayITAPage } from './pages/PlayITAPage';
import { PlayLandingPage } from './pages/PlayLandingPage';
import { PlaySessionLayout } from './pages/PlaySessionLayout';
import { PlaySessionPage } from './pages/PlaySessionPage';
import { RecordMatchPage } from './pages/RecordMatchPage';
import { RoutineStepPage } from './pages/RoutineStepPage';
import { ProfileCheckoutVariationsPage } from './pages/ProfileCheckoutVariationsPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

function PageWithLog({ name, children }: { name: string; children: ReactNode }) {
  useEffect(() => {
    console.log('[OPP] Page:', name);
  }, [name]);
  return <>{children}</>;
}

export default function App() {
  return (
    <SupabaseProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <div style={{ display: 'contents' }}>
            <Routes>
          <Route path="/" element={<PageWithLog name="LandingPage"><LandingPage /></PageWithLog>} />
          <Route path="/sign-in" element={<PageWithLog name="SignInPage"><SignInPage /></PageWithLog>} />
          <Route path="/sign-up" element={<PageWithLog name="SignUpPage"><SignUpPage /></PageWithLog>} />
          <Route path="/forgot-password" element={<PageWithLog name="ForgotPasswordPage"><ForgotPasswordPage /></PageWithLog>} />
          <Route path="/reset-password" element={<PageWithLog name="ResetPasswordPage"><ResetPasswordPage /></PageWithLog>} />

          <Route
            element={
              <AuthGuard>
                <AuthenticatedLayout />
              </AuthGuard>
            }
          >
            <Route path="onboarding" element={<PageWithLog name="OnboardingPage"><OnboardingPage /></PageWithLog>} />
            <Route element={<PlayerGuard><Outlet /></PlayerGuard>}>
              <Route path="home" element={<PageWithLog name="HomePage"><HomePage /></PageWithLog>} />
              <Route path="profile" element={<PageWithLog name="ProfilePage"><ProfilePage /></PageWithLog>} />
              <Route path="profile/edit" element={<PageWithLog name="ProfileEditPage"><ProfileEditPage /></PageWithLog>} />
              <Route path="profile/checkout-variations" element={<PageWithLog name="ProfileCheckoutVariationsPage"><ProfileCheckoutVariationsPage /></PageWithLog>} />
              <Route path="play" element={<PageWithLog name="PlayLandingPage"><PlayLandingPage /></PageWithLog>} />
              <Route path="play/ita" element={<PageWithLog name="PlayITAPage"><PlayITAPage /></PageWithLog>} />
              <Route path="play/record-match" element={<PageWithLog name="RecordMatchPage"><RecordMatchPage /></PageWithLog>} />
              <Route path="play/session/:calendarId" element={<PlaySessionLayout />}>
                <Route index element={<PageWithLog name="PlaySessionPage"><PlaySessionPage /></PageWithLog>} />
                <Route path="step" element={<PageWithLog name="RoutineStepPage"><RoutineStepPage /></PageWithLog>} />
              </Route>
              <Route path="analyzer" element={<PageWithLog name="AnalyzerPage"><AnalyzerPage /></PageWithLog>} />
              <Route path="settings" element={<PageWithLog name="SettingsPage"><SettingsPage /></PageWithLog>} />
            </Route>
          </Route>

          <Route
            path="/admin"
            element={
              <AuthGuard>
                <PlayerGuard>
                  <AdminGuard>
                    <AdminLayoutPage />
                  </AdminGuard>
                </PlayerGuard>
              </AuthGuard>
            }
          >
            <Route index element={<PageWithLog name="AdminDashboardPage"><AdminDashboardPage /></PageWithLog>} />
            <Route path="players" element={<PageWithLog name="AdminPlayersPage"><AdminPlayersPage /></PageWithLog>} />
            <Route path="players/:id" element={<PageWithLog name="AdminPlayerDetailPage"><AdminPlayerDetailPage /></PageWithLog>} />
            <Route path="players/:id/sessions" element={<PageWithLog name="AdminPlayerSessionsPage"><AdminPlayerSessionsPage /></PageWithLog>} />
            <Route path="players/:id/sessions/:runId" element={<PageWithLog name="AdminPlayerSessionRunDetailPage"><AdminPlayerSessionRunDetailPage /></PageWithLog>} />
            <Route path="schedules" element={<PageWithLog name="AdminSchedulesPage"><AdminSchedulesPage /></PageWithLog>} />
            <Route path="schedules/new" element={<PageWithLog name="AdminScheduleNewPage"><AdminScheduleNewPage /></PageWithLog>} />
            <Route path="schedules/:id" element={<PageWithLog name="AdminScheduleEditPage"><AdminScheduleEditPage /></PageWithLog>} />
            <Route path="cohorts" element={<PageWithLog name="AdminCohortsPage"><AdminCohortsPage /></PageWithLog>} />
            <Route path="cohorts/new" element={<PageWithLog name="AdminCohortNewPage"><AdminCohortNewPage /></PageWithLog>} />
            <Route path="cohorts/:id" element={<PageWithLog name="AdminCohortEditPage"><AdminCohortEditPage /></PageWithLog>} />
            <Route path="cohorts/:id/calendar" element={<PageWithLog name="AdminCohortCalendarPage"><AdminCohortCalendarPage /></PageWithLog>} />
            <Route path="cohorts/:id/players" element={<PageWithLog name="AdminCohortPlayersPage"><AdminCohortPlayersPage /></PageWithLog>} />
            <Route path="cohorts/:id/report" element={<PageWithLog name="AdminCohortReportPage"><AdminCohortReportPage /></PageWithLog>} />
            <Route path="sessions" element={<PageWithLog name="AdminSessionsPage"><AdminSessionsPage /></PageWithLog>} />
            <Route path="sessions/new" element={<PageWithLog name="AdminSessionNewPage"><AdminSessionNewPage /></PageWithLog>} />
            <Route path="sessions/:id" element={<PageWithLog name="AdminSessionEditPage"><AdminSessionEditPage /></PageWithLog>} />
            <Route path="routines" element={<PageWithLog name="AdminRoutinesPage"><AdminRoutinesPage /></PageWithLog>} />
            <Route path="routines/new" element={<PageWithLog name="AdminRoutineNewPage"><AdminRoutineNewPage /></PageWithLog>} />
            <Route path="routines/:id" element={<PageWithLog name="AdminRoutineEditPage"><AdminRoutineEditPage /></PageWithLog>} />
            <Route path="level-requirements" element={<PageWithLog name="AdminLevelRequirementsPage"><AdminLevelRequirementsPage /></PageWithLog>} />
            <Route path="level-requirements/new" element={<PageWithLog name="AdminLevelRequirementNewPage"><AdminLevelRequirementNewPage /></PageWithLog>} />
            <Route path="level-requirements/:id" element={<PageWithLog name="AdminLevelRequirementEditPage"><AdminLevelRequirementEditPage /></PageWithLog>} />
            <Route path="level-averages" element={<PageWithLog name="AdminLevelAveragesPage"><AdminLevelAveragesPage /></PageWithLog>} />
            <Route path="level-averages/new" element={<PageWithLog name="AdminLevelAverageNewPage"><AdminLevelAverageNewPage /></PageWithLog>} />
            <Route path="level-averages/:id" element={<PageWithLog name="AdminLevelAverageEditPage"><AdminLevelAverageEditPage /></PageWithLog>} />
            <Route path="competitions" element={<PageWithLog name="AdminCompetitionsPage"><AdminCompetitionsPage /></PageWithLog>} />
            <Route path="competitions/new" element={<PageWithLog name="AdminCompetitionNewPage"><AdminCompetitionNewPage /></PageWithLog>} />
            <Route path="competitions/:id" element={<PageWithLog name="AdminCompetitionDetailPage"><AdminCompetitionDetailPage /></PageWithLog>} />
            <Route path="competitions/:id/edit" element={<PageWithLog name="AdminCompetitionEditPage"><AdminCompetitionEditPage /></PageWithLog>} />
            <Route path="competitions/:id/report" element={<PageWithLog name="AdminCompetitionReportPage"><AdminCompetitionReportPage /></PageWithLog>} />
            <Route path="checkout-combinations" element={<PageWithLog name="AdminCheckoutCombinationsPage"><AdminCheckoutCombinationsPage /></PageWithLog>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </BrowserRouter>
    </SupabaseProvider>
  );
}
