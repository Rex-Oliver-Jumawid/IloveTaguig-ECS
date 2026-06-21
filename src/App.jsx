import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards'
import AuthPage from './pages/AuthPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import RoleHomePage from './pages/RoleHomePage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import NewApplicationPage from './pages/NewApplicationPage'
import ApplicationStatusPage from './pages/ApplicationStatusPage'

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
          <Route path="/owner" element={<OwnerDashboardPage />} />
          <Route path="/owner/applications/new" element={<NewApplicationPage />} />
          <Route path="/owner/applications/:applicationId" element={<ApplicationStatusPage />} />
        </Route>
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<RoleHomePage role="admin" />} />
        </Route>
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </AuthProvider>
  )
}
