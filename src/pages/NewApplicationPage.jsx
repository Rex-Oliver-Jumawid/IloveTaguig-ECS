import { useMemo, useRef, useState, useEffect } from 'react'
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  FileCheck2, 
  FileText, 
  UploadCloud, 
  X,
  Home,
  Award,
  History,
  Settings,
  LogOut,
  Bell,
  Plus,
  ChevronRight,
  PanelLeft,
  Menu
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const initialForm = { businessName: '', ownerFullName: '', natureOfBusiness: '', ownershipType: '', applicationType: '', contactNumber: '', businessAddress: '' }

function safeName(name) {
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : ''
  const base = name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'document'
  return `${base}${extension}`
}

export default function NewApplicationPage() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const [form, setForm] = useState(() => ({ ...initialForm, ownerFullName: profile?.full_name || '' }))
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)
  const [appCount, setAppCount] = useState(0)

  // Layout states (consistent with OwnerDashboardPage)
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])

  // Fetch count of user's applications for the sidebar badge
  useEffect(() => {
    if (!supabase || !user) return
    async function getAppCount() {
      try {
        const { count, error } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id)
        if (!error && count !== null) {
          setAppCount(count)
        } else {
          setAppCount(4)
        }
      } catch (err) {
        console.error('Error fetching count:', err)
        setAppCount(4)
      }
    }
    getAppCount()
  }, [user])

  const ownerInitials = useMemo(() => {
    if (profile?.initials) return profile.initials
    const name = profile?.full_name || user?.email || 'User'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }, [profile, user])

  const ownerName = profile?.full_name || user?.email?.split('@')[0] || 'Business Owner'

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  function addFiles(incoming) {
    const next = [...files]
    let fileError = ''
    for (const file of incoming) {
      if (next.length >= MAX_FILES) { fileError = `You can upload up to ${MAX_FILES} documents.`; break }
      if (!ALLOWED_TYPES.includes(file.type)) { fileError = `${file.name} must be a PDF, JPG, or PNG.`; continue }
      if (file.size > MAX_SIZE) { fileError = `${file.name} is larger than 10 MB.`; continue }
      if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file)
    }
    setFiles(next)
    setErrors((current) => ({ ...current, files: fileError }))
  }

  function validate() {
    const next = {}
    if (form.businessName.trim().length < 2) next.businessName = 'Enter the registered business name.'
    if (form.ownerFullName.trim().length < 3) next.ownerFullName = 'Enter the owner’s full legal name.'
    if (!form.natureOfBusiness) next.natureOfBusiness = 'Select the nature of business.'
    if (!form.ownershipType) next.ownershipType = 'Select an ownership type.'
    if (!form.applicationType) next.applicationType = 'Select new or renewal.'
    if (!/^(?:\+63|0)9\d{9}$/.test(form.contactNumber.replace(/[\s-]/g, ''))) next.contactNumber = 'Enter a valid Philippine mobile number.'
    if (form.businessAddress.trim().length < 10) next.businessAddress = 'Enter the complete registered business address.'
    if (!files.length) next.files = 'Upload at least one supporting document.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setPending(true)

    const applicationId = crypto.randomUUID()
    const uploadedPaths = []
    try {
      const documents = []
      for (const [index, file] of files.entries()) {
        const storagePath = `${user.id}/${applicationId}/${index + 1}-${safeName(file.name)}`
        const { error } = await supabase.storage.from('application-docs').upload(storagePath, file, { contentType: file.type, upsert: false })
        if (error) throw error
        uploadedPaths.push(storagePath)
        documents.push({ storage_path: storagePath, file_name: file.name, mime_type: file.type, file_size: file.size })
      }

      const { error } = await supabase.rpc('submit_owner_application', {
        application_id: applicationId,
        owner_full_name: form.ownerFullName,
        business_name: form.businessName,
        nature_of_business: form.natureOfBusiness,
        ownership_type: form.ownershipType,
        application_type: form.applicationType,
        contact_number: form.contactNumber,
        business_address: form.businessAddress,
        documents,
      })
      if (error) throw error
      navigate(`/owner/applications/${applicationId}`, { replace: true, state: { submitted: true } })
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from('application-docs').remove(uploadedPaths)
      setSubmitError(error?.message?.includes('duplicate') ? 'This application could not be submitted. Please try again.' : 'Submission failed. No application was created; review your connection and try again.')
      setPending(false)
    }
  }

  return (
    <div className={`dashboard-container ${isSidebarMinimized ? 'sidebar-minimized' : ''}`}>
      
      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <button 
          className="mobile-menu-toggle" 
          id="mobile-toggle" 
          aria-label="Toggle menu"
          onClick={() => setIsMobileSidebarOpen(prev => !prev)}
        >
          <Menu />
        </button>
        <div className="mobile-brand">
          <span className="mobile-logo-txt">ILoveTaguig ECS</span>
        </div>
        <div className="mobile-avatar">{ownerInitials}</div>
      </header>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'sidebar-open' : ''}`} id="sidebar">
        <div className="sidebar-top">
          {/* Brand Header */}
          <div className="sidebar-brand">
            <div className="logo-container">
              <div className="logo-border">
                <img src="/assets/images/logo2.png" alt="Napindan Logo" className="logo-img" />
              </div>
              {!isSidebarMinimized && (
                <div className="logo-border">
                  <img src="/assets/images/logo1.png" alt="Taguig Logo" className="logo-img" />
                </div>
              )}
            </div>
            {!isSidebarMinimized && (
              <div className="brand-text">
                <h1 className="brand-title">ILoveTaguig ECS</h1>
                <span className="brand-subtitle">BARANGAY NAPINDAN · TAGUIG CITY</span>
              </div>
            )}
          </div>

          {/* New Application CTA */}
          <div className="sidebar-action">
            <Link 
              to="/owner/applications/new"
              className="new-app-btn" 
              title={isSidebarMinimized ? "New Application" : undefined}
            >
              <Plus className="btn-icon" size={18} strokeWidth={2.5} />
              {!isSidebarMinimized && <span>NEW APPLICATION</span>}
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav" aria-label="Sidebar navigation">
            <ul className="nav-list">
              <li>
                <Link to="/owner" className="nav-link" title={isSidebarMinimized ? "Dashboard" : undefined}>
                  <Home className="nav-icon" />
                  {!isSidebarMinimized && <span>Dashboard</span>}
                </Link>
              </li>
              <li>
                <Link to="/owner#applications" className="nav-link" title={isSidebarMinimized ? "Applications" : undefined}>
                  <FileText className="nav-icon" />
                  {!isSidebarMinimized && (
                    <>
                      <span>Applications</span>
                      <span className="nav-badge">{appCount}</span>
                    </>
                  )}
                </Link>
              </li>
              <li>
                <a href="#certifications" className="nav-link" onClick={(e) => { e.preventDefault(); alert('Certifications feature is coming soon.') }} title={isSidebarMinimized ? "Certifications" : undefined}>
                  <Award className="nav-icon" />
                  {!isSidebarMinimized && <span>Certifications</span>}
                </a>
              </li>
              <li>
                <Link to="/owner/history" className="nav-link" title={isSidebarMinimized ? "History" : undefined}>
                  <History className="nav-icon" />
                  {!isSidebarMinimized && <span>History</span>}
                </Link>
              </li>
              <li>
                <a href="#settings" className="nav-link" onClick={(e) => { e.preventDefault(); alert('Settings feature is coming soon.') }} title={isSidebarMinimized ? "Settings" : undefined}>
                  <Settings className="nav-icon" />
                  {!isSidebarMinimized && <span>Settings</span>}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer User Details */}
        <div className="sidebar-bottom">
          {!isSidebarMinimized && (
            <div className="user-profile-badge">
              <div className="avatar-circle">{ownerInitials}</div>
              <div className="user-info">
                <span className="user-name" title={ownerName}>{ownerName}</span>
                <span className="user-role">Business Owner</span>
              </div>
            </div>
          )}
          <button 
            className="logout-btn" 
            onClick={signOut}
            title={isSidebarMinimized ? "Log Out" : undefined}
          >
            <LogOut className="btn-icon" size={16} />
            {!isSidebarMinimized && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN SCROLLABLE CONTENT */}
      <main className="main-content" onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}>
        
        {/* Sticky Topbar */}
        <header className="top-bar">
          <div className="topbar-left">
            <button 
              type="button" 
              className="sidebar-toggle-btn-topbar" 
              onClick={() => setIsSidebarMinimized(prev => !prev)}
              aria-label={isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
              title={isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
            >
              <PanelLeft />
            </button>
            <div className="new-app-breadcrumbs">
              <Link to="/owner" className="breadcrumb-link">Dashboard</Link>
              <ChevronRight className="breadcrumb-separator" size={12} />
              <span className="breadcrumb-current">New Application</span>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn-round notification-btn" aria-label="Notifications" onClick={() => alert('Notifications feature is coming soon.')}>
              <Bell />
              <span className="notification-badge"></span>
            </button>
            <button className="icon-btn-round" aria-label="Settings" onClick={() => alert('Settings feature is coming soon.')}>
              <Settings />
            </button>
            <div className="user-avatar-badge">{ownerInitials}</div>
          </div>
        </header>

        {/* Page Title */}
        <section className="welcome-section">
          <div className="welcome-text">
            <h2 className="new-app-header-title">
              New <span className="new-app-title-italic">Application</span>
            </h2>
            <p className="new-app-subtitle">Submit a request for Barangay Business Clearance certification.</p>
          </div>
        </section>

        {/* Form Container Card */}
        <div className="form-section-card">
          <form onSubmit={submit} noValidate>
            <div className="form-section-card-header">
              <span className="title-indicator" style={{ height: '12px', backgroundColor: 'var(--orange-primary)', borderRadius: '2px', width: '4px' }}></span>
              <h3 style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--teal-primary)' }}>BUSINESS CLEARANCE DETAILS</h3>
            </div>
            
            <div className="form-section-card-body" style={{ padding: '32px 32px 48px' }}>
              <div className="application-field-grid">
                
                {/* Business Name */}
                <div className="application-field">
                  <label htmlFor="businessName">BUSINESS NAME <span>*</span></label>
                  <input 
                    id="businessName" 
                    name="businessName" 
                    value={form.businessName} 
                    onChange={(e) => update('businessName', e.target.value)} 
                    placeholder="Enter registered business name" 
                    aria-invalid={Boolean(errors.businessName)}
                    aria-describedby={errors.businessName ? "businessName-error" : undefined}
                  />
                  {errors.businessName && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="businessName-error">{errors.businessName}</small>}
                </div>

                {/* Owner's Full Name */}
                <div className="application-field">
                  <label htmlFor="ownerFullName">OWNER'S FULL NAME <span>*</span></label>
                  <input 
                    id="ownerFullName" 
                    name="ownerFullName" 
                    value={form.ownerFullName} 
                    onChange={(e) => update('ownerFullName', e.target.value)} 
                    placeholder="First Name, Last Name" 
                    aria-invalid={Boolean(errors.ownerFullName)}
                    aria-describedby={errors.ownerFullName ? "ownerFullName-error" : undefined}
                  />
                  {errors.ownerFullName && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="ownerFullName-error">{errors.ownerFullName}</small>}
                </div>

                {/* Nature of Business Select */}
                <div className="application-field">
                  <label htmlFor="natureOfBusiness">NATURE OF BUSINESS <span>*</span></label>
                  <select 
                    id="natureOfBusiness" 
                    name="natureOfBusiness" 
                    value={form.natureOfBusiness} 
                    onChange={(e) => update('natureOfBusiness', e.target.value)}
                    aria-invalid={Boolean(errors.natureOfBusiness)}
                    aria-describedby={errors.natureOfBusiness ? "natureOfBusiness-error" : undefined}
                  >
                    <option value="">Select business type</option>
                    {['Retail', 'Food Service', 'Professional Services', 'Manufacturing', 'Other'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {errors.natureOfBusiness && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="natureOfBusiness-error">{errors.natureOfBusiness}</small>}
                </div>

                {/* Ownership Type Select */}
                <div className="application-field">
                  <label htmlFor="ownershipType">OWNERSHIP TYPE <span>*</span></label>
                  <select 
                    id="ownershipType" 
                    name="ownershipType" 
                    value={form.ownershipType} 
                    onChange={(e) => update('ownershipType', e.target.value)}
                    aria-invalid={Boolean(errors.ownershipType)}
                    aria-describedby={errors.ownershipType ? "ownershipType-error" : undefined}
                  >
                    <option value="">Select ownership type</option>
                    {['Sole Proprietorship', 'Partnership', 'Corporation'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {errors.ownershipType && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="ownershipType-error">{errors.ownershipType}</small>}
                </div>

                {/* Application Type Select */}
                <div className="application-field">
                  <label htmlFor="applicationType">APPLICATION TYPE <span>*</span></label>
                  <select 
                    id="applicationType" 
                    name="applicationType" 
                    value={form.applicationType} 
                    onChange={(e) => update('applicationType', e.target.value)}
                    aria-invalid={Boolean(errors.applicationType)}
                    aria-describedby={errors.applicationType ? "applicationType-error" : undefined}
                  >
                    <option value="">Select application type</option>
                    {['New', 'Renewal'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {errors.applicationType && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="applicationType-error">{errors.applicationType}</small>}
                </div>

                {/* Contact Number */}
                <div className="application-field">
                  <label htmlFor="contactNumber">CONTACT NUMBER <span>*</span></label>
                  <input 
                    id="contactNumber" 
                    name="contactNumber" 
                    value={form.contactNumber} 
                    onChange={(e) => update('contactNumber', e.target.value)} 
                    placeholder="09XX XXX XXXX" 
                    inputMode="tel"
                    aria-invalid={Boolean(errors.contactNumber)}
                    aria-describedby={errors.contactNumber ? "contactNumber-error" : undefined}
                  />
                  {errors.contactNumber && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="contactNumber-error">{errors.contactNumber}</small>}
                </div>

                {/* Registered Business Address */}
                <div className="application-field wide">
                  <label htmlFor="businessAddress">REGISTERED BUSINESS ADDRESS <span>*</span></label>
                  <input 
                    id="businessAddress" 
                    name="businessAddress" 
                    value={form.businessAddress} 
                    onChange={(e) => update('businessAddress', e.target.value)} 
                    placeholder="Unit/Floor, Building, Street, Barangay Napindan, Taguig City" 
                    aria-invalid={Boolean(errors.businessAddress)}
                    aria-describedby={errors.businessAddress ? "businessAddress-error" : undefined}
                  />
                  <span className="dropzone-help-text" style={{ marginTop: '4px' }}>Must be within Barangay Napindan, Taguig City.</span>
                  {errors.businessAddress && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="businessAddress-error">{errors.businessAddress}</small>}
                </div>

              </div>

              {/* Supporting Documents section */}
              <h4 className="form-docs-heading">SUPPORTING DOCUMENTS <span>*</span></h4>
              
              <div 
                className={`figma-dropzone ${errors.files ? 'invalid' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
                onClick={() => fileInput.current?.click()}
              >
                <div className="dropzone-icon-circle">
                  <UploadCloud size={24} />
                </div>
                <p className="dropzone-text">
                  <span className="orange-highlight">Click to upload</span> or drag and drop
                </p>
                <p className="dropzone-subtext">
                  DTI/SEC Registration, Valid ID, Lease Contract - SVG, PNG, JPG, PDF (max. 10MB)
                </p>
                
                <input 
                  ref={fileInput} 
                  type="file" 
                  multiple 
                  accept=".pdf,.jpg,.jpeg,.png" 
                  style={{ display: 'none' }}
                  onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} 
                />
              </div>

              {errors.files && (
                <p className="application-error" style={{ color: 'var(--error-color)', fontSize: '0.75rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={14} />
                  <span>{errors.files}</span>
                </p>
              )}

              <p className="dropzone-help-text" style={{ marginBottom: '16px' }}>Upload at least one valid supporting document.</p>

              {/* Display selected files */}
              {files.length > 0 && (
                <div className="application-files" style={{ marginTop: '16px', marginBottom: '24px' }}>
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${file.size}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--slate-200)', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} style={{ color: 'var(--teal-primary)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-900)' }}>{file.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        aria-label={`Remove ${file.name}`} 
                        onClick={(e) => { e.stopPropagation(); setFiles(curr => curr.filter((_, i) => i !== idx)) }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <p style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                    {files.length} of {MAX_FILES} files · {(totalSize / 1024 / 1024).toFixed(2)} MB total
                  </p>
                </div>
              )}

              {submitError && (
                <div className="application-submit-error" role="alert" style={{ marginTop: '16px', marginBottom: '24px' }}>
                  <AlertCircle size={18} />
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            {/* Action Buttons Footer */}
            <div className="form-actions-bar">
              <Link to="/owner" className="cancel-action-btn">Cancel</Link>
              <button type="submit" className="submit-action-btn" disabled={pending}>
                <ArrowRight size={16} />
                {pending ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
              </button>
            </div>
          </form>
        </div>

      </main>

    </div>
  )
}
