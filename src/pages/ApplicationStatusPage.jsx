import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import ApplicationStatusView from '../components/ApplicationStatusView'

export default function ApplicationStatusPage() {
  const { applicationId } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [application, setApplication] = useState(null)
  const [documents, setDocuments] = useState([])
  const [allApplications, setAllApplications] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [applicationResult, documentsResult, allAppsResult] = await Promise.all([
      supabase.from('applications')
        .select('id, owner_full_name, business_name, application_type, ownership_type, nature_of_business, business_address, contact_number, status, remarks, reference_no, created_at, updated_at')
        .eq('id', applicationId)
        .single(),
      supabase.from('application_documents')
        .select('id, storage_path, file_name, mime_type, file_size')
        .eq('application_id', applicationId)
        .order('created_at'),
      supabase.from('applications')
        .select('id, reference_no, business_name, status, created_at')
        .order('created_at', { ascending: false })
    ])
    
    if (applicationResult.error) {
      setError('This application could not be found or you do not have access to it.')
    } else {
      setApplication(applicationResult.data)
      setDocuments(documentsResult.data ?? [])
      setAllApplications(allAppsResult.data ?? [])
    }
  }, [applicationId])

  useEffect(() => { load() }, [load])

  if (error) {
    return (
      <main className="application-status-page">
        <div className="application-status-card">
          <h1>Application unavailable</h1>
          <p>{error}</p>
          <Link to="/owner">Return to dashboard</Link>
        </div>
      </main>
    )
  }

  if (!application) {
    return (
      <main className="application-status-page">
        <div className="application-status-card">
          <p>Loading application…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="application-status-page" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
      <div className="application-status-wrap" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <ApplicationStatusView
          application={application}
          documents={documents}
          onRefresh={load}
          user={user}
          onBack={() => navigate('/owner')}
          allApplications={allApplications}
          onSelectApplication={(app) => navigate(`/owner/applications/${app.id}`)}
        />
      </div>
    </main>
  )
}
