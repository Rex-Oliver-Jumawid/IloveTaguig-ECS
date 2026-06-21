import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  FileText,
  Clock,
  Search,
  Bell,
  HelpCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import AdminHelpPanel from '../components/AdminHelpPanel'

const CHECKLIST_ITEMS = [
  { key: 'address_verified', label: 'Address is within Barangay Napindan' },
  { key: 'identity_verified', label: 'Applicant identity document is valid' },
  { key: 'documents_complete', label: 'Required supporting documents are complete' },
  { key: 'records_clear', label: 'No conflicting barangay records found' },
]

function getInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getStatusBadge(status) {
  const map = {
    'Pending Review': { bg: '#FFFBEB', border: 'rgba(245,158,11,0.3)', dot: '#F59E0B', text: '#92400E' },
    'Action Required': { bg: '#FEF2F2', border: 'rgba(239,68,68,0.3)', dot: '#EF4444', text: '#991B1B' },
    'Approved': { bg: '#F0FDFA', border: 'rgba(26,173,168,0.3)', dot: '#1AADA8', text: '#0D6F68' },
    'Proceed to Barangay Hall': { bg: '#F0FDFA', border: 'rgba(26,173,168,0.3)', dot: '#1AADA8', text: '#0D6F68' },
    'Rejected': { bg: '#FEF2F2', border: 'rgba(239,68,68,0.3)', dot: '#EF4444', text: '#991B1B' },
    'Complete': { bg: '#F0FDF4', border: 'rgba(16,185,129,0.3)', dot: '#10B981', text: '#065F46' },
  }
  return map[status] || { bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF', text: '#374151' }
}

export default function AdminApplicationReviewPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [application, setApplication] = useState(null)
  const [documents, setDocuments] = useState([])
  const [checklist, setChecklist] = useState({})
  const [remarks, setRemarks] = useState('')
  const [otherPending, setOtherPending] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  const adminInitials = profile?.initials ||
    (profile?.full_name || 'Admin Staff').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [appResult, docsResult, pendingResult] = await Promise.all([
      supabase.from('applications').select('id, owner_id, owner_full_name, business_name, nature_of_business, ownership_type, application_type, contact_number, business_address, status, remarks, reference_no, approved_at, approved_by, clerk_initial, created_at, updated_at, verification_checklist').eq('id', applicationId).single(),
      supabase.from('application_documents').select('*').eq('application_id', applicationId).order('created_at'),
      supabase.from('applications')
        .select('id, business_name, owner_full_name, status, created_at')
        .eq('status', 'Pending Review')
        .neq('id', applicationId)
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    if (appResult.error) { setError('This application could not be loaded.'); setLoading(false); return }

    setApplication(appResult.data)
    setRemarks(appResult.data.remarks ?? '')
    setChecklist(appResult.data.verification_checklist ?? {})
    setOtherPending(pendingResult.data ?? [])

    // Sign all doc URLs
    const signed = await Promise.all((docsResult.data ?? []).map(async (doc) => {
      const { data } = await supabase.storage.from('application-docs').createSignedUrl(doc.storage_path, 300)
      return { ...doc, signedUrl: data?.signedUrl }
    }))
    setDocuments(signed)
    setLoading(false)
  }, [applicationId])

  useEffect(() => { load() }, [load])

  async function review(nextStatus) {
    if (nextStatus === 'Approved' && !CHECKLIST_ITEMS.every(({ key }) => checklist[key])) {
      setError('Complete every verification check before approving.'); return
    }
    if (['Action Required', 'Rejected'].includes(nextStatus) && !remarks.trim()) {
      setError('Remarks are required when requesting info or rejecting.'); return
    }
    setSaving(true); setError('')
    const result = await supabase.rpc('review_application', {
          application_id: applicationId,
          next_status: nextStatus,
          admin_remarks: remarks,
          checklist,
        })
    setSaving(false)
    if (result.error) {
      let message = result.error.message
      try {
        const payload = await result.error.context?.json?.()
        if (payload?.error) message = payload.error
      } catch {
        // Keep the client error when the function response has no JSON body.
      }
      setError(message)
      return
    }
    navigate('/admin')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7FAFA', flexDirection: 'column', gap: '12px' }}>
        <RefreshCw size={28} style={{ color: '#1AADA8', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading application…</p>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <AlertTriangle size={32} style={{ color: '#EF4444' }} />
        <p style={{ color: '#374151' }}>{error}</p>
        <Link to="/admin" style={{ color: '#1AADA8', fontWeight: 600 }}>← Back to Dashboard</Link>
      </div>
    )
  }

  if (!application) return null

  const badge = getStatusBadge(application.status)
  const checklistDone = CHECKLIST_ITEMS.filter(({ key }) => checklist[key]).length
  const canReview = ['Pending Review', 'Action Required'].includes(application.status)

  return (
    <div className="ar-shell">
      {/* Top Navbar */}
      <header className="ar-topbar">
        <div className="ar-search-wrapper">
          <Search size={14} className="ar-search-icon" />
          <input type="text" className="ar-search-input" placeholder="Search applications..." readOnly />
        </div>
        <div className="ar-topbar-right">
          <span className="ar-admin-badge">
            <ShieldCheck size={12} />
            ADMIN
          </span>
          <button type="button" className="ar-icon-btn" aria-label="Notifications">
            <Bell size={16} />
          </button>
          <button type="button" className="ar-icon-btn" aria-label="Help" onClick={() => setHelpOpen(true)}>
            <HelpCircle size={16} />
          </button>
          <div className="ar-avatar">{adminInitials}</div>
        </div>
      </header>

      <AdminHelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} context="review" />

      {/* Main body */}
      <div className="ar-body">
        {/* Content area */}
        <main className="ar-content">

          {/* Page Header */}
          <div className="ar-page-header">
            <div className="ar-header-left">
              <nav className="ar-breadcrumbs">
                <Link to="/admin" className="ar-crumb">Dashboard</Link>
                <ChevronRight size={12} className="ar-crumb-sep" />
                <Link to="/admin" className="ar-crumb">Applications</Link>
                <ChevronRight size={12} className="ar-crumb-sep" />
                <span className="ar-crumb active">{application.business_name}</span>
              </nav>
              <h1 className="ar-page-title">Application <em>Review</em></h1>
              <p className="ar-page-subtitle">
                Verify business details and supporting documents before making a decision.
              </p>
            </div>
            <Link to="/admin" className="ar-back-btn">
              <ArrowLeft size={14} />
              <span>Back to List</span>
            </Link>
          </div>

          {/* Two-column layout */}
          <div className="ar-layout">
            {/* Left column */}
            <div className="ar-left-col">

              {/* Applicant Profile Header Card */}
              <div className="ar-card ar-profile-card">
                <div className="ar-profile-left">
                  <div className="ar-profile-avatar">
                    {getInitials(application.owner_full_name)}
                  </div>
                  <div className="ar-profile-info">
                    <h2 className="ar-profile-name">{application.owner_full_name}</h2>
                    <p className="ar-profile-business">{application.business_name}</p>
                    <p className="ar-profile-date">
                      Submitted {new Date(application.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span
                  className="ar-status-badge"
                  style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.text }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.dot, display: 'inline-block', marginRight: 6, flexShrink: 0 }}></span>
                  {application.status}
                </span>
              </div>

              {/* Business Details */}
              <div className="ar-card">
                <div className="ar-section-header">
                  <span className="ar-section-bar"></span>
                  <h3 className="ar-section-title">BUSINESS DETAILS</h3>
                </div>
                <div className="ar-details-grid">
                  <div className="ar-detail-item">
                    <span className="ar-detail-label">Applicant Name</span>
                    <span className="ar-detail-value">{application.owner_full_name}</span>
                  </div>
                  <div className="ar-detail-item">
                    <span className="ar-detail-label">Contact Number</span>
                    <span className="ar-detail-value">{application.contact_number || '—'}</span>
                  </div>
                  <div className="ar-detail-item">
                    <span className="ar-detail-label">Business Name</span>
                    <span className="ar-detail-value">{application.business_name}</span>
                  </div>
                  <div className="ar-detail-item">
                    <span className="ar-detail-label">Nature of Business</span>
                    <span className="ar-detail-value">{application.nature_of_business || '—'}</span>
                  </div>
                  <div className="ar-detail-item">
                    <span className="ar-detail-label">Ownership Type</span>
                    <span className="ar-detail-value">{application.ownership_type || '—'}</span>
                  </div>
                  <div className="ar-detail-item">
                    <span className="ar-detail-label">Application Type</span>
                    <span className="ar-detail-value">{application.application_type || '—'}</span>
                  </div>
                  <div className="ar-detail-item ar-detail-full">
                    <span className="ar-detail-label">Business Address</span>
                    <span className="ar-detail-value">{application.business_address || '—'}</span>
                  </div>
                  {application.remarks && (
                    <div className="ar-detail-item ar-detail-full">
                      <span className="ar-detail-label">Previous Remarks</span>
                      <span className="ar-detail-value" style={{ color: '#92400E', background: '#FFFBEB', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #F59E0B' }}>
                        {application.remarks}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Supporting Documents */}
              <div className="ar-card">
                <div className="ar-section-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ar-section-bar"></span>
                    <h3 className="ar-section-title">SUPPORTING DOCUMENTS</h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{documents.length} document{documents.length !== 1 ? 's' : ''} submitted</span>
                </div>
                <div className="ar-docs-list">
                  {documents.length === 0 ? (
                    <p style={{ color: '#9CA3AF', fontSize: '0.85rem', padding: '20px', textAlign: 'center' }}>No documents submitted yet.</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className={`ar-doc-item ${doc.signedUrl ? 'verified' : 'missing'}`}>
                        <div className="ar-doc-icon-wrap">
                          <FileText size={16} />
                        </div>
                        <div className="ar-doc-info">
                          <span className="ar-doc-name">{doc.file_name}</span>
                          <span className="ar-doc-meta">
                            {doc.mime_type} · {(doc.file_size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="ar-doc-actions">
                          {doc.signedUrl ? (
                            <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="ar-doc-view-btn">
                              <ExternalLink size={12} />
                              View
                            </a>
                          ) : (
                            <span className="ar-doc-unavailable">Unavailable</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="ar-secure-note">
                  🔒 Signed links expire after 5 minutes and remain protected by Storage RLS.
                </p>
              </div>

              {/* Verification Checklist */}
              <div className="ar-card">
                <div className="ar-section-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ar-section-bar"></span>
                    <h3 className="ar-section-title">VERIFICATION CHECKLIST</h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{checklistDone} of {CHECKLIST_ITEMS.length} completed</span>
                </div>
                <div className="ar-checklist">
                  {CHECKLIST_ITEMS.map(({ key, label }) => {
                    const checked = Boolean(checklist[key])
                    return (
                      <label
                        key={key}
                        className={`ar-checklist-item ${checked ? 'checked' : ''}`}
                        htmlFor={`chk-${key}`}
                      >
                        <input
                          id={`chk-${key}`}
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setChecklist(old => ({ ...old, [key]: e.target.checked }))}
                          disabled={!canReview}
                        />
                        <div className="ar-check-icon">
                          {checked ? <CheckCircle2 size={16} /> : <div className="ar-check-empty" />}
                        </div>
                        <span className="ar-checklist-label">{label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Right sidebar */}
            <aside className="ar-right-col">

              {/* Application Summary Panel */}
              <div className="ar-card ar-summary-card">
                <div className="ar-section-header">
                  <span className="ar-section-bar"></span>
                  <h3 className="ar-section-title">APPLICATION SUMMARY</h3>
                </div>
                <div className="ar-summary-table">
                  <div className="ar-summary-row">
                    <span className="ar-summary-key">Application ID</span>
                    <span className="ar-summary-val ar-summary-id">
                      APP-{new Date(application.created_at).getFullYear()}-{application.id.slice(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <div className="ar-summary-row">
                    <span className="ar-summary-key">Type</span>
                    <span className="ar-summary-val">{application.application_type || '—'}</span>
                  </div>
                  <div className="ar-summary-row">
                    <span className="ar-summary-key">Submitted</span>
                    <span className="ar-summary-val">
                      {new Date(application.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="ar-summary-row">
                    <span className="ar-summary-key">Status</span>
                    <span className="ar-summary-val" style={{ color: badge.text, fontWeight: 600 }}>{application.status}</span>
                  </div>
                  <div className="ar-summary-row">
                    <span className="ar-summary-key">Documents</span>
                    <span className="ar-summary-val">{documents.length} file{documents.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="ar-summary-row">
                    <span className="ar-summary-key">Checklist</span>
                    <span className="ar-summary-val">{checklistDone}/{CHECKLIST_ITEMS.length} verified</span>
                  </div>
                </div>
              </div>

              {/* Make a Decision Panel */}
              <div className="ar-card ar-decision-card">
                <div className="ar-section-header">
                  <span className="ar-section-bar" style={{ background: '#1AADA8' }}></span>
                  <h3 className="ar-section-title">MAKE A DECISION</h3>
                </div>

                <p className="ar-decision-hint">
                  Review all documents and the checklist above before approving or rejecting this application.
                  Approved applications move to the Print Queue for certificate generation.
                </p>

                {/* Remarks */}
                <div className="ar-remarks-wrap">
                  <label htmlFor="ar-remarks" className="ar-remarks-label">Admin Remarks</label>
                  <textarea
                    id="ar-remarks"
                    className="ar-remarks-input"
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Explain missing info or rejection reason…"
                    disabled={!canReview}
                  />
                </div>

                {error && (
                  <div className="ar-error-banner">
                    <AlertTriangle size={14} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="ar-decision-actions">
                  <button
                    type="button"
                    className="ar-action-btn approve"
                    disabled={saving || !canReview}
                    onClick={() => review('Approved')}
                  >
                    <CheckCircle2 size={16} />
                    {saving ? 'Processing…' : 'Approve Application'}
                  </button>
                  <button
                    type="button"
                    className="ar-action-btn request-info"
                    disabled={saving || !canReview}
                    onClick={() => review('Action Required')}
                  >
                    <Clock size={16} />
                    Request More Info
                  </button>
                  <button
                    type="button"
                    className="ar-action-btn reject"
                    disabled={saving || !canReview}
                    onClick={() => review('Rejected')}
                  >
                    <XCircle size={16} />
                    Reject Application
                  </button>
                </div>

                {!canReview && (
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                    This application has already been reviewed ({application.status}).
                  </p>
                )}
              </div>

              {/* Other Pending Panel */}
              {otherPending.length > 0 && (
                <div className="ar-card">
                  <div className="ar-section-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="ar-section-bar"></span>
                      <h3 className="ar-section-title">OTHER PENDING</h3>
                    </div>
                    <Link to="/admin" style={{ fontSize: '0.7rem', color: '#1AADA8', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
                  </div>
                  <div className="ar-pending-list">
                    {otherPending.map((item, i) => (
                      <Link
                        key={item.id}
                        to={`/admin/applications/${item.id}`}
                        className={`ar-pending-item ${i === 0 ? 'active' : ''}`}
                      >
                        <div className="ar-pending-info">
                          <span className="ar-pending-name">{item.owner_full_name}</span>
                          <span className="ar-pending-business">{item.business_name}</span>
                        </div>
                        <span className="ar-pending-date">
                          {new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </aside>
          </div>

          {/* Footer */}
          <footer className="ar-footer">
            <span className="ar-footer-brand">ILoveTaguig ECS</span>
            <span className="ar-footer-copy">© 2026 City of Taguig. All rights reserved.</span>
            <div className="ar-footer-links">
              <Link to="/admin">Privacy Policy</Link>
              <Link to="/admin">Terms of Service</Link>
              <Link to="/admin">Contact Support</Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
