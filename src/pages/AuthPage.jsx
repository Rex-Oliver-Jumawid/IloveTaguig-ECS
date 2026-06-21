import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import FormMessage from '../components/FormMessage'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const initialFields = { fullName: '', email: '', password: '', confirmPassword: '', terms: false }

function friendlyAuthError(error) {
  const message = error?.message?.toLowerCase() ?? ''
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in. You can resend the confirmation below.'
  if (message.includes('invalid login')) return 'The email or password is incorrect. Check both fields and try again.'
  if (message.includes('already registered')) return 'An account already uses this email. Sign in or reset its password.'
  return error?.message || 'Authentication failed. Check your connection and try again.'
}

export default function AuthPage() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'register' ? 'register' : 'login'
  const [fields, setFields] = useState(initialFields)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const firstErrorRef = useRef(null)

  function switchMode(nextMode) {
    setParams(nextMode === 'register' ? { mode: 'register' } : {})
    setErrors({})
    setMessage('')
    setSuccess('')
  }

  function updateField(event) {
    const { name, value, checked, type } = event.target
    setFields((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  function validate() {
    const next = {}
    if (mode === 'register' && !fields.fullName.trim()) next.fullName = 'Enter your full legal name.'
    if (!fields.email.trim()) next.email = 'Enter your email address.'
    if (!fields.password) next.password = 'Enter your password.'
    else if (mode === 'register' && fields.password.length < 8) next.password = 'Use at least 8 characters.'
    if (mode === 'register' && fields.confirmPassword !== fields.password) next.confirmPassword = 'Passwords must match.'
    if (mode === 'register' && !fields.terms) next.terms = 'Accept the terms and privacy policy to register.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setSuccess('')
    if (!validate()) {
      window.setTimeout(() => firstErrorRef.current?.focus(), 0)
      return
    }
    if (!supabase) {
      setMessage('Supabase is not configured. Add the required values to .env.local and restart the app.')
      return
    }

    setPending(true)
    const result = mode === 'register'
      ? await supabase.auth.signUp({
          email: fields.email.trim(),
          password: fields.password,
          options: { data: { full_name: fields.fullName.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
      : await supabase.auth.signInWithPassword({ email: fields.email.trim(), password: fields.password })
    setPending(false)

    if (result.error) setMessage(friendlyAuthError(result.error))
    else if (mode === 'register') setSuccess('Check your inbox and confirm your email before signing in.')
  }

  async function resendConfirmation() {
    if (!fields.email.trim()) {
      setErrors({ email: 'Enter the email address that needs confirmation.' })
      return
    }
    setPending(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: fields.email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    setPending(false)
    if (error) setMessage(friendlyAuthError(error))
    else setSuccess('A new confirmation email has been sent. Check your inbox and spam folder.')
  }

  async function continueWithGoogle() {
    if (!supabase) return setMessage('Supabase is not configured. Add the required environment values first.')
    setPending(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) {
      setPending(false)
      setMessage(friendlyAuthError(error))
    }
  }

  const register = mode === 'register'
  return (
    <AuthShell title="Business Clearance, Without the Repeated Visits" description="Apply securely, track progress, and know exactly when to proceed to Barangay Hall.">
      <div className="mode-tabs" role="tablist" aria-label="Authentication mode">
        <button type="button" role="tab" aria-selected={!register} onClick={() => switchMode('login')}>Sign In</button>
        <button type="button" role="tab" aria-selected={register} onClick={() => switchMode('register')}>Create Account</button>
      </div>
      <div className="form-heading"><h2>{register ? 'Create Your Account' : 'Welcome Back'}</h2><p>{register ? 'Register as a business owner.' : 'Sign in to continue your application.'}</p></div>
      {!isSupabaseConfigured && <FormMessage>Supabase is not configured in this environment.</FormMessage>}
      <FormMessage>{message}</FormMessage>
      <FormMessage type="success">{success}</FormMessage>
      <form onSubmit={handleSubmit} noValidate>
        {register && <Field label="Full Name" name="fullName" value={fields.fullName} onChange={updateField} error={errors.fullName} autoComplete="name" placeholder="Juan Dela Cruz…" inputRef={errors.fullName ? firstErrorRef : null} />}
        <Field label="Email Address" name="email" type="email" value={fields.email} onChange={updateField} error={errors.email} autoComplete="email" placeholder="name@example.com…" inputRef={!errors.fullName && errors.email ? firstErrorRef : null} />
        <div className="field-group">
          <label htmlFor="password">Password</label>
          <div className="password-control">
            <input ref={!errors.fullName && !errors.email && errors.password ? firstErrorRef : null} id="password" name="password" type={showPassword ? 'text' : 'password'} value={fields.password} onChange={updateField} autoComplete={register ? 'new-password' : 'current-password'} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
            <button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
          </div>
          {errors.password && <p className="field-error" id="password-error">{errors.password}</p>}
        </div>
        {register && <Field label="Confirm Password" name="confirmPassword" type="password" value={fields.confirmPassword} onChange={updateField} error={errors.confirmPassword} autoComplete="new-password" inputRef={!errors.fullName && !errors.email && !errors.password && errors.confirmPassword ? firstErrorRef : null} />}
        {register ? <div className="field-group"><label className="checkbox-row"><input ref={errors.terms ? firstErrorRef : null} type="checkbox" name="terms" checked={fields.terms} onChange={updateField} aria-invalid={Boolean(errors.terms)} /><span>I agree to the Terms of Service and Privacy Policy.</span></label>{errors.terms && <p className="field-error">{errors.terms}</p>}</div> : <div className="form-options"><label className="checkbox-row"><input type="checkbox" name="remember" /><span>Remember me</span></label><Link to="/forgot-password">Forgot Password?</Link></div>}
        <button className="primary-button" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="spinner" size={18} aria-hidden="true" /> Please Wait…</> : register ? 'Create Account' : 'Sign In'}</button>
      </form>
      {message.toLowerCase().includes('confirm') && <button className="secondary-button" type="button" disabled={pending} onClick={resendConfirmation}>Resend Confirmation Email</button>}
      <div className="divider"><span>or</span></div>
      <button className="google-button" type="button" disabled={pending} onClick={continueWithGoogle}><span aria-hidden="true">G</span> Continue with Google</button>
    </AuthShell>
  )
}

function Field({ label, name, type = 'text', value, onChange, error, autoComplete, placeholder, inputRef }) {
  return <div className="field-group"><label htmlFor={name}>{label}</label><input ref={inputRef} id={name} name={name} type={type} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} spellCheck={type === 'email' ? false : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />{error && <p className="field-error" id={`${name}-error`}>{error}</p>}</div>
}
