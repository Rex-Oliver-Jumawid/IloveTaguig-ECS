import { useState, useMemo, useEffect } from 'react'
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  FileText,
  Calendar,
  ChevronDown
} from 'lucide-react'

// Formatting helpers
function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(value))
}

function calculateProcessingTime(app) {
  if (!app.approved_at) return '—'
  const diffMs = new Date(app.approved_at) - new Date(app.created_at)
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const finalDays = Math.max(1, diffDays)
  return finalDays === 1 ? '1 day' : `${finalDays} days`
}

export default function HistoryView({ applications = [], onSelectApplication }) {
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Stats computation
  const stats = useMemo(() => {
    let total = applications.length
    let approved = applications.filter(a => a.status === 'Approved' || a.status === 'Complete').length
    let pending = applications.filter(a => a.status === 'Pending Review' || a.status === 'Proceed to Barangay Hall' || a.status === 'Action Required').length
    let rejected = applications.filter(a => a.status === 'Rejected').length
    return { total, approved, pending, rejected }
  }, [applications])

  // Dynamic filter options with counts
  const filterOptions = useMemo(() => {
    return [
      { id: 'All', label: 'All', count: applications.length },
      { id: 'Approved', label: 'Approved', count: applications.filter(a => a.status === 'Approved' || a.status === 'Complete').length },
      { id: 'Pending', label: 'Pending', count: applications.filter(a => a.status === 'Pending Review' || a.status === 'Proceed to Barangay Hall').length },
      { id: 'Action Required', label: 'Action Required', count: applications.filter(a => a.status === 'Action Required').length },
      { id: 'Rejected', label: 'Rejected', count: applications.filter(a => a.status === 'Rejected').length }
    ]
  }, [applications])

  // Filter, search, and sort logic
  const filteredAndSortedApps = useMemo(() => {
    let result = [...applications]

    // 1. Status Filter
    if (filter !== 'All') {
      if (filter === 'Approved') {
        result = result.filter(a => a.status === 'Approved' || a.status === 'Complete')
      } else if (filter === 'Pending') {
        result = result.filter(a => a.status === 'Pending Review' || a.status === 'Proceed to Barangay Hall')
      } else {
        result = result.filter(a => a.status === filter)
      }
    }

    // 2. Search query
    const query = searchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter(app => {
        const refNo = (app.reference_no ?? '').toLowerCase()
        const busName = (app.business_name ?? '').toLowerCase()
        const idStr = `app-${app.id.slice(0, 8)}`.toLowerCase()
        return refNo.includes(query) || busName.includes(query) || idStr.includes(query)
      })
    }

    // 3. Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result;
  }, [applications, filter, searchQuery, sortBy])

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, searchQuery, sortBy])

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedApps.length / itemsPerPage))
  const paginatedApps = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedApps.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedApps, currentPage])

  // CSV Exporter
  const exportToCSV = () => {
    const headers = ['Application ID', 'Business Name', 'Type', 'Date Submitted', 'Date Processed', 'Processing Time', 'Status']
    const csvRows = filteredAndSortedApps.map(app => {
      const appID = app.reference_no ?? `APP-${app.id.slice(0, 8).toUpperCase()}`
      const dateSubmitted = formatDate(app.created_at) + ' ' + formatTime(app.created_at)
      const dateProcessed = app.approved_at ? formatDate(app.approved_at) + ' ' + formatTime(app.approved_at) : '—'
      const procTime = calculateProcessingTime(app)
      return [
        appID,
        app.business_name,
        app.application_type,
        dateSubmitted,
        dateProcessed,
        procTime,
        app.status
      ]
    })
    
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ecs_applications_history_${new Date().toISOString().slice(0,10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Row icon rendering
  const getRowIcon = (status) => {
    if (status === 'Approved' || status === 'Complete') {
      return (
        <div className="history-icon-circle bg-teal" aria-hidden="true">
          <CheckCircle size={16} className="text-teal" />
        </div>
      )
    }
    if (status === 'Rejected') {
      return (
        <div className="history-icon-circle bg-red" aria-hidden="true">
          <XCircle size={16} className="text-red" />
        </div>
      )
    }
    if (status === 'Action Required') {
      return (
        <div className="history-icon-circle bg-red-subtle" aria-hidden="true">
          <AlertTriangle size={16} className="text-red" />
        </div>
      )
    }
    // Pending Review, Proceed to Barangay Hall
    return (
      <div className="history-icon-circle bg-orange" aria-hidden="true">
        <Clock size={16} className="text-orange" />
      </div>
    )
  }

  // Status Badge Class
  const getStatusBadgeClass = (status) => {
    if (status === 'Approved' || status === 'Complete') return 'badge-teal'
    if (status === 'Proceed to Barangay Hall') return 'badge-blue'
    if (status === 'Action Required') return 'badge-red'
    if (status === 'Rejected') return 'badge-red-solid'
    return 'badge-orange'
  }

  const getStatusLabel = (status) => {
    if (status === 'Proceed to Barangay Hall') return 'Ready for Claiming'
    return status
  }

  return (
    <div className="figma-history-container">
      
      {/* 1. Header Breadcrumbs & Serif Title */}
      <header className="history-header-section">
        <div className="header-left-col">
          <nav className="breadcrumbs-nav" aria-label="Breadcrumb navigation">
            <span className="crumb-item">Dashboard</span>
            <span className="crumb-divider">/</span>
            <span className="crumb-item active">Application History</span>
          </nav>
          
          <div className="serif-title-row">
            <h2 className="title-text-normal">Application </h2>
            <h2 className="title-text-italic">History</h2>
          </div>
          
          <p className="history-subtitle">
            Complete record of all your Barangay Business Clearance requests.
          </p>
        </div>
        
        <button 
          type="button" 
          className="export-csv-btn" 
          onClick={exportToCSV}
          title="Export records to CSV file"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </header>

      {/* 2. Stats Bento Cards */}
      <section className="history-stats-grid" aria-label="Applications statistics">
        <div className="stats-card-shell">
          <div className="stats-icon-box bg-slate">
            <FileText size={18} className="text-slate" />
          </div>
          <div className="stats-content">
            <span className="stats-number">{stats.total}</span>
            <span className="stats-label">Total Applications</span>
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
            <span className="stats-label">Pending / In Progress</span>
          </div>
        </div>

        <div className="stats-card-shell">
          <div className="stats-icon-box bg-red-light">
            <XCircle size={18} className="text-red" />
          </div>
          <div className="stats-content">
            <span className="stats-number">{stats.rejected}</span>
            <span className="stats-label">Rejected</span>
          </div>
        </div>
      </section>

      {/* 3. Filter & Search Toolbar */}
      <section className="history-toolbar-section">
        <div className="toolbar-filters-scroll" aria-label="Filter history by status">
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
              placeholder="Filter by ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search applications"
            />
          </div>

          <div className="sort-dropdown-wrapper">
            <select
              className="sort-select-core"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort applications"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown className="dropdown-arrow-svg" size={14} />
          </div>
        </div>
      </section>

      {/* 4. Data Table Card */}
      <section className="history-table-card">
        <div className="table-responsive-container">
          <table className="history-data-table">
            <thead>
              <tr>
                <th scope="col">APPLICATION</th>
                <th scope="col">BUSINESS NAME</th>
                <th scope="col">DATE SUBMITTED</th>
                <th scope="col">DATE PROCESSED</th>
                <th scope="col">PROCESSING TIME</th>
                <th scope="col">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-row">
                    <FileText size={24} className="empty-icon" />
                    <p>No matching applications in history.</p>
                  </td>
                </tr>
              ) : (
                paginatedApps.map(app => {
                  const displayID = app.reference_no ?? `APP-${app.id.slice(0, 8).toUpperCase()}`
                  return (
                    <tr key={app.id} className="history-table-row">
                      {/* Column 1: Application ID */}
                      <td>
                        <div className="app-id-column-wrap">
                          {getRowIcon(app.status)}
                          <div className="app-id-text-wrap">
                            <button
                              type="button"
                              className="app-id-link-btn"
                              onClick={() => onSelectApplication(app)}
                              title="Track this application status"
                            >
                              {displayID}
                            </button>
                            <span className="app-type-label">{app.application_type} Business Clearance</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Business Name */}
                      <td>
                        <div className="business-column-wrap">
                          <strong className="business-title">{app.business_name}</strong>
                          <span className="business-nature">{app.nature_of_business}</span>
                        </div>
                      </td>

                      {/* Column 3: Date Submitted */}
                      <td>
                        <div className="date-column-wrap">
                          <time className="date-primary" dateTime={app.created_at}>{formatDate(app.created_at)}</time>
                          <time className="date-secondary">{formatTime(app.created_at)}</time>
                        </div>
                      </td>

                      {/* Column 4: Date Processed */}
                      <td>
                        <div className="date-column-wrap">
                          {app.approved_at ? (
                            <>
                              <time className="date-primary" dateTime={app.approved_at}>{formatDate(app.approved_at)}</time>
                              <time className="date-secondary">{formatTime(app.approved_at)}</time>
                            </>
                          ) : (
                            <span className="date-placeholder">—</span>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Processing Time */}
                      <td>
                        <div className="processing-column-wrap">
                          <span className="processing-value">{calculateProcessingTime(app)}</span>
                        </div>
                      </td>

                      {/* Column 6: Status & Inline Action Button */}
                      <td>
                        <div className="status-column-wrap">
                          <span className={`status-badge-capsule ${getStatusBadgeClass(app.status)}`}>
                            <span className="badge-dot" />
                            <span>{getStatusLabel(app.status)}</span>
                          </span>
                          
                          {app.status === 'Action Required' ? (
                            <button
                              type="button"
                              className="row-action-btn-update"
                              onClick={() => onSelectApplication(app)}
                              title="Update supporting documents"
                            >
                              Update
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="row-action-btn-view"
                              onClick={() => onSelectApplication(app)}
                              title="View application progress"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination controls */}
        {filteredAndSortedApps.length > 0 && (
          <footer className="history-table-pagination">
            <span className="pagination-count-label">
              Showing <strong>{Math.min(filteredAndSortedApps.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredAndSortedApps.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredAndSortedApps.length}</strong> applications
            </span>

            <div className="pagination-buttons">
              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="pagination-page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
