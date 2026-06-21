import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth, rolePath } from '../auth/useAuth'

export default function AuthCallbackPage() {
  const { user, profile, loading, profileError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user && profile) navigate(rolePath(profile.role), { replace: true })
  }, [loading, user, profile, navigate])

  if (profileError) return <LoadingScreen message={profileError} error />
  if (!loading && !user) return <LoadingScreen message="The authentication link is invalid or expired. Request a new link and try again." error />
  return <LoadingScreen message="Completing secure sign-in…" />
}
