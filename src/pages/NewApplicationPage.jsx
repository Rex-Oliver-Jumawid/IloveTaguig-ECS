import { useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, FileCheck2, FileText, UploadCloud, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const initialForm = { businessName: '', ownerFullName: '', natureOfBusiness: '', ownershipType: '', applicationType: '', contactNumber: '', businessAddress: '' }

function safeName(name) {
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : ''
  const base = name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'document'
  return `${base}${extension}`
}

export default function NewApplicationPage() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const [form, setForm] = useState(() => ({ ...initialForm, ownerFullName: profile?.full_name || '' }))
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  function addFiles(incoming) {
    const next = [...files]
    let fileError = ''
    for (const file of incoming) {
      if (next.length >= MAX_FILES) { fileError = `You can upload up to ${MAX_FILES} documents.`; break }
      if (!ALLOWED_TYPES.includes(file.type)) { fileError = `${file.name} must be a PDF, JPG, or PNG.`; continue }
      if (file.size > MAX_SIZE) { fileError = `${file.name} is larger than 10 MB.`; continue }
      if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file)
    }
    setFiles(next)
    setErrors((current) => ({ ...current, files: fileError }))
  }

  function validate() {
    const next = {}
    if (form.businessName.trim().length < 2) next.businessName = 'Enter the registered business name.'
    if (form.ownerFullName.trim().length < 3) next.ownerFullName = 'Enter the owner’s full legal name.'
    if (!form.natureOfBusiness) next.natureOfBusiness = 'Select the nature of business.'
    if (!form.ownershipType) next.ownershipType = 'Select an ownership type.'
    if (!form.applicationType) next.applicationType = 'Select new or renewal.'
    if (!/^(?:\+63|0)9\d{9}$/.test(form.contactNumber.replace(/[\s-]/g, ''))) next.contactNumber = 'Enter a valid Philippine mobile number.'
    if (form.businessAddress.trim().length < 10) next.businessAddress = 'Enter the complete registered business address.'
    if (!files.length) next.files = 'Upload at least one supporting document.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setPending(true)

    const applicationId = crypto.randomUUID()
    const uploadedPaths = []
    try {
      const documents = []
      for (const [index, file] of files.entries()) {
        const storagePath = `${user.id}/${applicationId}/${index + 1}-${safeName(file.name)}`
        const { error } = await supabase.storage.from('application-docs').upload(storagePath, file, { contentType: file.type, upsert: false })
        if (error) throw error
        uploadedPaths.push(storagePath)
        documents.push({ storage_path: storagePath, file_name: file.name, mime_type: file.type, file_size: file.size })
      }

      const { error } = await supabase.rpc('submit_owner_application', {
        application_id: applicationId,
        owner_full_name: form.ownerFullName,
        business_name: form.businessName,
        nature_of_business: form.natureOfBusiness,
        ownership_type: form.ownershipType,
        application_type: form.applicationType,
        contact_number: form.contactNumber,
        business_address: form.businessAddress,
        documents,
      })
      if (error) throw error
      navigate(`/owner/applications/${applicationId}`, { replace: true, state: { submitted: true } })
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from('application-docs').remove(uploadedPaths)
      setSubmitError(error?.message?.includes('duplicate') ? 'This application could not be submitted. Please try again.' : 'Submission failed. No application was created; review your connection and try again.')
      setPending(false)
    }
  }

  return (
    <main className="application-form-page">
      <div className="application-form-topbar"><Link to="/owner"><ArrowLeft size={18} /> Back to dashboard</Link><span>ILoveTaguig ECS</span></div>
      <div className="application-form-layout">
        <section className="application-form-intro"><p>NEW APPLICATION</p><h1>Apply for your Barangay Business Clearance.</h1><span>Complete the business details and attach clear copies of your supporting documents.</span><div><FileCheck2 size={21} /><p><strong>Before you begin</strong><span>Prepare your DTI/SEC registration, valid ID, or lease contract in PDF, JPG, or PNG format.</span></p></div></section>
        <section className="application-form-shell"><form className="application-form-core" onSubmit={submit} noValidate>
          <div className="application-section-heading"><span>1</span><div><h2>Business information</h2><p>Fields marked required must be completed.</p></div></div>
          <div className="application-field-grid">
            <Field label="Business name" name="businessName" value={form.businessName} onChange={update} error={errors.businessName} placeholder="Registered business name" />
            <Field label="Owner’s full name" name="ownerFullName" value={form.ownerFullName} onChange={update} error={errors.ownerFullName} placeholder="Full legal name" />
            <SelectField label="Nature of business" name="natureOfBusiness" value={form.natureOfBusiness} onChange={update} error={errors.natureOfBusiness} options={['Retail', 'Food Service', 'Professional Services', 'Manufacturing', 'Other']} />
            <SelectField label="Ownership type" name="ownershipType" value={form.ownershipType} onChange={update} error={errors.ownershipType} options={['Sole Proprietorship', 'Partnership', 'Corporation']} />
            <SelectField label="Application type" name="applicationType" value={form.applicationType} onChange={update} error={errors.applicationType} options={['New', 'Renewal']} />
            <Field label="Contact number" name="contactNumber" value={form.contactNumber} onChange={update} error={errors.contactNumber} placeholder="09XX XXX XXXX" inputMode="tel" />
            <Field className="wide" label="Registered business address" name="businessAddress" value={form.businessAddress} onChange={update} error={errors.businessAddress} placeholder="Street, subdivision, Barangay Napindan, Taguig City" />
          </div>

          <div className="application-section-heading documents"><span>2</span><div><h2>Supporting documents</h2><p>Up to five files, maximum 10 MB each.</p></div></div>
          <div className={`application-dropzone ${errors.files ? 'invalid' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}>
            <UploadCloud size={28} /><strong>Drop documents here</strong><span>or choose files from your device</span><button type="button" onClick={() => fileInput.current?.click()}>Choose files</button>
            <input ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
          </div>
          {errors.files && <p className="application-error"><AlertCircle size={15} />{errors.files}</p>}
          {files.length > 0 && <div className="application-files">{files.map((file, index) => <div key={`${file.name}-${file.size}`}><FileText size={18} /><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={17} /></button></div>)}<p>{files.length} of {MAX_FILES} files · {(totalSize / 1024 / 1024).toFixed(2)} MB total</p></div>}

          {submitError && <div className="application-submit-error" role="alert"><AlertCircle size={18} />{submitError}</div>}
          <div className="application-form-actions"><Link to="/owner">Cancel</Link><button type="submit" disabled={pending}>{pending ? 'Submitting application…' : <>Submit application <span><ArrowRight size={17} /></span></>}</button></div>
        </form></section>
      </div>
    </main>
  )
}

function Field({ label, name, value, onChange, error, placeholder, className = '', inputMode }) {
  return <div className={`application-field ${className}`}><label htmlFor={name}>{label} <span>*</span></label><input id={name} name={name} value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} inputMode={inputMode} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />{error && <small id={`${name}-error`}>{error}</small>}</div>
}

function SelectField({ label, name, value, onChange, error, options }) {
  return <div className="application-field"><label htmlFor={name}>{label} <span>*</span></label><select id={name} name={name} value={value} onChange={(event) => onChange(name, event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}><option value="">Select an option</option>{options.map((option) => <option key={option}>{option}</option>)}</select>{error && <small id={`${name}-error`}>{error}</small>}</div>
}
