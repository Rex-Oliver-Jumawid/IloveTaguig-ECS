import { useState, useEffect } from 'react'
import {
  User,
  Shield,
  Bell,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Mail,
  UserCheck,
  Calendar,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'

export default function SettingsView({ profile, user }) {
  const { loadProfile } = useAuth()
  
  // Profile state
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [initials, setInitials] = useState(profile?.initials || '')
  const [profilePending, setProfilePending] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordPending, setPasswordPending] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Preferences state
  const [emailAlerts, setEmailAlerts] = useState(() => {
    return localStorage.getItem('prefs_email_alerts') !== 'false'
  })
  const [inAppAlerts, setInAppAlerts] = useState(() => {
    return localStorage.getItem('prefs_inapp_alerts') !== 'false'
  })
  const [marketingAlerts, setMarketingAlerts] = useState(() => {
    return localStorage.getItem('prefs_marketing_alerts') === 'true'
  })
  const [prefSaved, setPrefSaved] = useState(false)

  // Sync state if profile loads/changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setInitials(profile.initials || '')
    }
  }, [profile])

  // Profile Save
  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfilePending(true)
    setProfileSuccess('')
    setProfileError('')

    if (!fullName.trim()) {
      setProfileError('Full Name is required.')
      setProfilePending(false)
      return
    }

    try {
      // Calculate initials if blank or update initials
      let computedInitials = initials.trim()
      if (!computedInitials) {
        computedInitials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        setInitials(computedInitials)
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          initials: computedInitials
        })
        .eq('id', user.id)

      if (error) throw error

      // Reload profile inside Auth context
      await loadProfile(user.id)
      setProfileSuccess('Profile changes saved successfully!')
    } catch (err) {
      setProfileError(err.message || 'Could not update profile details. Please try again.')
    } finally {
      setProfilePending(false)
    }
  }

  // Password Update
  async function handleUpdatePassword(e) {
    e.preventDefault()
    setPasswordPending(true)
    setPasswordSuccess('')
    setPasswordError('')

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      setPasswordPending(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      setPasswordPending(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordSuccess('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setPasswordPending(false)
    }
  }

  // Preferences Save
  function handleSavePreferences(e) {
    e.preventDefault()
    setPrefSaved(true)
    localStorage.setItem('prefs_email_alerts', String(emailAlerts))
    localStorage.setItem('prefs_inapp_alerts', String(inAppAlerts))
    localStorage.setItem('prefs_marketing_alerts', String(marketingAlerts))
    
    setTimeout(() => {
      setPrefSaved(false)
    }, 3000)
  }

  const joinDate = user?.created_at
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' }).format(new Date(user.created_at))
    : 'N/A'

  return (
    <div className="figma-status-container settings-container">
      {/* Header */}
      <div className="figma-status-header">
        <div className="header-left">
          <div className="title-row">
            <span className="title-indicator"></span>
            <h2>Account <span className="highlight-italic">Settings</span></h2>
          </div>
          <p className="subtitle">Manage your personal profile, notification channels, and account security.</p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="status-bento-grid">
        
        {/* Left Column - Forms */}
        <div className="bento-left-col">
          
          {/* Profile Form */}
          <div className="bento-card">
            <div className="card-header border-bottom">
              <div className="card-header-title">
                <span className="title-indicator"></span>
                <h4>PERSONAL PROFILE</h4>
              </div>
            </div>
            <div className="card-body">
              <form className="correction-form-figma" onSubmit={handleSaveProfile}>
                
                {profileSuccess && (
                  <div className="application-success" style={{ margin: '0 0 16px 0' }}>
                    <CheckCircle2 size={18} />
                    <span>{profileSuccess}</span>
                  </div>
                )}
                {profileError && (
                  <div className="submit-error-banner-figma" style={{ margin: '0 0 16px 0' }}>
                    <AlertCircle size={18} />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="details-grid-figma" style={{ gridTemplateColumns: '1fr' }}>
                  
                  {/* Email (Read only) */}
                  <div className="application-field">
                    <label htmlFor="settings-email">EMAIL ADDRESS</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="settings-email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        style={{ paddingLeft: '40px', backgroundColor: 'var(--slate-50)', color: 'var(--slate-500)', cursor: 'not-allowed' }}
                      />
                      <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--slate-400)' }} />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="application-field">
                    <label htmlFor="settings-fullname">FULL LEGAL NAME <span>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="settings-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        style={{ paddingLeft: '40px' }}
                      />
                      <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--teal-primary)' }} />
                    </div>
                  </div>

                  {/* Initials */}
                  <div className="application-field">
                    <label htmlFor="settings-initials">AVATAR INITIALS (Optional)</label>
                    <input
                      id="settings-initials"
                      type="text"
                      maxLength={3}
                      value={initials}
                      onChange={(e) => setInitials(e.target.value.toUpperCase())}
                      placeholder="e.g. TC"
                    />
                    <small style={{ fontSize: '0.68rem', color: 'var(--slate-400)', marginTop: '4px' }}>
                      Used for sidebar and dashboard avatar badge. Leave blank to generate from name.
                    </small>
                  </div>

                </div>

                <div className="resubmit-actions-figma" style={{ marginTop: '24px' }}>
                  <button type="submit" className="resubmit-submit-btn" disabled={profilePending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={16} />
                    <span>{profilePending ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* Security Form */}
          <div className="bento-card">
            <div className="card-header border-bottom">
              <div className="card-header-title">
                <span className="title-indicator"></span>
                <h4>ACCOUNT SECURITY</h4>
              </div>
            </div>
            <div className="card-body">
              <form className="correction-form-figma" onSubmit={handleUpdatePassword}>
                
                {passwordSuccess && (
                  <div className="application-success" style={{ margin: '0 0 16px 0' }}>
                    <CheckCircle2 size={18} />
                    <span>{passwordSuccess}</span>
                  </div>
                )}
                {passwordError && (
                  <div className="submit-error-banner-figma" style={{ margin: '0 0 16px 0' }}>
                    <AlertCircle size={18} />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="details-grid-figma" style={{ gridTemplateColumns: '1fr' }}>
                  
                  {/* New Password */}
                  <div className="application-field">
                    <label htmlFor="settings-new-password">NEW PASSWORD <span>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="settings-new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        style={{ paddingLeft: '40px', paddingRight: '40px' }}
                      />
                      <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--teal-primary)' }} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{ position: 'absolute', right: '14px', top: '14px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="application-field">
                    <label htmlFor="settings-confirm-password">CONFIRM NEW PASSWORD <span>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="settings-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        style={{ paddingLeft: '40px' }}
                      />
                      <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--teal-primary)' }} />
                    </div>
                  </div>

                </div>

                <div className="resubmit-actions-figma" style={{ marginTop: '24px' }}>
                  <button type="submit" className="resubmit-submit-btn" disabled={passwordPending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} />
                    <span>{passwordPending ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>

        </div>

        {/* Right Column - Sidebar Info & Preferences */}
        <div className="bento-right-col">
          
          {/* Avatar Summary Card */}
          <div className="bento-card help-card-figma" style={{ minHeight: 'auto' }}>
            <div className="decor-circle circle-small opacity-20"></div>
            <div className="card-body" style={{ alignItems: 'center', textAlign: 'center', padding: '32px 24px' }}>
              <div 
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--white)',
                  marginBottom: '16px'
                }}
              >
                {initials || 'TC'}
              </div>
              <h4 style={{ marginTop: 0, marginBottom: '4px' }}>{fullName || 'Business Owner'}</h4>
              <p style={{ opacity: 0.75, marginBottom: '24px', fontSize: '0.75rem' }}>{user?.email}</p>
              
              <div style={{ width: '100%', borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center', gap: '6px' }}><UserCheck size={12} /> Role</span>
                  <strong style={{ fontWeight: 600 }}>Business Owner</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> Joined</span>
                  <strong style={{ fontWeight: 600 }}>{joinDate}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Settings Card */}
          <div className="bento-card">
            <div className="card-header border-bottom">
              <div className="card-header-title">
                <span className="title-indicator"></span>
                <h4>SYSTEM PREFERENCES</h4>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSavePreferences}>
                
                {prefSaved && (
                  <div className="application-success" style={{ margin: '0 0 16px 0' }}>
                    <CheckCircle2 size={16} />
                    <span>Preferences saved!</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Pref Checkboxes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={emailAlerts}
                        onChange={(e) => setEmailAlerts(e.target.checked)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--teal-primary)' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-700)', lineHeight: '1.4' }}>
                        Email notifications for application status changes
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={inAppAlerts}
                        onChange={(e) => setInAppAlerts(e.target.checked)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--teal-primary)' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-700)', lineHeight: '1.4' }}>
                        Show real-time dashboard notification alerts
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={marketingAlerts}
                        onChange={(e) => setMarketingAlerts(e.target.checked)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--teal-primary)' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-700)', lineHeight: '1.4' }}>
                        Receive news and announcements from Barangay Napindan
                      </span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--slate-100)', paddingTop: '16px', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}><Bell size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Alerts enabled</span>
                    <button type="submit" className="resubmit-submit-btn" style={{ padding: '8px 16px', fontSize: '0.72rem' }}>
                      Save Preferences
                    </button>
                  </div>

                </div>

              </form>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
