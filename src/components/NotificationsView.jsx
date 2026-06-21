import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Trash2, 
  Check, 
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function formatRelativeTime(dateString) {
  const diffMs = new Date() - new Date(dateString)
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString))
}

export default function NotificationsView({ 
  user, 
  applications = [], 
  onSelectApplication,
  onRefreshUnreadCount 
}) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All')
  const [actionLoading, setActionLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotifications(data ?? [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Notifications could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const triggerRefreshUnread = () => {
    if (onRefreshUnreadCount) {
      onRefreshUnreadCount()
    }
  }

  const markAsRead = async (id) => {
    try {
      const { error: patchError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
      
      if (patchError) throw patchError
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      triggerRefreshUnread()
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const deleteNotification = async (id, e) => {
    e.stopPropagation() // Prevent triggering card click
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      setNotifications(prev => prev.filter(n => n.id !== id))
      triggerRefreshUnread()
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const markAllAsRead = async () => {
    if (notifications.filter(n => !n.is_read).length === 0) return
    setActionLoading(true)
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) throw updateError
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      triggerRefreshUnread()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return
    if (!confirm('Are you sure you want to clear all notifications? This cannot be undone.')) return
    setActionLoading(true)
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError
      
      setNotifications([])
      triggerRefreshUnread()
    } catch (err) {
      console.error('Error clearing notifications:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id)
    }

    if (notif.reference_id && onSelectApplication) {
      const matchedApp = applications.find(a => a.id === notif.reference_id)
      if (matchedApp) {
        onSelectApplication(matchedApp)
      } else {
        // Fetch from Supabase directly in case it's not in the passed list
        try {
          const { data, error: appError } = await supabase
            .from('applications')
            .select('id, reference_no, owner_full_name, business_name, nature_of_business, ownership_type, application_type, contact_number, business_address, status, remarks, created_at, updated_at')
            .eq('id', notif.reference_id)
            .single()
          
          if (data && !appError) {
            onSelectApplication(data)
          }
        } catch (err) {
          console.error('Failed to resolve application redirect:', err)
        }
      }
    }
  }

  // Filter options count
  const counts = useMemo(() => {
    const unread = notifications.filter(n => !n.is_read).length
    const system = notifications.filter(n => !n.reference_id).length
    const apps = notifications.filter(n => n.reference_id).length
    return { all: notifications.length, unread, system, apps }
  }, [notifications])

  // Filter logic
  const filteredNotifs = useMemo(() => {
    return notifications.filter(notif => {
      if (filter === 'Unread') return !notif.is_read
      if (filter === 'System Updates') return !notif.reference_id
      if (filter === 'Applications') return !!notif.reference_id
      return true
    })
  }, [notifications, filter])

  // Timeframe grouping logic
  const groupedNotifications = useMemo(() => {
    const today = []
    const yesterday = []
    const earlier = []
    
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    yesterdayDate.setHours(0, 0, 0, 0)

    filteredNotifs.forEach(notif => {
      const notifDate = new Date(notif.created_at)
      notifDate.setHours(0, 0, 0, 0)
      
      if (notifDate.getTime() === todayDate.getTime()) {
        today.push(notif)
      } else if (notifDate.getTime() === yesterdayDate.getTime()) {
        yesterday.push(notif)
      } else {
        earlier.push(notif)
      }
    })

    return { today, yesterday, earlier }
  }, [filteredNotifs])

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-teal" size={18} />
      case 'warning':
        return <AlertTriangle className="text-orange" size={18} />
      case 'error':
        return <XCircle className="text-red" size={18} />
      default:
        return <Info className="text-blue" size={18} />
    }
  }

  const getIconBgClass = (type) => {
    switch (type) {
      case 'success':
        return 'bg-teal-light'
      case 'warning':
        return 'bg-orange-light'
      case 'error':
        return 'bg-red-light'
      default:
        return 'bg-blue-light'
    }
  }

  if (loading) {
    return (
      <div className="notifications-loading-container">
        <RefreshCw className="spinner" size={24} />
        <p>Loading your notifications...</p>
      </div>
    )
  }

  return (
    <div className="figma-notifications-container">
      {/* 1. Header Breadcrumbs & Serif Title */}
      <header className="notifications-header-section">
        <div className="header-left-col">
          <nav className="breadcrumbs-nav" aria-label="Breadcrumb navigation">
            <span className="crumb-item">Dashboard</span>
            <span className="crumb-divider">/</span>
            <span className="crumb-item active">Notifications</span>
          </nav>
          
          <div className="serif-title-row">
            <h2 className="title-text-normal">Your </h2>
            <h2 className="title-text-italic">Notifications</h2>
          </div>
          
          <p className="notifications-subtitle">
            Manage your real-time application updates and announcements.
          </p>
        </div>
        
        <div className="header-actions">
          <button 
            type="button" 
            className="mark-read-btn" 
            onClick={markAllAsRead}
            disabled={counts.unread === 0 || actionLoading}
          >
            <Check size={14} />
            <span>Mark all as read</span>
          </button>
          <button 
            type="button" 
            className="clear-all-btn" 
            onClick={clearAllNotifications}
            disabled={counts.all === 0 || actionLoading}
          >
            <Trash2 size={14} />
            <span>Clear all</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="owner-inline-error" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={loadNotifications}>Try again</button>
        </div>
      )}

      {/* 2. Filter Toolbar */}
      <section className="notifications-toolbar-section">
        <div className="toolbar-filters-scroll" aria-label="Filter notifications">
          <button
            type="button"
            className={`filter-pill-btn ${filter === 'All' ? 'active' : ''}`}
            onClick={() => setFilter('All')}
          >
            All
            <span className="filter-pill-badge">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filter === 'Unread' ? 'active' : ''}`}
            onClick={() => setFilter('Unread')}
          >
            Unread
            <span className="filter-pill-badge">{counts.unread}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filter === 'System Updates' ? 'active' : ''}`}
            onClick={() => setFilter('System Updates')}
          >
            System Updates
            <span className="filter-pill-badge">{counts.system}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filter === 'Applications' ? 'active' : ''}`}
            onClick={() => setFilter('Applications')}
          >
            Applications
            <span className="filter-pill-badge">{counts.apps}</span>
          </button>
        </div>
      </section>

      {/* 3. Notifications List */}
      <section className="notifications-list-card">
        {filteredNotifs.length === 0 ? (
          <div className="notifications-empty-state">
            <div className="empty-icon-circle">
              <Bell size={28} />
            </div>
            <h3>No notifications here</h3>
            <p>
              {filter === 'Unread' 
                ? "You've read all your notifications! Good job." 
                : `No notifications found matching your "${filter}" filter.`}
            </p>
          </div>
        ) : (
          <div className="notifications-timeframe-container">
            {/* Today Timeframe */}
            {groupedNotifications.today.length > 0 && (
              <div className="timeframe-group">
                <h4 className="timeframe-title">Today</h4>
                <div className="timeframe-list">
                  {groupedNotifications.today.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notification-item-row ${!notif.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notif-left-side">
                        <div className={`notif-icon-box ${getIconBgClass(notif.type)}`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="notif-text-content">
                          <div className="notif-title-row">
                            <h5 className="notif-title">{notif.title}</h5>
                            {!notif.is_read && <span className="notif-unread-dot" />}
                          </div>
                          <p className="notif-message">{notif.message}</p>
                          <time className="notif-time">{formatRelativeTime(notif.created_at)}</time>
                        </div>
                      </div>
                      <div className="notif-actions">
                        {notif.reference_id && (
                          <div className="notif-go-icon">
                            <ArrowRight size={16} />
                          </div>
                        )}
                        <button 
                          className="notif-delete-btn" 
                          onClick={(e) => deleteNotification(notif.id, e)}
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday Timeframe */}
            {groupedNotifications.yesterday.length > 0 && (
              <div className="timeframe-group">
                <h4 className="timeframe-title">Yesterday</h4>
                <div className="timeframe-list">
                  {groupedNotifications.yesterday.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notification-item-row ${!notif.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notif-left-side">
                        <div className={`notif-icon-box ${getIconBgClass(notif.type)}`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="notif-text-content">
                          <div className="notif-title-row">
                            <h5 className="notif-title">{notif.title}</h5>
                            {!notif.is_read && <span className="notif-unread-dot" />}
                          </div>
                          <p className="notif-message">{notif.message}</p>
                          <time className="notif-time">{formatRelativeTime(notif.created_at)}</time>
                        </div>
                      </div>
                      <div className="notif-actions">
                        {notif.reference_id && (
                          <div className="notif-go-icon">
                            <ArrowRight size={16} />
                          </div>
                        )}
                        <button 
                          className="notif-delete-btn" 
                          onClick={(e) => deleteNotification(notif.id, e)}
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earlier Timeframe */}
            {groupedNotifications.earlier.length > 0 && (
              <div className="timeframe-group">
                <h4 className="timeframe-title">Earlier</h4>
                <div className="timeframe-list">
                  {groupedNotifications.earlier.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notification-item-row ${!notif.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notif-left-side">
                        <div className={`notif-icon-box ${getIconBgClass(notif.type)}`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="notif-text-content">
                          <div className="notif-title-row">
                            <h5 className="notif-title">{notif.title}</h5>
                            {!notif.is_read && <span className="notif-unread-dot" />}
                          </div>
                          <p className="notif-message">{notif.message}</p>
                          <time className="notif-time">{formatRelativeTime(notif.created_at)}</time>
                        </div>
                      </div>
                      <div className="notif-actions">
                        {notif.reference_id && (
                          <div className="notif-go-icon">
                            <ArrowRight size={16} />
                          </div>
                        )}
                        <button 
                          className="notif-delete-btn" 
                          onClick={(e) => deleteNotification(notif.id, e)}
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
