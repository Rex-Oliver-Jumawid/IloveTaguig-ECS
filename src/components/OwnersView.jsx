import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
  ArrowRight
} from 'lucide-react'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function getInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function deriveOwnerStatus(applications = []) {
  if (!applications.length) return 'no-apps'
  const statuses = applications.map(a => a.status)
  if (statuses.some(s => s === 'Approved' || s === 'Complete')) return 'approved'
  if (statuses.some(s => s === 'Action Required')) return 'action-required'
  if (statuses.some(s => s === 'Pending Review')) return 'pending'
  if (statuses.every(s => s === 'Rejected')) return 'rejected'
  return 'pending'
}

function getLatestApplication(applications = []) {
  if (!applications.length) return null
  return [...applications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

const STATUS_META = {
  'approved':        { label: 'Approved',         cls: 'ow-badge-teal' },
  'pending':         { label: 'Pending Review',   cls: 'ow-badge-orange' },
  'action-required': { label: 'Action Required',  cls: 'ow-badge-red' },
  'rejected':        { label: 'Rejected',         cls: 'ow-badge-red' },
  'no-apps':         { label: 'No Applications',  cls: 'ow-badge-gray' },
}

export default function OwnersView({ owners = [], onViewApplications }) {
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const stats = useMemo(() => ({
    total: owners.length,
    active: owners.filter(o => (o.applications ?? []).some(a =>
      ['Pending Review', 'Action Required', 'Approved', 'Complete', 'Proceed to Barangay Hall'].includes(a.status)
    )).length,
    approved: owners.filter(o => (o.applications ?? []).some(a =>
      a.status === 'Approved' || a.status === 'Complete'
    )).length,
    pending: owners.filter(o => (o.applications ?? []).some(a =>
      a.status === 'Pending Review' || a.status === 'Action Required'
    )).length,
  }), [owners])

  const filterOptions = useMemo(() => [
    { id: 'All',             label: 'All',              count: owners.length },
    { id: 'approved',        label: 'Approved',         count: stats.approved },
    { id: 'pending',         label: 'Pending / Action', count: stats.pending },
    { id: 'no-apps',         label: 'No Applications',  count: owners.filter(o => !(o.applications ?? []).length).length },
  ], [owners, stats])

  const filtered = useMemo(() => {
    let result = [...owners]

    if (filter !== 'All') {
      result = result.filter(o => deriveOwnerStatus(o.applications) === filter)
    }

    const q = searchQuery.toLowerCase().trim()
    if (q) {
      result = result.filter(o => (o.full_name ?? '').toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      const da = new Date(a.created_at), db = new Date(b.created_at)
      return sortBy === 'newest' ? db - da : da - db
    })

    return result
  }, [owners, filter, searchQuery, sortBy])

  useEffect(() => { setCurrentPage(1) }, [filter, searchQuery, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage])

  return (
    <div className="figma-history-container">

      {/* Header */}
      <header className="history-header-section">
        <div className="header-left-col">
          <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
            <span className="crumb-item">Dashboard</span>
            <span className="crumb-divider">/</span>
            <span className="crumb-item active">Owners</span>
          </nav>
          <div className="serif-title-row">
            <h2 className="title-text-normal">Business </h2>
            <h2 className="title-text-italic">Owners</h2>
          </div>
          <p className="history-subtitle">
            All registered business owners and their application status.
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="history-stats-grid" aria-label="Owner statistics">
        <div className="stats-card-shell">
          <div className="stats-icon-box bg-slate">
            <Users size={18} className="text-slate" />
          </div>
          <div className="stats-content">
            <span className="stats-number">{stats.total}</span>
            <span className="stats-label">Total Owners</span>
          </div>
        </div>
        <div className="stats-card-shell">
          <div className="stats-icon-box bg-teal-light">
            <CheckCircle size={18} className="text-teal" />
          </div>
          <div className="stats-content">
            <span className="stats-number">{stats.approved}</span>
            <span className="stats-label">Approved</span>
          </div>
        </div>
        <div className="stats-card-shell">
          <div className="stats-icon-box bg-orange-light">
            <Clock size={18} className="text-orange" />
          </div>
          <div className="stats-content">
            <span className="stats-number">{stats.pending}</span>
            <span className="stats-label">Pending / Action</span>
          </div>
        </div>
        <div className="stats-card-shell">
          <div className="stats-icon-box bg-red-light">
            <XCircle size={18} className="text-red" />
          </div>
          <div className="stats-content">
            <span className="stats-number">{owners.filter(o => !(o.applications ?? []).length).length}</span>
            <span className="stats-label">No Applications</span>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="history-toolbar-section">
        <div className="toolbar-filters-scroll">
          {filterOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`filter-pill-btn ${filter === opt.id ? 'active' : ''}`}
              onClick={() => setFilter(opt.id)}
            >
              {opt.label}
              <span className="filter-pill-badge">{opt.count}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-controls">
          <div className="search-input-wrapper">
            <Search className="search-icon-svg" size={14} />
            <input
              type="text"
              className="search-input-core"
              placeholder="Search by owner name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search owners"
            />
          </div>
          <div className="sort-dropdown-wrapper">
            <select
              className="sort-select-core"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              aria-label="Sort owners"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown className="dropdown-arrow-svg" size={14} />
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="history-table-card">
        <div className="table-responsive-container ow-table-wrap">
          <table className="history-data-table ow-table">
            <thead>
              <tr>
                <th scope="col">OWNER</th>
                <th scope="col">APPS</th>
                <th scope="col">LATEST APPLICATION</th>
                <th scope="col">JOINED</th>
                <th scope="col">STATUS</th>
                <th scope="col">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-row">
                    <FileText size={24} className="empty-icon" />
                    <p>No owners found matching your filter.</p>
                  </td>
                </tr>
              ) : (
                paginated.map(owner => {
                  const apps = owner.applications ?? []
                  const latest = getLatestApplication(apps)
                  const ownerStatus = deriveOwnerStatus(apps)
                  const meta = STATUS_META[ownerStatus]

                  return (
                    <tr key={owner.id} className="history-table-row">
                      {/* Owner */}
                      <td>
                        <div className="ow-owner-cell">
                          <div className="ow-avatar">{getInitials(owner.full_name)}</div>
                          <div className="ow-owner-info">
                            <span className="ow-owner-name">{owner.full_name}</span>
                            <span className="ow-owner-id">ID: {owner.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                        </div>
                      </td>

                      {/* Application count */}
                      <td>
                        <div className="ow-count-cell">
                          <span className="ow-count-badge">{apps.length}</span>
                        </div>
                      </td>

                      {/* Latest application */}
                      <td>
                        {latest ? (
                          <div className="business-column-wrap">
                            <strong className="business-title">{latest.business_name}</strong>
                            <span className="business-nature">{formatDate(latest.created_at)}</span>
                          </div>
                        ) : (
                          <span className="ow-none-label">—</span>
                        )}
                      </td>

                      {/* Joined date */}
                      <td>
                        <span className="date-primary">{formatDate(owner.created_at)}</span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-badge-capsule ${meta.cls}`}>
                          <span className="badge-dot" />
                          {meta.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <button
                          type="button"
                          className="ow-action-btn"
                          onClick={() => onViewApplications && onViewApplications(owner)}
                          title="View this owner's applications"
                          disabled={!apps.length}
                        >
                          <span>View Apps</span>
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <footer className="history-table-pagination">
            <span className="pagination-count-label">
              Showing <strong>{Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filtered.length, currentPage * itemsPerPage)}</strong> of <strong>{filtered.length}</strong> owners
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="pagination-page-indicator">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>
  )
}
