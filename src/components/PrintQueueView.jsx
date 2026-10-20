import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  Printer,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

function getAppId(app) {
  if (app.reference_no) return app.reference_no
  const year = app.created_at ? new Date(app.created_at).getFullYear() : '2026'
  return `APP-${year}-${app.id.slice(0, 4).toUpperCase()}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrintQueueView() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Per-card state maps: { [id]: boolean }
  const [generating, setGenerating] = useState({})
  const [completing, setCompleting] = useState({})
  const [cardErrors, setCardErrors] = useState({})
  // Confirm complete dialog: stores the app.id of the pending action or null
  const [confirmCompleteId, setConfirmCompleteId] = useState(null)

  // ── Fetch ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    const { data, error } = await supabase
      .from('applications')
      .select('id, owner_id, owner_full_name, business_name, ownership_type, application_type, status, reference_no, approved_at, created_at')
      .in('status', ['Approved', 'Proceed to Barangay Hall'])
      .order('approved_at', { ascending: false })

    if (error) {
      setFetchError('The print queue could not be loaded. Please try again.')
    } else {
      setApps(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived list (search + sort) ─────────────────────────────────────────

  const displayedApps = (() => {
    let list = [...apps]
    const needle = query.trim().toLowerCase()
    if (needle) {
      list = list.filter(app =>
        (app.owner_full_name ?? '').toLowerCase().includes(needle) ||
        (app.business_name ?? '').toLowerCase().includes(needle) ||
        (app.reference_no ?? '').toLowerCase().includes(needle) ||
        app.id.slice(0, 4).toLowerCase().includes(needle)
      )
    }
    list.sort((a, b) => {
      const da = new Date(a.approved_at ?? a.created_at)
      const db = new Date(b.approved_at ?? b.created_at)
      return sortBy === 'newest' ? db - da : da - db
    })
    return list
  })()

  const generatedCount = apps.filter(a => a.status === 'Proceed to Barangay Hall').length

  // ── Generate Certificate (Edge Function) ──────────────────────────────────

  async function handleGenerate(app) {
    setGenerating(prev => ({ ...prev, [app.id]: true }))
    setCardErrors(prev => ({ ...prev, [app.id]: '' }))

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-clearance`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId: app.id }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Certificate generation failed')

      window.location.assign(`/admin/clearances/${app.id}`)
    } catch (err) {
      setCardErrors(prev => ({ ...prev, [app.id]: err.message }))
    } finally {
      setGenerating(prev => ({ ...prev, [app.id]: false }))
    }
  }

  // ── Download existing certificate ─────────────────────────────────────────

  function handleDownload(app) {
    window.location.assign(`/admin/clearances/${app.id}`)
  }

  // ── Mark Complete ─────────────────────────────────────────────────────────

  async function handleComplete(appId) {
    setConfirmCompleteId(null)
    setCompleting(prev => ({ ...prev, [appId]: true }))
    setCardErrors(prev => ({ ...prev, [appId]: '' }))
    try {
      const { error } = await supabase.rpc('complete_clearance', { application_id: appId })
      if (error) throw error
      setApps(prev => prev.filter(a => a.id !== appId))
    } catch (err) {
      setCardErrors(prev => ({ ...prev, [appId]: err.message }))
    } finally {
      setCompleting(prev => ({ ...prev, [appId]: false }))
    }
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="pq-loading-state">
        <RefreshCw size={28} className="pq-spinner-icon" />
        <p>Loading print queue…</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="pq-error-state">
        <AlertTriangle size={28} />
        <p>{fetchError}</p>
        <button type="button" className="pq-retry-btn" onClick={load}>
          Retry
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="pq-container">

      {/* Confirm Complete Dialog */}
      {confirmCompleteId && (
        <div className="pq-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="pq-confirm-title">
          <div className="pq-confirm-dialog">
            <div className="pq-confirm-icon-wrap">
              <CheckCircle2 size={28} />
            </div>
            <h2 id="pq-confirm-title" className="pq-confirm-title">Mark as Complete?</h2>
            <p className="pq-confirm-body">
              This confirms the certificate has been printed, sealed, and physically handed over to the applicant. This action cannot be undone.
            </p>
            <div className="pq-confirm-actions">
              <button
                type="button"
                id="pq-confirm-yes-btn"
                className="pq-confirm-btn-yes"
                onClick={() => handleComplete(confirmCompleteId)}
              >
                Yes, Mark Complete
              </button>
              <button
                type="button"
                id="pq-confirm-cancel-btn"
                className="pq-confirm-btn-cancel"
                onClick={() => setConfirmCompleteId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <header className="pq-header">
        <div className="pq-header-left">
          <nav className="pq-breadcrumbs" aria-label="Breadcrumb">
            <span className="pq-crumb">Dashboard</span>
            <span className="pq-crumb-sep">/</span>
            <span className="pq-crumb active">Print Queue</span>
          </nav>
          <div className="pq-title-row">
            <h1 className="pq-title">Print <em>Queue</em></h1>
          </div>
          <p className="pq-subtitle">
            Approved applications ready for certificate generation and physical handover.
          </p>
        </div>
        <button
          type="button"
          id="pq-refresh-btn"
          className="pq-refresh-btn"
          onClick={load}
          aria-label="Refresh print queue"
          title="Refresh"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Summary Bar */}
      <div className="pq-summary-bar" aria-label="Queue statistics">
        <div className="pq-summary-pill pq-pill-blue">
          <Printer size={16} />
          <div className="pq-pill-content">
            <span className="pq-pill-value">{apps.length}</span>
            <span className="pq-pill-label">In Queue</span>
          </div>
        </div>
        <div className="pq-summary-pill pq-pill-teal">
          <FileCheck2 size={16} />
          <div className="pq-pill-content">
            <span className="pq-pill-value">{generatedCount}</span>
            <span className="pq-pill-label">Certificate Generated</span>
          </div>
        </div>
        <div className="pq-summary-pill pq-pill-orange">
          <AlertTriangle size={16} />
          <div className="pq-pill-content">
            <span className="pq-pill-value">{apps.length - generatedCount}</span>
            <span className="pq-pill-label">Pending Generation</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="pq-filter-bar">
        <div className="pq-search-wrap">
          <Search size={14} className="pq-search-icon" />
          <input
            type="text"
            id="pq-search-input"
            className="pq-search-input"
            placeholder="Search applicant, business, or ID…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search print queue"
          />
          {query && (
            <button
              type="button"
              className="pq-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
        <select
          id="pq-sort-select"
          className="pq-sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          aria-label="Sort print queue"
        >
          <option value="newest">Newest Approved</option>
          <option value="oldest">Oldest Approved</option>
        </select>
      </div>

      {/* Empty State */}
      {displayedApps.length === 0 && (
        <div className="pq-empty-state">
          <div className="pq-empty-icon-wrap">
            <Printer size={36} />
          </div>
          {query ? (
            <>
              <h2 className="pq-empty-title">No results found</h2>
              <p className="pq-empty-body">No applications match "<strong>{query}</strong>". Try a different search term.</p>
              <button type="button" className="pq-retry-btn" onClick={() => setQuery('')}>Clear Search</button>
            </>
          ) : (
            <>
              <h2 className="pq-empty-title">Queue is empty</h2>
              <p className="pq-empty-body">There are no approved applications waiting for certificate generation.</p>
            </>
          )}
        </div>
      )}

      {/* Application List */}
      {displayedApps.length > 0 && (
        <ul className="pq-list" aria-label="Print queue applications">
          {displayedApps.map(app => {
            const isGenerating = !!generating[app.id]
            const isCompleting = !!completing[app.id]
            const cardError = cardErrors[app.id] || ''
            const hasPdf = app.status === 'Proceed to Barangay Hall'
            const appId = getAppId(app)
            const isProceed = app.status === 'Proceed to Barangay Hall'

            return (
              <li key={app.id} className={`pq-card ${isProceed ? 'pq-card--proceed' : ''}`}>
                {/* Card Top: Avatar + Name + Business */}
                <div className="pq-card-top">
                  <div className="pq-card-avatar" aria-hidden="true">
                    {getInitials(app.owner_full_name)}
                  </div>
                  <div className="pq-card-applicant">
                    <span className="pq-card-name">{app.owner_full_name}</span>
                    <span className="pq-card-business">{app.business_name}</span>
                  </div>
                  <span className={`pq-status-badge ${isProceed ? 'pq-badge--proceed' : 'pq-badge--approved'}`}>
                    <span className="pq-badge-dot" aria-hidden="true" />
                    {isProceed ? 'Proceed to Barangay Hall' : 'Approved'}
                  </span>
                </div>

                {/* Card Meta Row */}
                <div className="pq-card-meta">
                  <div className="pq-meta-item">
                    <span className="pq-meta-label">App ID</span>
                    <span className="pq-meta-value pq-meta-id">{appId}</span>
                  </div>
                  <div className="pq-meta-item">
                    <span className="pq-meta-label">Approved</span>
                    <span className="pq-meta-value">{formatDate(app.approved_at)}</span>
                  </div>
                  <div className="pq-meta-item">
                    <span className="pq-meta-label">Type</span>
                    <span className="pq-meta-value">{app.application_type || 'New'}</span>
                  </div>
                  <div className="pq-meta-item">
                    <span className="pq-meta-label">Certificate</span>
                    <span className={`pq-meta-value ${hasPdf ? 'pq-meta-ready' : 'pq-meta-pending'}`}>
                      {hasPdf ? '✓ Generated' : '○ Not yet generated'}
                    </span>
                  </div>
                </div>

                {/* Inline Error */}
                {cardError && (
                  <div className="pq-card-error" role="alert">
                    <AlertTriangle size={13} />
                    <span>{cardError}</span>
                  </div>
                )}

                {/* Card Actions */}
                <div className="pq-card-actions">
                  {hasPdf ? (
                    <button
                      type="button"
                      id={`pq-download-btn-${app.id}`}
                      className="pq-btn pq-btn--download"
                      disabled={isGenerating || isCompleting}
                      onClick={() => handleDownload(app)}
                      aria-busy={isGenerating}
                    >
                      {isGenerating ? (
                        <RefreshCw size={14} className="pq-btn-spinner" />
                      ) : (
                        <Download size={14} />
                      )}
                      {isGenerating ? 'Opening…' : 'View Certificate'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`pq-generate-btn-${app.id}`}
                      className="pq-btn pq-btn--generate"
                      disabled={isGenerating || isCompleting}
                      onClick={() => handleGenerate(app)}
                      aria-busy={isGenerating}
                    >
                      {isGenerating ? (
                        <RefreshCw size={14} className="pq-btn-spinner" />
                      ) : (
                        <Printer size={14} />
                      )}
                      {isGenerating ? 'Generating…' : 'Generate Certificate'}
                    </button>
                  )}

                  <button
                    type="button"
                    id={`pq-complete-btn-${app.id}`}
                    className="pq-btn pq-btn--complete"
                    disabled={isGenerating || isCompleting || !hasPdf}
                    onClick={() => setConfirmCompleteId(app.id)}
                    aria-busy={isCompleting}
                  >
                    {isCompleting ? (
                      <RefreshCw size={14} className="pq-btn-spinner" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {isCompleting ? 'Completing…' : 'Mark Complete'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Footer count */}
      {displayedApps.length > 0 && (
        <p className="pq-footer-count">
          Showing <strong>{displayedApps.length}</strong> of <strong>{apps.length}</strong> application{apps.length !== 1 ? 's' : ''} in queue
        </p>
      )}
    </div>
  )
}
