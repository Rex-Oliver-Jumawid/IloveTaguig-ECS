import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import AdminHelpPanel from '../components/AdminHelpPanel'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function safeFilenamePart(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function clearanceFilename(clearance) {
  const businessName = safeFilenamePart(clearance?.business_name) || 'Business'
  const reference = safeFilenamePart(clearance?.reference_no) || 'Clearance'
  return `Barangay-Business-Clearance-${reference}-${businessName}.pdf`
}

export default function AdminGeneratedClearancePage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [clearance, setClearance] = useState(null)
  const [signedUrl, setSignedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  const adminInitials = profile?.initials ||
    (profile?.full_name || 'Admin').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  // ── Data load ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: detailsError } = await supabase.rpc('get_generated_clearance', {
      application_id: applicationId,
    })
    if (detailsError) {
      setError(detailsError.message)
      setLoading(false)
      return
    }
    const { data: urlData, error: urlError } = await supabase.storage
      .from('generated-clearances')
      .createSignedUrl(data.generated_clearance_path, 300, {
        download: clearanceFilename(data),
      })
    if (urlError) {
      setError('The private PDF link could not be created.')
      setLoading(false)
      return
    }
    setClearance(data)
    setSignedUrl(urlData.signedUrl)
    setLoading(false)
  }, [applicationId])

  useEffect(() => { load() }, [load])

  // ── Refresh signed URL (expires every 5 min) ──────────────────
  async function refreshSignedUrl() {
    if (!clearance?.generated_clearance_path) return
    setRefreshing(true)
    const { data, error: urlError } = await supabase.storage
      .from('generated-clearances')
      .createSignedUrl(clearance.generated_clearance_path, 300, {
        download: clearanceFilename(clearance),
      })
    if (!urlError && data?.signedUrl) {
      setSignedUrl(data.signedUrl)
    } else {
      setError('Could not refresh the PDF link. Please reload the page.')
    }
    setRefreshing(false)
  }

  // ── Mark Complete ────────────────────────────────────────────────
  async function markComplete() {
    setSaving(true)
    setError('')
    const { error: completionError } = await supabase.rpc('complete_clearance', {
      application_id: applicationId,
    })
    setSaving(false)
    if (completionError) {
      setError(completionError.message)
      return
    }
    navigate('/admin')
  }

  // ── Download PDF directly from private Storage with a stable filename ──
  async function downloadPdf() {
    if (!clearance?.generated_clearance_path) return
    setDownloading(true)
    setError('')
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('generated-clearances')
        .download(clearance.generated_clearance_path)
      if (downloadError || !data) throw downloadError || new Error('PDF download returned no data')

      const pdfBlob = new Blob([await data.arrayBuffer()], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(pdfBlob)
      const filename = clearanceFilename(clearance)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = filename
      anchor.type = 'application/pdf'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
    } catch {
      setError('Could not download the PDF. Please try refreshing the link.')
    } finally {
      setDownloading(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="gc-fullstate">
        <RefreshCw size={28} className="gc-spin-icon" />
        <p>Loading generated clearance…</p>
      </div>
    )
  }

  // ── Fatal error (no data) ────────────────────────────────────────
  if (error && !clearance) {
    return (
      <div className="gc-fullstate gc-fullstate--error">
        <AlertTriangle size={32} />
        <p>{error}</p>
        <Link to="/admin" className="gc-error-back">← Back to Dashboard</Link>
      </div>
    )
  }

  const isComplete = clearance.status === 'Complete'
  const isProceed = clearance.status === 'Proceed to Barangay Hall'

  return (
    <div className="gc-shell">

      {/* ── Top Navbar ─────────────────────────────────────────── */}
      <header className="gc-topbar">
        <div className="gc-topbar-left">
          <Link to="/admin" className="gc-back-link">
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <div className="gc-topbar-right">
          <span className="gc-admin-badge">
            <ShieldCheck size={14} />
            ADMIN ONLY
          </span>
          <button type="button" className="gc-icon-btn" aria-label="Help" onClick={() => setHelpOpen(true)}>
            <HelpCircle size={16} />
          </button>
          <div className="gc-avatar" aria-label={`Admin: ${profile?.full_name || 'Admin'}`}>
            {adminInitials}
          </div>
        </div>
      </header>

      <AdminHelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} context="clearance" />

      {/* ── Page body ──────────────────────────────────────────── */}
      <div className="gc-body">

        {/* ── Left column: header + preview ──────────────────── */}
        <div className="gc-left-col">

          {/* Page header */}
          <div className="gc-page-header">
            <nav className="gc-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/admin" className="gc-crumb">Dashboard</Link>
              <ChevronRight size={12} className="gc-crumb-sep" />
              <Link
                to="/admin"
                className="gc-crumb"
                onClick={e => { e.preventDefault(); navigate('/admin') }}
              >
                Print Queue
              </Link>
              <ChevronRight size={12} className="gc-crumb-sep" />
              <span className="gc-crumb gc-crumb--active">Generated Clearance</span>
            </nav>
            <h1 className="gc-page-title">
              Generated <em>Clearance</em>
            </h1>
            <p className="gc-page-subtitle">
              Private administrator copy — signed link expires in 5 minutes.
            </p>
          </div>

          {/* PDF Preview card */}
          <div className="gc-preview-card">

            {/* Expiry warning strip */}
            <div className="gc-preview-strip">
              <div className="gc-preview-strip-left">
                <span className="gc-preview-ref-pill">{clearance.reference_no}</span>
                <span className="gc-preview-exp-note">Link expires in ~5 min</span>
              </div>
              <button
                type="button"
                id="gc-refresh-url-btn"
                className="gc-refresh-url-btn"
                onClick={refreshSignedUrl}
                disabled={refreshing}
                aria-label="Refresh signed URL"
              >
                <RefreshCw size={13} className={refreshing ? 'gc-spin-icon' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh Link'}
              </button>
            </div>

            {/* PDF iframe */}
            <iframe
              className="gc-preview-frame"
              title={`Barangay Business Clearance – ${clearance.reference_no}`}
              src={signedUrl}
            />
          </div>
        </div>

        {/* ── Right column: summary + actions ────────────────── */}
        <aside className="gc-right-col">

          {/* Completion banner */}
          {isComplete && (
            <div className="gc-complete-banner" role="status">
              <CheckCircle2 size={18} />
              <div>
                <strong>Certificate Issued</strong>
                <p>This clearance has been printed, sealed, and handed over to the applicant.</p>
              </div>
            </div>
          )}

          {/* Summary card */}
          <div className="gc-card">
            <div className="gc-card-header">
              <span className="gc-card-bar" />
              <h2 className="gc-card-title">APPLICATION SUMMARY</h2>
            </div>
            <dl className="gc-summary-list">
              <div className="gc-summary-row gc-summary-row--highlight">
                <dt className="gc-summary-key">Reference Number</dt>
                <dd className="gc-summary-val gc-summary-ref">{clearance.reference_no}</dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Applicant</dt>
                <dd className="gc-summary-val">{clearance.owner_full_name}</dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Business</dt>
                <dd className="gc-summary-val">{clearance.business_name}</dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Address</dt>
                <dd className="gc-summary-val">{clearance.business_address}</dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Ownership / Type</dt>
                <dd className="gc-summary-val">{clearance.ownership_type}</dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Application Type</dt>
                <dd className="gc-summary-val">{clearance.application_type}</dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Approved</dt>
                <dd className="gc-summary-val">{formatDate(clearance.approved_at)}</dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Clerk Initials</dt>
                <dd className="gc-summary-val">
                  <span className="gc-clerk-pill">{clearance.clerk_initial}</span>
                </dd>
              </div>
              <div className="gc-summary-row">
                <dt className="gc-summary-key">Status</dt>
                <dd className="gc-summary-val">
                  <span className={`gc-status-pill ${isComplete ? 'gc-pill--complete' : 'gc-pill--proceed'}`}>
                    <span className="gc-pill-dot" />
                    {isComplete ? 'Complete' : 'Proceed to Barangay Hall'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions card */}
          <div className="gc-card gc-actions-card">
            <div className="gc-card-header">
              <span className="gc-card-bar gc-card-bar--teal" />
              <h2 className="gc-card-title">ACTIONS</h2>
            </div>
            <div className="gc-actions-body">

              <button
                id="gc-download-btn"
                type="button"
                className="gc-action-btn gc-btn--secondary"
                disabled={downloading || saving}
                onClick={downloadPdf}
                aria-busy={downloading}
                aria-label={`Download ${clearance?.reference_no ?? ''}.pdf`}
              >
                {downloading
                  ? <RefreshCw size={15} className="gc-spin-icon" />
                  : <Download size={15} />}
                {downloading ? 'Downloading…' : 'Download PDF'}
              </button>

              <div className="gc-actions-divider" />

              {error && (
                <div className="gc-inline-error" role="alert">
                  <AlertTriangle size={13} />
                  <span>{error}</span>
                </div>
              )}

              <button
                id="gc-complete-btn"
                type="button"
                className={`gc-action-btn gc-btn--primary ${isComplete ? 'gc-btn--done' : ''}`}
                disabled={saving || isComplete}
                onClick={markComplete}
                aria-busy={saving}
              >
                {saving ? (
                  <RefreshCw size={15} className="gc-spin-icon" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {saving ? 'Completing…' : isComplete ? 'Already Completed' : 'Mark as Complete'}
              </button>

              {!isComplete && (
                <p className="gc-complete-hint">
                  Click after the applicant has collected the sealed, signed certificate in person.
                </p>
              )}
            </div>
          </div>

        </aside>
      </div>
    </div>
  )
}
