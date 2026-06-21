import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import FormMessage from '../components/FormMessage'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!email.trim()) return setError('Enter the email address for your account.')
    if (!supabase) return setError('Supabase is not configured in this environment.')
    setPending(true)
    setError('')
    const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setPending(false)
    if (result.error) setError(result.error.message)
    else setSent(true)
  }

  return <AuthShell title="Recover Your Account" description="Request a secure link to choose a new password."><div className="form-heading"><h2>Reset Password</h2><p>Enter the email address connected to your account.</p></div><FormMessage>{error}</FormMessage><FormMessage type="success">{sent ? 'If an account matches that email, a password-reset link has been sent.' : ''}</FormMessage><form onSubmit={submit} noValidate><div className="field-group"><label htmlFor="recovery-email">Email Address</label><input id="recovery-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" spellCheck={false} placeholder="name@example.com…" /></div><button className="primary-button" type="submit" disabled={pending}>{pending ? 'Sending Link…' : 'Send Reset Link'}</button></form><p className="center-link"><Link to="/auth">Return to Sign In</Link></p></AuthShell>
}
