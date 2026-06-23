import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards'
import AuthPage from './pages/AuthPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminApplicationReviewPage from './pages/AdminApplicationReviewPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import NewApplicationPage from './pages/NewApplicationPage'
import ApplicationStatusPage from './pages/ApplicationStatusPage'
import AdminGeneratedClearancePage from './pages/AdminGeneratedClearancePage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute role="owner" />}>
          <Route path="/owner" element={<OwnerDashboardPage initialTab="dashboard" />} />
          <Route path="/owner/applications" element={<OwnerDashboardPage initialTab="applications" />} />
          <Route path="/owner/applications/new" element={<NewApplicationPage />} />
          <Route path="/owner/applications/:applicationId" element={<ApplicationStatusPage />} />
          <Route path="/owner/history" element={<OwnerDashboardPage initialTab="history" />} />
          <Route path="/owner/notifications" element={<OwnerDashboardPage initialTab="notifications" />} />
          <Route path="/owner/settings" element={<OwnerDashboardPage initialTab="settings" />} />
        </Route>
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboardPage initialTab="dashboard" />} />
          <Route path="/admin/notifications" element={<AdminDashboardPage initialTab="notifications" />} />
          <Route path="/admin/settings" element={<AdminDashboardPage initialTab="settings" />} />
          <Route path="/admin/applications/:applicationId" element={<AdminApplicationReviewPage />} />
          <Route path="/admin/clearances/:applicationId" element={<AdminGeneratedClearancePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </AuthProvider>
  )
}
