import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import FormMessage from '../components/FormMessage'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth, rolePath } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const { user, profile, loading, isRecovery } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (loading) return <LoadingScreen message="Validating your recovery link…" />
  if (!user) return <Navigate to="/forgot-password" replace />

  async function submit(event) {
    event.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters for your new password.')
    if (password !== confirm) return setError('The new passwords must match.')
    setPending(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (updateError) setError(updateError.message)
    else navigate(rolePath(profile?.role), { replace: true })
  }

  return <AuthShell title="Choose a New Password" description="Use a strong password that you do not reuse elsewhere."><div className="form-heading"><h2>Set New Password</h2><p>{isRecovery ? 'Your recovery link is verified.' : 'Update the password for your signed-in account.'}</p></div><FormMessage>{error}</FormMessage><form id="auth-form" onSubmit={submit}><div className="field-group"><label htmlFor="new-password">New Password</label><input id="new-password" name="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></div><div className="field-group"><label htmlFor="confirm-new-password">Confirm New Password</label><input id="confirm-new-password" name="confirm-new-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></div><button className="primary-button" type="submit" disabled={pending}>{pending ? 'Updating Password…' : 'Update Password'}</button></form></AuthShell>
}
