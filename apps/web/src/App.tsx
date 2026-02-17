import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AdminGuard } from './components/AdminGuard';
import { AuthGuard } from './components/AuthGuard';
import { AuthenticatedLayout } from './components/AuthenticatedLayout';
import { PlayerGuard } from './components/PlayerGuard';
import { SupabaseProvider } from './context/SupabaseContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLayoutPage } from './pages/AdminLayoutPage';
import { AdminLevelRequirementEditPage } from './pages/AdminLevelRequirementEditPage';
import { AdminLevelRequirementNewPage } from './pages/AdminLevelRequirementNewPage';
import { AdminLevelRequirementsPage } from './pages/AdminLevelRequirementsPage';
import { AdminPlayerDetailPage } from './pages/AdminPlayerDetailPage';
import { AdminPlayersPage } from './pages/AdminPlayersPage';
import { AdminRoutineEditPage } from './pages/AdminRoutineEditPage';
import { AdminRoutineNewPage } from './pages/AdminRoutineNewPage';
import { AdminRoutinesPage } from './pages/AdminRoutinesPage';
import { AdminCohortCalendarPage } from './pages/AdminCohortCalendarPage';
import { AdminCohortEditPage } from './pages/AdminCohortEditPage';
import { AdminCompetitionDetailPage } from './pages/AdminCompetitionDetailPage';
import { AdminCompetitionEditPage } from './pages/AdminCompetitionEditPage';
import { AdminCompetitionNewPage } from './pages/AdminCompetitionNewPage';
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
import { PlayLandingPage } from './pages/PlayLandingPage';
import { PlaySessionPage } from './pages/PlaySessionPage';
import { RecordMatchPage } from './pages/RecordMatchPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

export default function App() {
  return (
    <SupabaseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            element={
              <AuthGuard>
                <AuthenticatedLayout />
              </AuthGuard>
            }
          >
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route element={<PlayerGuard><Outlet /></PlayerGuard>}>
              <Route path="home" element={<HomePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/edit" element={<ProfileEditPage />} />
              <Route path="play" element={<PlayLandingPage />} />
              <Route path="play/record-match" element={<RecordMatchPage />} />
              <Route path="play/session/:calendarId" element={<PlaySessionPage />} />
              <Route path="analyzer" element={<AnalyzerPage />} />
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
            <Route index element={<AdminDashboardPage />} />
            <Route path="players" element={<AdminPlayersPage />} />
            <Route path="players/:id" element={<AdminPlayerDetailPage />} />
            <Route path="schedules" element={<AdminSchedulesPage />} />
            <Route path="schedules/new" element={<AdminScheduleNewPage />} />
            <Route path="schedules/:id" element={<AdminScheduleEditPage />} />
            <Route path="cohorts" element={<AdminCohortsPage />} />
            <Route path="cohorts/new" element={<AdminCohortNewPage />} />
            <Route path="cohorts/:id" element={<AdminCohortEditPage />} />
            <Route path="cohorts/:id/calendar" element={<AdminCohortCalendarPage />} />
            <Route path="sessions" element={<AdminSessionsPage />} />
            <Route path="sessions/new" element={<AdminSessionNewPage />} />
            <Route path="sessions/:id" element={<AdminSessionEditPage />} />
            <Route path="routines" element={<AdminRoutinesPage />} />
            <Route path="routines/new" element={<AdminRoutineNewPage />} />
            <Route path="routines/:id" element={<AdminRoutineEditPage />} />
            <Route path="level-requirements" element={<AdminLevelRequirementsPage />} />
            <Route path="level-requirements/new" element={<AdminLevelRequirementNewPage />} />
            <Route path="level-requirements/:id" element={<AdminLevelRequirementEditPage />} />
            <Route path="competitions" element={<AdminCompetitionsPage />} />
            <Route path="competitions/new" element={<AdminCompetitionNewPage />} />
            <Route path="competitions/:id" element={<AdminCompetitionDetailPage />} />
            <Route path="competitions/:id/edit" element={<AdminCompetitionEditPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SupabaseProvider>
  );
}
