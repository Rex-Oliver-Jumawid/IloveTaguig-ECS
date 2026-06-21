import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, FileText } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ApplicationStatusPage() {
  const { applicationId } = useParams()
  const location = useLocation()
  const [application, setApplication] = useState(null)
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [applicationResult, documentsResult] = await Promise.all([
        supabase.from('applications').select('id, business_name, application_type, ownership_type, nature_of_business, business_address, contact_number, status, remarks, created_at').eq('id', applicationId).single(),
        supabase.from('application_documents').select('id, file_name, mime_type, file_size').eq('application_id', applicationId).order('created_at'),
      ])
      if (applicationResult.error) setError('This application could not be found or you do not have access to it.')
      else { setApplication(applicationResult.data); setDocuments(documentsResult.data ?? []) }
    }
    load()
  }, [applicationId])

  if (error) return <main className="application-status-page"><div className="application-status-card"><h1>Application unavailable</h1><p>{error}</p><Link to="/owner">Return to dashboard</Link></div></main>
  if (!application) return <main className="application-status-page"><div className="application-status-card"><p>Loading application…</p></div></main>

  const statusClass = application.status.toLowerCase().replaceAll(' ', '-')

  return <main className="application-status-page"><div className="application-status-wrap"><Link className="application-back" to="/owner"><ArrowLeft size={18} /> Dashboard</Link>{location.state?.submitted && <div className="application-success"><CheckCircle2 size={20} /><span><strong>Application submitted</strong>Your request is now in the barangay review queue.</span></div>}<section className="application-status-card"><div className="application-status-head"><div><p>APPLICATION #{application.id.slice(0, 8).toUpperCase()}</p><h1>{application.business_name}</h1><span>Submitted {new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' }).format(new Date(application.created_at))}</span></div><span className={`owner-status owner-status--${statusClass}`}><Clock3 size={14} /> {application.status}</span></div><div className="application-status-grid"><div><span>Application type</span><strong>{application.application_type}</strong></div><div><span>Ownership</span><strong>{application.ownership_type}</strong></div><div><span>Nature of business</span><strong>{application.nature_of_business}</strong></div><div><span>Contact number</span><strong>{application.contact_number}</strong></div><div className="wide"><span>Registered address</span><strong>{application.business_address}</strong></div></div><div className="application-document-summary"><h2>Supporting documents</h2>{documents.map((document) => <div key={document.id}><FileText size={18} /><span>{document.file_name}</span><small>{(document.file_size / 1024 / 1024).toFixed(2)} MB</small></div>)}</div></section></div></main>
}
