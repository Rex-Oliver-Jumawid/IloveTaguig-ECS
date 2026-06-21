import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, rolePath } from './useAuth'
import LoadingScreen from '../components/LoadingScreen'

export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen message="Restoring your session…" />
  if (user && profile) return <Navigate to={rolePath(profile.role)} replace />
  return <Outlet />
}

export function ProtectedRoute({ role }) {
  const { user, profile, loading, profileError } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen message="Checking secure access…" />
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  if (profileError || !profile) return <LoadingScreen message={profileError || 'Your profile is unavailable.'} error />
  if (profile.role !== role) return <Navigate to={rolePath(profile.role)} replace />
  return <Outlet />
}
