import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Home, 
  FileText, 
  Award, 
  History, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  Menu, 
  Info,
  CheckCircle,
  AlertTriangle,
  PanelLeft
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import ApplicationStatusView from '../components/ApplicationStatusView'
import SettingsView from '../components/SettingsView'

export default function OwnerDashboardPage() {
  const { profile, user, signOut } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isAlertDismissed, setIsAlertDismissed] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [infoModalMsg, setInfoModalMsg] = useState('')

  const [activeTab, setActiveTab] = useState('dashboard')
  const [recentAppDocs, setRecentAppDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [viewingApp, setViewingApp] = useState(null)

  const currentActiveApp = viewingApp || applications[0]

  useEffect(() => {
    const loadAppDocs = async () => {
      if (!currentActiveApp) return
      setDocsLoading(true)
      setDocsError('')
      const { data, error } = await supabase
        .from('application_documents')
        .select('id, storage_path, file_name, mime_type, file_size')
        .eq('application_id', currentActiveApp.id)
        .order('created_at')
      if (error) {
        setDocsError('Supporting documents could not be loaded.')
      } else {
        setRecentAppDocs(data ?? [])
      }
      setDocsLoading(false)
    }
    loadAppDocs()
  }, [currentActiveApp])

  // Current Date formatting

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  const loadApplications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('applications')
      .select('id, reference_no, owner_full_name, business_name, nature_of_business, ownership_type, application_type, contact_number, business_address, status, remarks, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      setApplications([])
      setLoadError('Applications could not be loaded. Check your connection and try again.')
    } else {
      setApplications(data ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { loadApplications() }, [loadApplications])

  // Filter applications by search query
  const filteredApps = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return applications

    return applications.filter(app => {
      const refNo = (app.reference_no ?? '').toLowerCase()
      const busName = (app.business_name ?? '').toLowerCase()
      const appType = (app.application_type ?? '').toLowerCase()
      const nature = (app.nature_of_business ?? '').toLowerCase()

      return (
        refNo.includes(query) || 
        busName.includes(query) || 
        appType.includes(query) || 
        nature.includes(query)
      )
    })
  }, [applications, searchQuery])

  // Aggregate stats
  const stats = useMemo(() => {
    let active = 0
    let approved = 0
    let actionRequired = 0

    applications.forEach(app => {
      const status = app.status
      if (status === 'Action Required') {
        actionRequired++
        active++
      } else if (status === 'Pending Review' || status === 'Proceed to Barangay Hall') {
        active++
      } else if (status === 'Approved' || status === 'Complete') {
        approved++
      }
    })

    return { active, approved, actionRequired }
  }, [applications])

  // Calculate status frequencies for progress bars
  const statusSummary = useMemo(() => {
    let pending = 0
    let action = 0
    let ready = 0
    let approved = 0

    applications.forEach(app => {
      const status = app.status
      if (status === 'Pending Review') pending++
      else if (status === 'Action Required') action++
      else if (status === 'Proceed to Barangay Hall') ready++
      else if (status === 'Approved' || status === 'Complete') approved++
    })

    const total = applications.length || 1
    return {
      pending: { count: pending, percent: (pending / total) * 100 },
      action: { count: action, percent: (action / total) * 100 },
      ready: { count: ready, percent: (ready / total) * 100 },
      approved: { count: approved, percent: (approved / total) * 100 }
    }
  }, [applications])

  // Find first application requiring action to display in the alert widget
  const actionRequiredApp = useMemo(() => {
    return applications.find(app => app.status === 'Action Required')
  }, [applications])

  // Show detailed modal
  const handleViewApp = (app) => {
    setSelectedApp(app)
  }

  // Trigger alert wizard mock click
  const triggerWizard = () => {
    setInfoModalMsg('📝 New Application Wizard:\nPreparing the Barangay Business Clearance Application Form...\nThis submission system is part of Phase 2.')
    setInfoModalOpen(true)
  }

  const triggerTrack = () => {
    setInfoModalMsg('🔍 Track Status:\nYour clearance applications are listed directly in the table with real-time updates from Napindan officers.')
    setInfoModalOpen(true)
  }

  const triggerHistory = () => {
    setInfoModalMsg('📅 View History:\nAll completed and archived certifications from previous years will display in the History module.')
    setInfoModalOpen(true)
  }

  const ownerInitials = useMemo(() => {
    if (profile?.initials) return profile.initials
    const name = profile?.full_name || user?.email || 'User'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }, [profile, user])

  const ownerName = profile?.full_name || user?.email?.split('@')[0] || 'Business Owner'

  if (loading) {
    return (
      <main className="loading-screen" id="main-content">
        <RefreshCw className="spinner" size={30} aria-hidden="true" />
        <p role="status" aria-live="polite">Loading dashboard data...</p>
      </main>
    )
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
                <a
                  href="#dashboard"
                  className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveTab('dashboard')
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? "Dashboard" : undefined}
                >
                  <Home className="nav-icon" />
                  {!isSidebarMinimized && <span>Dashboard</span>}
                </a>
              </li>
              <li>
                <a
                  href="#applications"
                  className={`nav-link ${activeTab === 'applications' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveTab('applications')
                    setViewingApp(null) // reset to most recent
                    setIsMobileSidebarOpen(false)
                  }}
                  title={isSidebarMinimized ? "Applications" : undefined}
                >
                  <FileText className="nav-icon" />
                  {!isSidebarMinimized && (
                    <>
                      <span>Applications</span>
                      <span className="nav-badge">{applications.length}</span>
                    </>
                  )}
                </a>
              </li>
              <li>
                <a href="#certifications" className="nav-link" onClick={triggerHistory} title={isSidebarMinimized ? "Certifications" : undefined}>
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
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                  title={isSidebarMinimized ? "Settings" : undefined}
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                >
                  <Settings className="nav-icon" />
                  {!isSidebarMinimized && <span>Settings</span>}
                </button>
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
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                id="search-bar" 
                placeholder="Search applications by ID or business name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>


          <div className="topbar-actions">
            <button className="icon-btn-round notification-btn" aria-label="Notifications" onClick={() => {
              setInfoModalMsg('🔔 Notifications:\nNo unread announcements. You will receive updates here as officers review your Clearance documents.')
              setInfoModalOpen(true)
            }}>
              <Bell />
              <span className="notification-badge"></span>
            </button>
            
            <button className="icon-btn-round" aria-label="Settings" onClick={() => setActiveTab('settings')}>
              <Settings />
            </button>
            
            <div className="user-avatar-badge">{ownerInitials}</div>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <>
            {/* Welcome Section */}
            <section className="welcome-section">
              <div className="welcome-text">
                <h2>Welcome back, <span className="welcome-highlight">{ownerName}!</span></h2>
                <p>Here is the status of your business certifications and clearance applications.</p>
              </div>
              <div className="welcome-meta">
                <span className="meta-date">{currentDateFormatted}</span>
                <span className="meta-location">Barangay Napindan, Taguig City</span>
              </div>
            </section>

            {/* Overview Stat Cards */}
            <section className="overview-grid" aria-label="Status overview cards">
              <div className="overview-card active-card">
                <div className="card-top">
                  <div className="card-icon-wrapper">
                    <FileText />
                  </div>
                  <span className="status-pill-subtle active-status">Active</span>
                </div>
                <div className="card-body">
                  <h3>{stats.active}</h3>
                  <p>Active Applications</p>
                </div>
              </div>

              <div className="overview-card approved-card">
                <div className="card-top">
                  <div className="card-icon-wrapper">
                    <Award />
                  </div>
                  <span className="status-pill-subtle approved-status">All time</span>
                </div>
                <div className="card-body">
                  <h3>{stats.approved}</h3>
                  <p>Total Approved</p>
                </div>
              </div>

              <div className="overview-card alert-card">
                <div className="card-top">
                  <div className="card-icon-wrapper">
                    <AlertTriangle />
                  </div>
                  <span className="status-pill-subtle alert-status">Needs action</span>
                </div>
                <div className="card-body">
                  <h3>{stats.actionRequired}</h3>
                  <p>Action Required</p>
                </div>
              </div>
            </section>

            {/* Main Grid: Table & Widgets */}
            <div className="main-layout-grid">
              
              {/* Applications Table */}
              <section className="grid-table-container">
                <div className="content-card">
                  <header className="card-header">
                    <div className="card-header-title">
                      <span className="title-indicator"></span>
                      <h3>RECENT APPLICATIONS</h3>
                    </div>
                  </header>

                  <div className="table-responsive-wrapper">
                    {loadError && <div className="owner-inline-error dashboard-load-error" role="alert"><AlertTriangle size={18} /><span>{loadError}</span><button type="button" onClick={loadApplications}>Try again</button></div>}
                    <table className="applications-table">
                      <thead>
                        <tr>
                          <th scope="col">APPLICATION ID</th>
                          <th scope="col">BUSINESS NAME</th>
                          <th scope="col">TYPE</th>
                          <th scope="col">STATUS</th>
                          <th scope="col" className="th-actions">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApps.map(app => {
                          let statusClass = 'status-orange'
                          if (app.status === 'Action Required' || app.status === 'Rejected') {
                            statusClass = 'status-red'
                          } else if (app.status === 'Proceed to Barangay Hall') {
                            statusClass = 'status-blue'
                          } else if (app.status === 'Approved' || app.status === 'Complete') {
                            statusClass = 'status-teal'
                          }

                          const statusText = app.status === 'Proceed to Barangay Hall' ? 'Ready for Claiming' : app.status

                          return (
                            <tr key={app.id} className="table-row">
                              <td>
                                <button 
                                  type="button" 
                                  className="app-id-badge" 
                                  onClick={() => handleViewApp(app)}
                                  title="Click to view details"
                                >
                                  {app.reference_no ?? `APP-${app.id.slice(0, 8).toUpperCase()}`}
                                </button>
                              </td>
                              <td>
                                <span className="app-type">{app.business_name}</span>
                              </td>
                              <td>
                                <span className="app-date">{app.application_type} ({app.nature_of_business})</span>
                              </td>
                              <td>
                                <span className={`status-pill ${statusClass}`}>
                                  <span className="status-dot"></span>
                                  <span>{statusText}</span>
                                </span>
                              </td>
                              <td className="td-actions">
                                <button 
                                  type="button" 
                                  className="action-view-btn" 
                                  onClick={() => handleViewApp(app)}
                                  aria-label={`View application details`}
                                >
                                  <Eye />
                                  <span>View</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    
                    {filteredApps.length === 0 && (
                      <div className="no-results">No matching clearance applications found.</div>
                    )}
                  </div>
                </div>
              </section>

              {/* Widget Panel */}
              <section className="grid-widgets-container">
                
                {/* Alert Banner Widget */}
                {actionRequiredApp && !isAlertDismissed && (
                  <div className="alert-widget">
                    <div className="widget-decor-bg"></div>
                    <div className="alert-header">
                      <h4 className="alert-title">Action Required on {actionRequiredApp.reference_no}</h4>
                      <button 
                        className="alert-dismiss-btn" 
                        onClick={() => setIsAlertDismissed(true)} 
                        aria-label="Dismiss Alert"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <p className="alert-desc">{actionRequiredApp.remarks}</p>
                    <button className="alert-cta-btn" onClick={() => handleViewApp(actionRequiredApp)}>
                      <RefreshCw className="btn-icon" size={14} />
                      <span>Update Application</span>
                    </button>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="content-card widget-card">
                  <header className="card-header border-bottom">
                    <div className="card-header-title">
                      <span className="title-indicator"></span>
                      <h4>QUICK ACTIONS</h4>
                    </div>
                  </header>
                  <div className="widget-content quick-actions-list">
                    <Link to="/owner/applications/new" className="quick-action-item active-action">
                      <div className="action-icon-wrapper">
                        <Plus />
                      </div>
                      <div className="action-text">
                        <h5>New Application</h5>
                        <p>Submit a clearance request</p>
                      </div>
                    </Link>

                    <button type="button" className="quick-action-item" onClick={() => {
                      setActiveTab('applications')
                      setViewingApp(null) // default to most recent
                    }}>
                      <div className="action-icon-wrapper">
                        <Search />
                      </div>
                      <div className="action-text">
                        <h5>Track Status</h5>
                        <p>Check clearance progress</p>
                      </div>
                    </button>

                    <button type="button" className="quick-action-item" onClick={triggerHistory}>
                      <div className="action-icon-wrapper">
                        <History />
                      </div>
                      <div className="action-text">
                        <h5>View History</h5>
                        <p>All past clearance records</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Status Summary Progress Bars */}
                <div className="content-card widget-card">
                  <header className="card-header border-bottom">
                    <div className="card-header-title">
                      <span className="title-indicator"></span>
                      <h4>STATUS SUMMARY</h4>
                    </div>
                  </header>
                  <div className="widget-content status-summary-list">
                    <div className="progress-item">
                      <div className="progress-header">
                        <div className="progress-title-row">
                          <span className="progress-dot dot-orange"></span>
                          <span className="progress-label">Pending Review</span>
                        </div>
                        <span className="progress-count">{statusSummary.pending.count}</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill fill-orange" style={{ width: `${statusSummary.pending.percent}%` }}></div>
                      </div>
                    </div>

                    <div className="progress-item">
                      <div className="progress-header">
                        <div className="progress-title-row">
                          <span className="progress-dot dot-red"></span>
                          <span className="progress-label">Action Required</span>
                        </div>
                        <span className="progress-count">{statusSummary.action.count}</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill fill-red" style={{ width: `${statusSummary.action.percent}%` }}></div>
                      </div>
                    </div>

                    <div className="progress-item">
                      <div className="progress-header">
                        <div className="progress-title-row">
                          <span className="progress-dot dot-blue"></span>
                          <span className="progress-label">Ready for Claiming</span>
                        </div>
                        <span className="progress-count">{statusSummary.ready.count}</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill fill-blue" style={{ width: `${statusSummary.ready.percent}%` }}></div>
                      </div>
                    </div>

                    <div className="progress-item">
                      <div className="progress-header">
                        <div className="progress-title-row">
                          <span className="progress-dot dot-teal"></span>
                          <span className="progress-label">Approved</span>
                        </div>
                        <span className="progress-count">{statusSummary.approved.count}</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill fill-teal" style={{ width: `${statusSummary.approved.percent}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

              </section>
            </div>
          </>
        ) : activeTab === 'settings' ? (
          <div className="owner-applications-tab-view" style={{ padding: '0 0 24px 0' }}>
            <SettingsView profile={profile} user={user} />
          </div>
        ) : (
          <div className="owner-applications-tab-view" style={{ padding: '0 0 24px 0' }}>
            {currentActiveApp ? (
              <ApplicationStatusView
                application={currentActiveApp}
                documents={recentAppDocs}
                onRefresh={loadApplications}
                user={user}
                onBack={() => setActiveTab('dashboard')}
                allApplications={applications}
                onSelectApplication={(app) => setViewingApp(app)}
              />
            ) : (
              <div className="owner-empty-state">
                <div>
                  <FileText size={24} />
                </div>
                <h3>No clearance applications found</h3>
                <p>Submit a new application to get started with your Barangay Business Clearance.</p>
                <Link to="/owner/applications/new" className="owner-primary-action" style={{ marginTop: '16px' }}>
                  NEW APPLICATION
                  <span>
                    <Plus className="btn-icon" size={16} />
                  </span>
                </Link>
              </div>
            )}
          </div>
        ) }

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-brand">ILoveTaguig ECS</div>
          <p className="footer-copyright">© 2026 City of Taguig. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Privacy Policy is being finalized.') }}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Service is being finalized.') }}>Terms of Service</a>
            <a href="#support" onClick={(e) => { e.preventDefault(); alert('Contact Barangay Napindan clearance desk: support@napindan.taguig.gov.ph') }}>Contact Support</a>
          </div>
        </footer>
      </main>

      {/* APPLICATION DETAIL MODAL */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-row">
                <span className="title-indicator"></span>
                <h4>Application Details</h4>
              </div>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setSelectedApp(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>
            
            <main className="modal-content-body">
              <div className="modal-detail-grid">
                <div className="modal-detail-item full-width">
                  <span className="detail-label">Application ID / Reference Number</span>
                  <span className="detail-value monospace-value">
                    {selectedApp.reference_no ?? `APP-${selectedApp.id.slice(0, 8).toUpperCase()}`}
                  </span>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Business Name</span>
                  <span className="detail-value">{selectedApp.business_name}</span>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Nature of Business</span>
                  <span className="detail-value">{selectedApp.nature_of_business}</span>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Ownership Type</span>
                  <span className="detail-value">{selectedApp.ownership_type}</span>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Application Type</span>
                  <span className="detail-value">{selectedApp.application_type}</span>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Contact Number</span>
                  <span className="detail-value">{selectedApp.contact_number}</span>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Date Submitted</span>
                  <span className="detail-value">
                    {new Date(selectedApp.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="modal-detail-item full-width">
                  <span className="detail-label">Business Address</span>
                  <span className="detail-value">{selectedApp.business_address}</span>
                </div>

                <div className="modal-detail-item full-width">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`status-pill ${
                      selectedApp.status === 'Action Required' || selectedApp.status === 'Rejected' ? 'status-red' : 
                      selectedApp.status === 'Proceed to Barangay Hall' ? 'status-blue' :
                      selectedApp.status === 'Approved' || selectedApp.status === 'Complete' ? 'status-teal' : 'status-orange'
                    }`}>
                      <span className="status-dot"></span>
                      <span>{selectedApp.status === 'Proceed to Barangay Hall' ? 'Ready for Claiming' : selectedApp.status}</span>
                    </span>
                  </span>
                </div>

                {selectedApp.remarks && (
                  <div className="modal-detail-item full-width remarks-item">
                    <span className="detail-label">Remarks / Reviewer Feedback</span>
                    <span className="detail-value remarks-value">{selectedApp.remarks}</span>
                  </div>
                )}
              </div>
            </main>
            
            <footer className="modal-footer">
              <button 
                type="button" 
                className="modal-action-btn primary-btn" 
                onClick={() => setSelectedApp(null)}
              >
                Close Details
              </button>
              <Link className="modal-action-btn primary-btn" to={`/owner/applications/${selectedApp.id}`} onClick={() => setSelectedApp(null)}>
                Open status page
              </Link>
            </footer>
          </div>
        </div>
      )}

      {/* INFORMATION NOTICE MODAL */}
      {infoModalOpen && (
        <div className="modal-overlay" onClick={() => setInfoModalOpen(false)}>
          <div className="modal-card info-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-row">
                <Info className="info-icon" size={18} />
                <h4>Notice</h4>
              </div>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setInfoModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>
            
            <main className="modal-content-body">
              <p className="notice-message">{infoModalMsg}</p>
            </main>
            
            <footer className="modal-footer">
              <button 
                type="button" 
                className="modal-action-btn primary-btn" 
                onClick={() => setInfoModalOpen(false)}
              >
                Got It
              </button>
            </footer>
          </div>
        </div>
      )}

    </div>
  )
}
