import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Clock3, FileText, MessageSquareText, RotateCcw, UploadCloud, X } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const STEPS = ['Pending Review', 'Approved', 'Proceed to Barangay Hall', 'Complete']
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5

function safeName(name) {
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : ''
  const base = name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'document'
  return `${base}${extension}`
}

export default function ApplicationStatusPage() {
  const { applicationId } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const fileInput = useRef(null)
  const [application, setApplication] = useState(null)
  const [documents, setDocuments] = useState([])
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)
  const [resubmitted, setResubmitted] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [applicationResult, documentsResult] = await Promise.all([
      supabase.from('applications').select('id, business_name, application_type, ownership_type, nature_of_business, business_address, contact_number, status, remarks, created_at, updated_at').eq('id', applicationId).single(),
      supabase.from('application_documents').select('id, storage_path, file_name, mime_type, file_size').eq('application_id', applicationId).order('created_at'),
    ])
    if (applicationResult.error) setError('This application could not be found or you do not have access to it.')
    else { setApplication(applicationResult.data); setDocuments(documentsResult.data ?? []) }
  }, [applicationId])

  useEffect(() => { load() }, [load])

  function addFiles(incoming) {
    const next = [...files]
    let nextError = ''
    for (const file of incoming) {
      if (next.length >= MAX_FILES) { nextError = `You can upload up to ${MAX_FILES} documents.`; break }
      if (!ALLOWED_TYPES.includes(file.type)) { nextError = `${file.name} must be a PDF, JPG, or PNG.`; continue }
      if (file.size > MAX_SIZE) { nextError = `${file.name} is larger than 10 MB.`; continue }
      if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file)
    }
    setFiles(next)
    setFileError(nextError)
  }

  async function resubmit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!files.length) { setFileError('Upload at least one corrected document.'); return }
    setPending(true)
    const uploadedPaths = []
    try {
      const documentsPayload = []
      const revision = Date.now()
      for (const [index, file] of files.entries()) {
        const storagePath = `${user.id}/${applicationId}/correction-${revision}-${index + 1}-${safeName(file.name)}`
        const { error: uploadError } = await supabase.storage.from('application-docs').upload(storagePath, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        uploadedPaths.push(storagePath)
        documentsPayload.push({ storage_path: storagePath, file_name: file.name, mime_type: file.type, file_size: file.size })
      }
      const { data: replacedPaths, error: rpcError } = await supabase.rpc('resubmit_owner_application', { application_id: applicationId, documents: documentsPayload })
      if (rpcError) throw rpcError
      if (replacedPaths?.length) await supabase.storage.from('application-docs').remove(replacedPaths)
      setFiles([])
      setResubmitted(true)
      await load()
    } catch {
      if (uploadedPaths.length) await supabase.storage.from('application-docs').remove(uploadedPaths)
      setSubmitError('Correction could not be submitted. Your existing documents were not changed. Try again.')
    } finally {
      setPending(false)
    }
  }

  if (error) return <main className="application-status-page"><div className="application-status-card"><h1>Application unavailable</h1><p>{error}</p><Link to="/owner">Return to dashboard</Link></div></main>
  if (!application) return <main className="application-status-page"><div className="application-status-card"><p>Loading application…</p></div></main>

  const statusClass = application.status.toLowerCase().replaceAll(' ', '-')
  const currentStep = application.status === 'Action Required' ? 0 : STEPS.indexOf(application.status)
  const interrupted = application.status === 'Action Required' || application.status === 'Rejected'

  return <main className="application-status-page"><div className="application-status-wrap">
    <Link className="application-back" to="/owner"><ArrowLeft size={18} /> Dashboard</Link>
    {(location.state?.submitted || resubmitted) && <div className="application-success"><CheckCircle2 size={20} /><span><strong>{resubmitted ? 'Corrections resubmitted' : 'Application submitted'}</strong>{resubmitted ? 'Your corrected documents are back in the review queue.' : 'Your request is now in the barangay review queue.'}</span></div>}
    <section className="application-status-card">
      <div className="application-status-head"><div><p>APPLICATION #{application.id.slice(0, 8).toUpperCase()}</p><h1>{application.business_name}</h1><span>Submitted {new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' }).format(new Date(application.created_at))}</span></div><span className={`owner-status owner-status--${statusClass}`}><Clock3 size={14} /> {application.status}</span></div>
      <div className={`application-progress ${interrupted ? 'interrupted' : ''}`} aria-label={`Application progress: ${application.status}`}>{STEPS.map((step, index) => { const complete = !interrupted && currentStep > index; const active = !interrupted && currentStep === index; return <div key={step} className={complete ? 'complete' : active ? 'active' : ''}><span>{complete ? <Check size={16} /> : index + 1}</span><strong>{step}</strong></div> })}</div>
      {interrupted && <div className={`application-interruption ${application.status === 'Rejected' ? 'rejected' : ''}`}><AlertCircle size={20} /><span><strong>{application.status}</strong>{application.status === 'Action Required' ? 'Review the barangay remarks and replace your supporting documents below.' : 'This request will not proceed. Review the barangay remarks for details.'}</span></div>}
      {application.remarks && <section className="application-remarks"><MessageSquareText size={21} /><div><h2>Barangay remarks</h2><p>{application.remarks}</p><small>Latest update {new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(application.updated_at))}</small></div></section>}
      <div className="application-status-grid"><div><span>Application type</span><strong>{application.application_type}</strong></div><div><span>Ownership</span><strong>{application.ownership_type}</strong></div><div><span>Nature of business</span><strong>{application.nature_of_business}</strong></div><div><span>Contact number</span><strong>{application.contact_number}</strong></div><div className="wide"><span>Registered address</span><strong>{application.business_address}</strong></div></div>
      <div className="application-document-summary"><h2>{application.status === 'Action Required' ? 'Current supporting documents' : 'Supporting documents'}</h2>{documents.map((document) => <div key={document.id}><FileText size={18} /><span>{document.file_name}</span><small>{(document.file_size / 1024 / 1024).toFixed(2)} MB</small></div>)}</div>
      {application.status === 'Action Required' && <form className="correction-form" onSubmit={resubmit}><div className="application-section-heading"><span><RotateCcw size={17} /></span><div><h2>Replace and resubmit documents</h2><p>The selected files will replace the current document set.</p></div></div><div className={`application-dropzone ${fileError ? 'invalid' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}><UploadCloud size={27} /><strong>Drop corrected documents here</strong><span>PDF, JPG, or PNG · 10 MB each</span><button type="button" onClick={() => fileInput.current?.click()}>Choose files</button><input ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} /></div>{fileError && <p className="application-error"><AlertCircle size={15} />{fileError}</p>}{files.length > 0 && <div className="application-files">{files.map((file, index) => <div key={`${file.name}-${file.size}`}><FileText size={18} /><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={17} /></button></div>)}</div>}{submitError && <div className="application-submit-error" role="alert"><AlertCircle size={18} />{submitError}</div>}<div className="correction-actions"><button type="submit" disabled={pending}>{pending ? 'Resubmitting…' : 'Resubmit corrected documents'}</button></div></form>}
    </section>
  </div></main>
}
