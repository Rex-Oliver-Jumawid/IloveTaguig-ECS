import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Eye,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  PanelLeft,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Users
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import NotificationsView from '../components/NotificationsView'
import SettingsView from '../components/SettingsView'
import HistoryView from '../components/HistoryView'
import OwnersView from '../components/OwnersView'
import PrintQueueView from '../components/PrintQueueView'

function getInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AdminDashboardPage({ initialTab = 'dashboard' }) {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [query, setQuery] = useState('')
  const [filterTab, setFilterTab] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [owners, setOwners] = useState([])
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState(null)

  const filteredApplicationsByOwner = useMemo(() => {
    if (!selectedOwnerFilter) return applications
    return applications.filter(app => app.owner_id === selectedOwnerFilter.id)
  }, [applications, selectedOwnerFilter])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Scroll main content to top on tab change
  useEffect(() => {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.scrollTop = 0
    }
  }, [activeTab])

  // Unread notification count loader
  const loadUnreadCount = useCallback(async () => {
    if (!user) return
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (!countError) {
      setUnreadNotificationsCount(count ?? 0)
    }
  }, [user])

  useEffect(() => {
    loadUnreadCount()
  }, [user, loadUnreadCount])

  // Realtime subscription for unread badge
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('admin-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { loadUnreadCount() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, loadUnreadCount])

  const pageSize = 5

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase.from('applications')
      .select('id, owner_id, owner_full_name, business_name, nature_of_business, ownership_type, application_type, contact_number, business_address, status, remarks, reference_no, approved_at, approved_by, clerk_initial, created_at, updated_at, verification_checklist')
      .order('created_at', { ascending: false })
    setApplications(data ?? [])
    setError(loadError ? 'The review queue could not be loaded.' : '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const loadOwners = useCallback(async () => {
    const { data, error: ownersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        initials,
        created_at,
        applications!applications_owner_id_fkey(id, status, business_name, created_at)
      `)
      .eq('role', 'owner')
      .order('created_at', { ascending: false })
    if (ownersError) {
      console.error('loadOwners error:', ownersError)
    }
    setOwners(data ?? [])
  }, [])

  useEffect(() => { loadOwners() }, [loadOwners])

  // Helper for printing a clearance PDF
  const handlePrint = async (app) => {
    navigate(`/admin/clearances/${app.id}`)
  }



  // Calculated Stats
  const stats = useMemo(() => {
    const pendingCount = applications.filter((item) => item.status === 'Pending Review').length
    const queueCount = applications.filter((item) => ['Approved', 'Proceed to Barangay Hall'].includes(item.status)).length

    const todayStr = new Date().toDateString()
    const approvedToday = applications.filter((item) =>
      ['Approved', 'Proceed to Barangay Hall', 'Complete'].includes(item.status) &&
      ((item.approved_at && new Date(item.approved_at).toDateString() === todayStr) ||
       (!item.approved_at && item.updated_at && new Date(item.updated_at).toDateString() === todayStr))
    ).length

    const approvedApps = applications.filter((item) => ['Approved', 'Proceed to Barangay Hall', 'Complete'].includes(item.status))
    const durations = approvedApps.map((item) => {
      const end = item.approved_at || item.updated_at
      return (new Date(end) - new Date(item.created_at)) / 86400000
    }).filter((value) => value >= 0)

    const avgTime = durations.length
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : '—'

    return {
      pending: pendingCount,
      approvedToday,
      queue: queueCount,
      average: avgTime,
      total: applications.length
    }
  }, [applications])

  // Count metrics for tabs and sidebar
  const counts = useMemo(() => {
    return {
      all: applications.filter(item => ['Pending Review', 'Action Required', 'Approved', 'Proceed to Barangay Hall'].includes(item.status)).length,
      pending: applications.filter(item => item.status === 'Pending Review').length,
      actionReq: applications.filter(item => item.status === 'Action Required').length,
      claiming: applications.filter(item => ['Approved', 'Proceed to Barangay Hall'].includes(item.status)).length,
      total: applications.length,
      uniqueApplicants: new Set(applications.map(item => item.owner_full_name)).size
    }
  }, [applications])

  // Filtered applications based on active tab and query
  const filteredApplications = useMemo(() => {
    return applications.filter(item => {
      if (filterTab === 'Pending' && item.status !== 'Pending Review') return false
      if (filterTab === 'Action Req.' && item.status !== 'Action Required') return false
      if (filterTab === 'Claiming' && !['Approved', 'Proceed to Barangay Hall'].includes(item.status)) return false
      if (filterTab === 'All' && !['Pending Review', 'Action Required', 'Approved', 'Proceed to Barangay Hall'].includes(item.status)) return false

      const needle = query.trim().toLowerCase()
      if (needle) {
        const nameMatch = item.owner_full_name?.toLowerCase().includes(needle)
        const businessMatch = item.business_name?.toLowerCase().includes(needle)
        const idMatch = item.id?.toLowerCase().includes(needle)
        if (!nameMatch && !businessMatch && !idMatch) return false
      }
      return true
    })
  }, [applications, filterTab, query])

  // Sorted list
  const sortedApplications = useMemo(() => {
    const list = [...filteredApplications]
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.owner_full_name || '').localeCompare(b.owner_full_name || ''))
    }
    return list
  }, [filteredApplications, sortBy])

  // Paginated list
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedApplications.slice(start, start + pageSize)
  }, [sortedApplications, currentPage])

  // Reset page when filter/query/sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterTab, query, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedApplications.length / pageSize))

  // Helpers for formatting statuses in table
  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending Review': return 'pending'
      case 'Action Required': return 'action-required'
      case 'Approved':
      case 'Proceed to Barangay Hall': return 'claiming'
      case 'Complete': return 'complete'
      default: return ''
    }
  }

  const getStatusLabel = (status) => {
    if (status === 'Proceed to Barangay Hall') return 'Ready for Claiming'
    return status
  }

  const formattedDate = useMemo(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return new Date().toLocaleDateString('en-US', options)
  }, [])

  const adminInitials = useMemo(() => {
    if (profile?.initials) return profile.initials
    const name = profile?.full_name || 'Admin Staff'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }, [profile])

  const adminName = profile?.full_name || 'Local Barangay Admin'

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
        <div className="mobile-avatar">{adminInitials}</div>
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

          {/* Navigation Links */}
          <nav className="sidebar-nav" aria-label="Sidebar navigation">
            <ul className="nav-list">
              <li>
                <Link
                  to="/admin"
                  className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('dashboard')
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? 'Dashboard' : undefined}
                >
                  <Home className="nav-icon" />
                  {!isSidebarMinimized && <span>Dashboard</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className={`nav-link ${activeTab === 'applications' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedOwnerFilter(null)
                    setActiveTab('applications')
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? 'Applications' : undefined}
                >
                  <FileText className="nav-icon" />
                  {!isSidebarMinimized && (
                    <>
                      <span>Applications</span>
                      <span className="nav-badge">{counts.total}</span>
                    </>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className={`nav-link ${activeTab === 'printqueue' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('printqueue')
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? 'Print Queue' : undefined}
                >
                  <Printer className="nav-icon" />
                  {!isSidebarMinimized && (
                    <>
                      <span>Print Queue</span>
                      <span className="nav-badge">{counts.claiming}</span>
                    </>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className={`nav-link ${activeTab === 'owners' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('owners')
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? 'Owners' : undefined}
                >
                  <Users className="nav-icon" />
                  {!isSidebarMinimized && (
                    <>
                      <span>Owners</span>
                      <span className="nav-badge">{owners.length}</span>
                    </>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('notifications')
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? 'Notifications' : undefined}
                >
                  <Bell className="nav-icon" />
                  {!isSidebarMinimized && (
                    <>
                      <span>Notifications</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="nav-badge">{unreadNotificationsCount}</span>
                      )}
                    </>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('settings')
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? 'Settings' : undefined}
                >
                  <Settings className="nav-icon" />
                  {!isSidebarMinimized && <span>Settings</span>}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer User Details */}
        <div className="sidebar-bottom">
          {!isSidebarMinimized && (
            <div className="user-profile-badge">
              <div className="avatar-circle">{adminInitials}</div>
              <div className="user-info">
                <span className="user-name" title={adminName}>{adminName}</span>
                <span className="user-role">Barangay Administrator</span>
              </div>
            </div>
          )}
          <button 
            className="logout-btn" 
            onClick={signOut}
            title={isSidebarMinimized ? 'Log Out' : undefined}
          >
            <LogOut className="btn-icon" size={16} />
            {!isSidebarMinimized && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="main-content" onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}>
        {/* Sticky Topbar */}
        <header className="top-bar">
          <div className="topbar-left">
            <button 
              type="button" 
              className="sidebar-toggle-btn-topbar" 
              onClick={() => setIsSidebarMinimized(prev => !prev)}
              aria-label={isSidebarMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
              title={isSidebarMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              <PanelLeft />
            </button>
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search applications by ID or business name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="topbar-actions">
            <span className="figma-admin-badge" style={{ marginRight: '8px' }}>
              <ShieldCheck size={14} />
              <span>ADMIN</span>
            </span>
            <button
              type="button"
              className={`icon-btn-round notification-btn ${activeTab === 'notifications' ? 'active' : ''}`}
              aria-label="Notifications"
              onClick={() => {
                setActiveTab('notifications')
                navigate('/admin')
              }}
            >
              <Bell />
              {unreadNotificationsCount > 0 && <span className="notification-badge"></span>}
            </button>
            <button type="button" className="icon-btn-round" aria-label="Help">
              <HelpCircle />
            </button>
            <div className="user-avatar-badge">{adminInitials}</div>
          </div>
        </header>

        {/* ── TAB CONTENT ── */}

        {/* Notifications Tab */}
        {activeTab === 'notifications' ? (
          <div className="owner-applications-tab-view" style={{ padding: '0 0 24px 0' }}>
            <NotificationsView
              user={user}
              applications={applications}
              onSelectApplication={(app) => {
                // For admin: navigate to the review page for the application
                navigate(`/admin/applications/${app.id}`)
              }}
              onRefreshUnreadCount={loadUnreadCount}
            />
          </div>

        ) : activeTab === 'settings' ? (
          <div className="owner-applications-tab-view" style={{ padding: '0 0 24px 0' }}>
            <SettingsView profile={profile} user={user} />
          </div>

        ) : activeTab === 'applications' ? (
          <div className="owner-applications-tab-view" style={{ padding: '0 0 24px 0' }}>
            <HistoryView
              applications={filteredApplicationsByOwner}
              headerTitle="Applications"
              headerSubtitle="Complete list of all Barangay Business Clearance applications."
              showApplicant={true}
              selectedOwnerFilter={selectedOwnerFilter}
              onClearOwnerFilter={() => setSelectedOwnerFilter(null)}
              onSelectApplication={(app) => {
                navigate(`/admin/applications/${app.id}`)
              }}
            />
          </div>

        ) : activeTab === 'owners' ? (
          <div className="owner-applications-tab-view" style={{ padding: '0 0 24px 0' }}>
            <OwnersView
              owners={owners}
              onViewApplications={(owner) => {
                setSelectedOwnerFilter(owner)
                setActiveTab('applications')
              }}
            />
          </div>

        ) : activeTab === 'printqueue' ? (
          <div className="owner-applications-tab-view" style={{ padding: '0 0 24px 0' }}>
            <PrintQueueView />
          </div>

        ) : (
          /* Dashboard / Applications / Pending / Print Queue / Applicants tabs */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* Dashboard Header */}
            <div className="figma-admin-dashboard-header">
              <div className="figma-admin-dashboard-title">
                <h1>Admin <em>Dashboard</em></h1>
                <p className="figma-admin-dashboard-subtitle">
                  Review and process business clearance requests — {formattedDate}
                </p>
              </div>
            </div>

            {/* Bento Layout Grid */}
            <div className="figma-admin-bento-layout">
              
              {/* Left Column (Stats + Table) */}
              <div className="figma-admin-left-col">
                {/* Metric Cards Grid */}
                <div className="figma-admin-stats-grid">
                  <div className="figma-admin-stat-card orange">
                    <div className="figma-admin-stat-header">
                      <div className="figma-admin-stat-icon-wrapper">
                        <Clock3 size={18} />
                      </div>
                      <span className="figma-admin-stat-label-badge">Needs Action</span>
                    </div>
                    <div className="figma-admin-stat-info">
                      <span className="figma-admin-stat-value">{stats.pending}</span>
                      <span className="figma-admin-stat-label">Total Pending</span>
                    </div>
                  </div>

                  <div className="figma-admin-stat-card teal">
                    <div className="figma-admin-stat-header">
                      <div className="figma-admin-stat-icon-wrapper">
                        <CheckCircle2 size={18} />
                      </div>
                      <span className="figma-admin-stat-label-badge">Today</span>
                    </div>
                    <div className="figma-admin-stat-info">
                      <span className="figma-admin-stat-value">{stats.approvedToday}</span>
                      <span className="figma-admin-stat-label">Approved Today</span>
                    </div>
                  </div>

                  <div className="figma-admin-stat-card blue">
                    <div className="figma-admin-stat-header">
                      <div className="figma-admin-stat-icon-wrapper">
                        <Printer size={18} />
                      </div>
                      <span className="figma-admin-stat-label-badge">In Queue</span>
                    </div>
                    <div className="figma-admin-stat-info">
                      <span className="figma-admin-stat-value">{stats.queue}</span>
                      <span className="figma-admin-stat-label">Ready to Print</span>
                    </div>
                  </div>

                  <div className="figma-admin-stat-card green">
                    <div className="figma-admin-stat-header">
                      <div className="figma-admin-stat-icon-wrapper">
                        <Clock size={18} />
                      </div>
                      <span className="figma-admin-stat-label-badge">Avg.</span>
                    </div>
                    <div className="figma-admin-stat-info">
                      <span className="figma-admin-stat-value">
                        {stats.average}
                        {stats.average !== '—' && <span>d</span>}
                      </span>
                      <span className="figma-admin-stat-label">Avg. Processing Time</span>
                    </div>
                  </div>
                </div>

                {/* Table Bento Card */}
                <div className="figma-admin-card">
                  <div className="figma-admin-table-header">
                    <div className="figma-admin-table-title-row">
                      <div className="figma-admin-table-title">
                        <h3>Pending Applications</h3>
                      </div>
                      <Link to="/admin" className="figma-admin-view-all-link">
                        <span>View All</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>

                    <div className="figma-admin-filter-bar">
                      <div className="figma-admin-tabs">
                        <button
                          type="button"
                          onClick={() => setFilterTab('All')}
                          className={`figma-admin-tab-btn ${filterTab === 'All' ? 'active' : ''}`}
                        >
                          All ({counts.all})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('Pending')}
                          className={`figma-admin-tab-btn ${filterTab === 'Pending' ? 'active' : ''}`}
                        >
                          Pending ({counts.pending})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('Action Req.')}
                          className={`figma-admin-tab-btn ${filterTab === 'Action Req.' ? 'active' : ''}`}
                        >
                          Action Req. ({counts.actionReq})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('Claiming')}
                          className={`figma-admin-tab-btn ${filterTab === 'Claiming' ? 'active' : ''}`}
                        >
                          Claiming ({counts.claiming})
                        </button>
                      </div>

                      <div className="figma-admin-search-sort-bar">
                        <div className="figma-admin-table-search">
                          <Search size={14} />
                          <input
                            type="text"
                            placeholder="Search applicant..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="figma-admin-table-search-input"
                          />
                        </div>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="figma-admin-sort-select"
                          aria-label="Sort applications"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="name">Applicant Name</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Table Content */}
                  {loading ? (
                    <p className="admin-empty">Loading applications…</p>
                  ) : error ? (
                    <p className="admin-error">{error}</p>
                  ) : sortedApplications.length === 0 ? (
                    <p className="admin-empty">No pending applications match these filters.</p>
                  ) : (
                    <>
                      <div className="figma-admin-table-wrap">
                        <table className="figma-admin-table">
                          <thead>
                            <tr>
                              <th>Applicant</th>
                              <th>App ID</th>
                              <th>Business Type</th>
                              <th>Submitted</th>
                              <th>Status</th>
                              <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedApplications.map((item) => (
                              <tr key={item.id}>
                                <td>
                                  <div className="figma-admin-applicant-cell">
                                    <div className="figma-admin-applicant-avatar">
                                      {getInitials(item.owner_full_name)}
                                    </div>
                                    <div className="figma-admin-applicant-details">
                                      <span className="figma-admin-applicant-name">
                                        {item.owner_full_name}
                                      </span>
                                      <span className="figma-admin-applicant-business">
                                        {item.business_name}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <Link to={`/admin/applications/${item.id}`} className="figma-admin-appid-link">
                                    APP-{item.created_at ? new Date(item.created_at).getFullYear() : '2026'}-{item.id.slice(0, 4).toUpperCase()}
                                  </Link>
                                </td>
                                <td>{item.application_type || 'New'}</td>
                                <td>
                                  <div>{new Date(item.created_at).toLocaleDateString()}</div>
                                  <div className="figma-admin-time-subtext">
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>
                                <td>
                                  <span className={`figma-admin-status-pill ${getStatusClass(item.status)}`}>
                                    {getStatusLabel(item.status)}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="figma-admin-action-cell">
                                    <Link to={`/admin/applications/${item.id}`} className="figma-admin-table-action-btn">
                                      <Eye size={12} />
                                      <span>Review</span>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="figma-admin-pagination">
                        <div className="figma-admin-pagination-info">
                          Showing <strong>{sortedApplications.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong>-
                          <strong>{Math.min(currentPage * pageSize, sortedApplications.length)}</strong> of <strong>{sortedApplications.length}</strong> applications
                        </div>
                        <div className="figma-admin-pagination-nav">
                          <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="figma-admin-pagination-btn"
                            aria-label="Previous page"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setCurrentPage(i + 1)}
                              className={`figma-admin-pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="figma-admin-pagination-btn"
                            aria-label="Next page"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column sidebar widgets */}
              <div className="figma-admin-right-col">
                {/* Avg processing Card */}
                <div className="figma-admin-avg-card">
                  <div className="figma-admin-avg-card-glow"></div>
                  <h3>Avg. Processing Time</h3>
                  <div className="figma-admin-avg-card-value">
                    <span className="figma-admin-avg-card-number">{stats.average}</span>
                    <span className="figma-admin-avg-card-subtext">days this month</span>
                  </div>
                  <div className="figma-admin-avg-card-grid">
                    <div className="figma-admin-avg-card-col">
                      <span className="figma-admin-avg-card-col-value">{stats.approvedToday}</span>
                      <span className="figma-admin-avg-card-col-label">Approved today</span>
                    </div>
                    <div className="figma-admin-avg-card-col">
                      <span className="figma-admin-avg-card-col-value">{stats.pending}</span>
                      <span className="figma-admin-avg-card-col-label">Total pending</span>
                    </div>
                    <div className="figma-admin-avg-card-col">
                      <span className="figma-admin-avg-card-col-value">{stats.queue}</span>
                      <span className="figma-admin-avg-card-col-label">Print queue</span>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown Card */}
                <div className="figma-admin-card figma-admin-breakdown-card">
                  <h3>Status Breakdown</h3>
                  <div className="figma-admin-breakdown-list">
                    <div className="figma-admin-breakdown-item">
                      <div className="figma-admin-breakdown-label-wrapper">
                        <span className="figma-admin-breakdown-dot orange"></span>
                        <span className="figma-admin-breakdown-label">Pending Review</span>
                      </div>
                      <div className="figma-admin-breakdown-track">
                        <div
                          className="figma-admin-breakdown-bar orange"
                          style={{ width: `${counts.total > 0 ? (counts.pending / counts.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="figma-admin-breakdown-count">{counts.pending}</span>
                    </div>

                    <div className="figma-admin-breakdown-item">
                      <div className="figma-admin-breakdown-label-wrapper">
                        <span className="figma-admin-breakdown-dot red"></span>
                        <span className="figma-admin-breakdown-label">Action Required</span>
                      </div>
                      <div className="figma-admin-breakdown-track">
                        <div
                          className="figma-admin-breakdown-bar red"
                          style={{ width: `${counts.total > 0 ? (counts.actionReq / counts.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="figma-admin-breakdown-count">{counts.actionReq}</span>
                    </div>

                    <div className="figma-admin-breakdown-item">
                      <div className="figma-admin-breakdown-label-wrapper">
                        <span className="figma-admin-breakdown-dot blue"></span>
                        <span className="figma-admin-breakdown-label">Ready for Claiming</span>
                      </div>
                      <div className="figma-admin-breakdown-track">
                        <div
                          className="figma-admin-breakdown-bar blue"
                          style={{ width: `${counts.total > 0 ? (counts.claiming / counts.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="figma-admin-breakdown-count">{counts.claiming}</span>
                    </div>

                    <div className="figma-admin-breakdown-item" style={{ borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                      <div className="figma-admin-breakdown-label-wrapper">
                        <span className="figma-admin-breakdown-dot teal"></span>
                        <span className="figma-admin-breakdown-label">Approved (all time)</span>
                      </div>
                      <div className="figma-admin-breakdown-track">
                        <div
                          className="figma-admin-breakdown-bar teal"
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                      <span className="figma-admin-breakdown-count">
                        {applications.filter(item => ['Approved', 'Proceed to Barangay Hall', 'Complete'].includes(item.status)).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Card */}
                <div className="figma-admin-card figma-admin-breakdown-card figma-admin-quick-actions">
                  <h3>Quick Actions</h3>
                  <div className="figma-admin-action-list">
                    <button
                      type="button"
                      className="figma-admin-action-link"
                      style={{ background: 'transparent', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                      onClick={() => setActiveTab('printqueue')}
                    >
                      <div className="figma-admin-action-icon-box">
                        <Printer size={18} />
                      </div>
                      <div className="figma-admin-action-info">
                        <span className="figma-admin-action-title">Print Queue ({counts.claiming})</span>
                        <span className="figma-admin-action-desc">Clearances ready to print</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="figma-admin-action-link"
                      style={{ background: 'transparent', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                      onClick={() => setActiveTab('owners')}
                    >
                      <div className="figma-admin-action-icon-box">
                        <Users size={18} />
                      </div>
                      <div className="figma-admin-action-info">
                        <span className="figma-admin-action-title">Manage Applicants</span>
                        <span className="figma-admin-action-desc">View registered business owners</span>
                      </div>
                    </button>

                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <footer className="figma-admin-footer">
              <span className="figma-admin-footer-left">ILoveTaguig ECS</span>
              <span>© 2026 City of Taguig. All rights reserved.</span>
              <div className="figma-admin-footer-links">
                <Link to="/admin">Privacy Policy</Link>
                <Link to="/admin">Terms of Service</Link>
                <Link to="/admin">Contact Support</Link>
              </div>
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}
