import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FilePlus2, History, LayoutDashboard, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const ACTIVE_STATUSES = ['Pending Review', 'Action Required', 'Approved', 'Proceed to Barangay Hall']

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function StatusBadge({ status }) {
  const key = status.toLowerCase().replaceAll(' ', '-').replaceAll('—', '-')
  return <span className={`owner-status owner-status--${key}`}>{status}</span>
}

export default function OwnerDashboardPage() {
  const { profile, signOut } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadApplications = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('applications')
      .select('id, application_type, business_name, created_at, status')
      .order('created_at', { ascending: false })

    if (queryError) setError('Applications could not be loaded. Check your connection and try again.')
    else setApplications(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadApplications() }, [loadApplications])

  const stats = useMemo(() => ({
    active: applications.filter(({ status }) => ACTIVE_STATUSES.includes(status)).length,
    approved: applications.filter(({ status }) => ['Approved', 'Proceed to Barangay Hall', 'Complete'].includes(status)).length,
    actionRequired: applications.filter(({ status }) => status === 'Action Required').length,
  }), [applications])

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Owner'

  return (
    <div className="owner-app-shell">
      <a className="skip-link" href="#owner-main">Skip to main content</a>
      <aside className="owner-sidebar" aria-label="Owner navigation">
        <div className="owner-brand">
          <img src="/assets/images/logo2.png" alt="" width="46" height="46" />
          <span><small>BARANGAY NAPINDAN</small><strong>ILoveTaguig ECS</strong></span>
        </div>
        <nav>
          <a className="active" href="/owner" aria-current="page"><LayoutDashboard size={19} /> Dashboard</a>
          <Link to="/owner/applications/new"><FilePlus2 size={19} /> New Application</Link>
          <span className="owner-nav-upcoming"><History size={19} /> History <small>Next</small></span>
        </nav>
        <div className="owner-sidebar-foot">
          <div className="owner-avatar" aria-hidden="true">{firstName.charAt(0).toUpperCase()}</div>
          <div><strong>{profile?.full_name}</strong><span>Business Owner</span></div>
          <button type="button" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="owner-main" id="owner-main">
        <header className="owner-mobile-header">
          <div className="owner-brand"><img src="/assets/images/logo2.png" alt="" width="40" height="40" /><strong>ILoveTaguig ECS</strong></div>
          <button type="button" onClick={signOut} aria-label="Sign out"><LogOut size={19} /></button>
        </header>

        <section className="owner-hero">
          <div><p>OWNER DASHBOARD</p><h1>Good day, {firstName}.</h1><span>Track your clearance requests and see what needs your attention.</span></div>
          <Link className="owner-primary-action" to="/owner/applications/new">
            New Application <span><ArrowRight size={17} /></span>
          </Link>
        </section>

        <section className="owner-stat-grid" aria-label="Application summary">
          <article><div className="owner-stat-icon teal"><Clock3 size={21} /></div><span>Active Applications</span><strong>{loading ? '—' : stats.active}</strong><small>Currently in process</small></article>
          <article><div className="owner-stat-icon green"><CheckCircle2 size={21} /></div><span>Total Approved</span><strong>{loading ? '—' : stats.approved}</strong><small>Approved and completed</small></article>
          <article><div className="owner-stat-icon orange"><AlertCircle size={21} /></div><span>Action Required</span><strong>{loading ? '—' : stats.actionRequired}</strong><small>{stats.actionRequired ? 'Review barangay remarks' : 'Nothing needs attention'}</small></article>
        </section>

        <section className="owner-list-shell">
          <div className="owner-list-core">
            <div className="owner-list-heading">
              <div><h2>Recent applications</h2><p>Your latest business clearance requests.</p></div>
              <button type="button" onClick={loadApplications} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button>
            </div>

            {error && <div className="owner-inline-error" role="alert"><AlertCircle size={18} /> <span>{error}</span><button type="button" onClick={loadApplications}>Try again</button></div>}
            {!error && loading && <div className="owner-list-state"><span className="owner-loader" /> Loading your applications…</div>}
            {!error && !loading && applications.length === 0 && (
              <div className="owner-empty-state"><div><FilePlus2 size={26} /></div><h3>No applications yet</h3><p>Your submitted clearance requests will appear here.</p></div>
            )}
            {!error && !loading && applications.length > 0 && (
              <div className="owner-table-wrap">
                <table>
                  <thead><tr><th>Application</th><th>Type</th><th>Date submitted</th><th>Status</th></tr></thead>
                  <tbody>{applications.slice(0, 6).map((application) => (
                    <tr key={application.id} onClick={() => { window.location.href = `/owner/applications/${application.id}` }} className="owner-table-link-row">
                      <td><strong>{application.business_name}</strong><span>#{application.id.slice(0, 8).toUpperCase()}</span></td>
                      <td>{application.application_type}</td>
                      <td>{formatDate(application.created_at)}</td>
                      <td><StatusBadge status={application.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
