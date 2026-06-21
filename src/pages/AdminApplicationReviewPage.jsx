import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FileCheck2, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

const checklistItems = [
  ['address_verified', 'Address is within Barangay Napindan'],
  ['identity_verified', 'Applicant identity document is valid'],
  ['documents_complete', 'Required supporting documents are complete'],
  ['records_clear', 'No conflicting barangay records found'],
]

export default function AdminApplicationReviewPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [documents, setDocuments] = useState([])
  const [checklist, setChecklist] = useState({})
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const [appResult, docsResult] = await Promise.all([
        supabase.from('applications').select('*').eq('id', applicationId).single(),
        supabase.from('application_documents').select('*').eq('application_id', applicationId).order('created_at'),
      ])
      if (!active) return
      if (appResult.error || docsResult.error) { setError('This application could not be loaded.'); return }
      setApplication(appResult.data)
      setRemarks(appResult.data.remarks ?? '')
      setChecklist(appResult.data.verification_checklist ?? {})
      const signed = await Promise.all((docsResult.data ?? []).map(async (document) => {
        const { data } = await supabase.storage.from('application-docs').createSignedUrl(document.storage_path, 300)
        return { ...document, signedUrl: data?.signedUrl }
      }))
      setDocuments(signed)
    }
    load()
    return () => { active = false }
  }, [applicationId])

  async function review(nextStatus) {
    if (nextStatus === 'Approved' && !checklistItems.every(([key]) => checklist[key])) {
      setError('Complete every verification check before approval.'); return
    }
    if (['Action Required', 'Rejected'].includes(nextStatus) && !remarks.trim()) {
      setError('Remarks are required for this action.'); return
    }
    setSaving(true); setError('')
    const { error: reviewError } = await supabase.rpc('review_application', { application_id: applicationId, next_status: nextStatus, admin_remarks: remarks, checklist })
    setSaving(false)
    if (reviewError) { setError(reviewError.message); return }
    navigate('/admin')
  }

  if (error && !application) return <main className="admin-main"><Link to="/admin">Back to dashboard</Link><p className="admin-error">{error}</p></main>
  if (!application) return <main className="admin-main"><p className="admin-empty">Loading secure review…</p></main>

  return <div className="admin-page"><header className="admin-header"><Link to="/admin" className="admin-brand"><ShieldCheck/><span>ILoveTaguig ECS<small>Secure application review</small></span></Link></header>
    <main className="admin-main review-main"><Link className="admin-back" to="/admin"><ArrowLeft size={17}/> Back to queue</Link>
      <div className="admin-title"><div><p>APPLICATION REVIEW</p><h1>{application.business_name}</h1><span>Submitted by {application.owner_full_name} on {new Date(application.created_at).toLocaleDateString()}</span></div><span className="admin-status status-pending-review">{application.status}</span></div>
      <div className="review-grid"><div className="review-column">
        <section className="admin-panel"><h2>Applicant & business details</h2><dl className="review-details"><div><dt>Applicant</dt><dd>{application.owner_full_name}</dd></div><div><dt>Contact</dt><dd>{application.contact_number}</dd></div><div><dt>Business</dt><dd>{application.business_name}</dd></div><div><dt>Nature</dt><dd>{application.nature_of_business}</dd></div><div><dt>Ownership</dt><dd>{application.ownership_type}</dd></div><div><dt>Application type</dt><dd>{application.application_type}</dd></div><div className="wide"><dt>Business address</dt><dd>{application.business_address}</dd></div></dl></section>
        <section className="admin-panel"><h2>Supporting documents</h2><p className="secure-note">Signed links expire after 5 minutes and remain protected by Storage RLS.</p><div className="document-list">{documents.map((doc) => <article key={doc.id}><FileCheck2/><div><strong>{doc.file_name}</strong><span>{doc.mime_type} · {(doc.file_size / 1024).toFixed(1)} KB</span></div>{doc.signedUrl ? <a href={doc.signedUrl} target="_blank" rel="noreferrer">View <ExternalLink size={14}/></a> : <span>Unavailable</span>}</article>)}</div></section>
      </div><aside className="review-column">
        <section className="admin-panel"><h2>Verification checklist</h2><div className="checklist">{checklistItems.map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(checklist[key])} onChange={(e) => setChecklist((old) => ({...old, [key]: e.target.checked}))}/><span>{label}</span></label>)}</div></section>
        <section className="admin-panel"><label className="remarks-label" htmlFor="remarks">Admin remarks</label><textarea id="remarks" rows="5" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Explain missing information or rejection reasons…"/>{error && <p className="admin-error">{error}</p>}<div className="review-actions"><button disabled={saving || application.status !== 'Pending Review'} onClick={() => review('Approved')} className="approve">Approve</button><button disabled={saving || application.status !== 'Pending Review'} onClick={() => review('Action Required')}>Request More Info</button><button disabled={saving || application.status !== 'Pending Review'} onClick={() => review('Rejected')} className="reject">Reject</button></div></section>
      </aside></div>
    </main></div>
}
