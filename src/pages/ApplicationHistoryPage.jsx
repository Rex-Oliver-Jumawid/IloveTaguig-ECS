import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, FileSearch, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FILTERS = ['All', 'Pending Review', 'Action Required', 'Approved', 'Proceed to Barangay Hall', 'Complete', 'Rejected']

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function StatusBadge({ status }) {
  const key = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`owner-status owner-status--${key}`}>{status}</span>
}

export default function ApplicationHistoryPage() {
  const [applications, setApplications] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadApplications = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('applications')
      .select('id, application_type, business_name, created_at, updated_at, status')
      .order('created_at', { ascending: false })
    if (queryError) setError('Application history could not be loaded. Try again.')
    else setApplications(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadApplications() }, [loadApplications])
  const visibleApplications = useMemo(() => filter === 'All' ? applications : applications.filter(({ status }) => status === filter), [applications, filter])

  return <main className="history-page"><div className="history-wrap">
    <Link className="application-back" to="/owner"><ArrowLeft size={18} /> Dashboard</Link>
    <header className="history-heading"><div><p>APPLICATION HISTORY</p><h1>Every request, in one place.</h1><span>Filter your applications by their current status.</span></div><button type="button" onClick={loadApplications} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button></header>
    <section className="owner-list-shell"><div className="owner-list-core">
      <div className="history-filters" aria-label="Filter applications by status">{FILTERS.map((item) => <button type="button" key={item} className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}<span>{item === 'All' ? applications.length : applications.filter(({ status }) => status === item).length}</span></button>)}</div>
      {error && <div className="owner-inline-error" role="alert"><AlertCircle size={18} /> <span>{error}</span><button type="button" onClick={loadApplications}>Try again</button></div>}
      {!error && loading && <div className="owner-list-state"><span className="owner-loader" /> Loading application history…</div>}
      {!error && !loading && visibleApplications.length === 0 && <div className="owner-empty-state"><div><FileSearch size={26} /></div><h3>No matching applications</h3><p>Choose another status to see your requests.</p></div>}
      {!error && !loading && visibleApplications.length > 0 && <div className="history-list">{visibleApplications.map((application) => <Link key={application.id} to={`/owner/applications/${application.id}`}><div><strong>{application.business_name}</strong><span>#{application.id.slice(0, 8).toUpperCase()} · {application.application_type}</span></div><time dateTime={application.created_at}>{formatDate(application.created_at)}</time><StatusBadge status={application.status} /></Link>)}</div>}
    </div></section>
  </div></main>
}
