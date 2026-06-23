import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
    setFields(initialFields)
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
    if (mode === 'register' && !fields.fullName.trim()) next.fullName = 'Please enter your full name.'
    if (!fields.email.trim()) next.email = 'Please enter a valid email address.'
    if (!fields.password) next.password = 'Please enter your password.'
    else if (mode === 'register' && fields.password.length < 8) next.password = 'Password must be at least 8 characters long.'
    if (mode === 'register' && fields.confirmPassword !== fields.password) next.confirmPassword = 'Passwords do not match.'
    if (mode === 'register' && !fields.terms) next.terms = 'You must agree to the terms to continue.'
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
    <AuthShell>
      {/* Tab Bar */}
      <nav class="form-tabs" aria-label="Form switching tabs">
        <button
          type="button"
          class={`tab-btn ${!register ? 'active' : ''}`}
          id="login-tab"
          aria-selected={!register}
          onClick={() => switchMode('login')}
        >
          Log In
        </button>
        <button
          type="button"
          class={`tab-btn ${register ? 'active' : ''}`}
          id="register-tab"
          aria-selected={register}
          onClick={() => switchMode('register')}
        >
          Register
        </button>
      </nav>

      {/* Form Headers */}
      <header class="form-header">
        <h2 id="form-heading" class="form-heading">
          {register ? (
            <>Create <span class="highlight-orange">account.</span></>
          ) : (
            <>Welcome <span class="highlight-orange">back.</span></>
          )}
        </h2>
        <p id="form-subheading" class="form-subheading">
          {register ? 'Register to start your business clearance application.' : 'Sign in to access your dashboard.'}
        </p>
      </header>

      {!isSupabaseConfigured && <FormMessage>Supabase is not configured in this environment.</FormMessage>}
      <FormMessage>{message}</FormMessage>
      <FormMessage type="success">{success}</FormMessage>

      <form onSubmit={handleSubmit} noValidate id="auth-form">
        {register && (
          <Field
            label="Full Name"
            name="fullName"
            value={fields.fullName}
            onChange={updateField}
            error={errors.fullName}
            autoComplete="name"
            placeholder="Juan Dela Cruz"
            inputRef={errors.fullName ? firstErrorRef : null}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
          />
        )}

        <Field
          label="Email Address"
          name="email"
          type="email"
          value={fields.email}
          onChange={updateField}
          error={errors.email}
          autoComplete="email"
          placeholder="juan.delacruz@example.com"
          inputRef={!errors.fullName && errors.email ? firstErrorRef : null}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          }
        />

        {/* Password input group */}
        <div class={`input-group ${errors.password ? 'has-error' : ''}`}>
          <label htmlFor="password" class="input-label">Password</label>
          <div class="input-wrapper">
            <span class="input-icon-slot">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </span>
            <input
              ref={!errors.fullName && !errors.email && errors.password ? firstErrorRef : null}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={fields.password}
              onChange={updateField}
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={register ? 'Create a password' : 'Enter your password'}
              class="form-input"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              class="password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.391 4.178 5.328 7.178 9.963 7.178 1.488 0 2.9-.304 4.18-.849m4.847-3.655a10.463 10.463 0 002.146-2.674c-1.391-4.178-5.328-7.178-9.963-7.178-.507 0-.996.04-1.472.117M3.75 3.75l16.5 16.5M12 9a3 3 0 00-3 3" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <span class="error-msg" id="password-error" style={{ display: 'block' }}>{errors.password}</span>}
        </div>

        {register && (
          <Field
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={fields.confirmPassword}
            onChange={updateField}
            error={errors.confirmPassword}
            autoComplete="new-password"
            placeholder="Repeat your password"
            inputRef={!errors.fullName && !errors.email && !errors.password && errors.confirmPassword ? firstErrorRef : null}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />
        )}

        {/* Form Options Checkbox & Links Row */}
        <div class="form-options-row">
          {register ? (
            <label class="checkbox-label" id="terms-container">
              <input
                ref={errors.terms ? firstErrorRef : null}
                type="checkbox"
                name="terms"
                checked={fields.terms}
                onChange={updateField}
                aria-invalid={Boolean(errors.terms)}
              />
              <span class="custom-checkbox"></span>
              <span class="label-text">
                I agree to the <a href="#" class="teal-link">Terms of Service</a> & <a href="#" class="teal-link">Privacy Policy</a>
              </span>
            </label>
          ) : (
            <Link to="/forgot-password" class="orange-link" style={{ marginLeft: 'auto' }}>Forgot password?</Link>
          )}
        </div>
        {register && errors.terms && (
          <span class="error-msg" style={{ display: 'block' }}>{errors.terms}</span>
        )}

        {/* Submit button */}
        <button class="submit-btn" type="submit" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner"></span> Please Wait…
            </>
          ) : register ? (
            'CREATE ACCOUNT'
          ) : (
            'LOG IN'
          )}
        </button>
      </form>

      {message.toLowerCase().includes('confirm') && (
        <button class="secondary-button" type="button" disabled={pending} onClick={resendConfirmation}>
          Resend Confirmation Email
        </button>
      )}

      {/* Alternative Social Logins */}
      <div class="alternative-login">
        <div class="divider-row">
          <span class="divider-line"></span>
          <span class="divider-text">or continue with</span>
          <span class="divider-line"></span>
        </div>
        
        <button type="button" class="google-btn" disabled={pending} onClick={continueWithGoogle}>
          <svg class="google-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </AuthShell>
  )
}

function Field({ label, name, type = 'text', value, onChange, error, autoComplete, placeholder, inputRef, icon }) {
  return (
    <div class={`input-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={name} class="input-label">{label}</label>
      <div class="input-wrapper">
        {icon && <span class="input-icon-slot">{icon}</span>}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          spellCheck={type === 'email' ? false : undefined}
          class="form-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      </div>
      {error && <span class="error-msg" id={`${name}-error`} style={{ display: 'block' }}>{error}</span>}
    </div>
  )
}

