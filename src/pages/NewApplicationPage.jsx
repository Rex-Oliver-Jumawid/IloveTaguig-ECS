import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  FileText,
  UploadCloud,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const initialForm = {
  businessName: '',
  ownerFullName: '',
  natureOfBusiness: '',
  ownershipType: '',
  applicationType: '',
  contactNumber: '',
  businessAddress: '',
}

function safeName(name) {
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : ''
  const base = name
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'document'
  return `${base}${extension}`
}

export default function NewApplicationPage({ onCancel }) {
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
      if (next.length >= MAX_FILES) {
        fileError = `You can upload up to ${MAX_FILES} documents.`
        break
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        fileError = `${file.name} must be a PDF, JPG, or PNG.`
        continue
      }
      if (file.size > MAX_SIZE) {
        fileError = `${file.name} is larger than 10 MB.`
        continue
      }
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
    if (!/^(?:\+63|0)9\d{9}$/.test(form.contactNumber.replace(/[\s-]/g, ''))) {
      next.contactNumber = 'Enter a valid Philippine mobile number.'
    }
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
        const { error } = await supabase.storage
          .from('application-docs')
          .upload(storagePath, file, { contentType: file.type, upsert: false })
        if (error) throw error
        uploadedPaths.push(storagePath)
        documents.push({
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        })
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
      setSubmitError(
        error?.message?.includes('duplicate')
          ? 'This application could not be submitted. Please try again.'
          : 'Submission failed. No application was created; review your connection and try again.'
      )
      setPending(false)
    }
  }

  return (
    <>
      <section className="welcome-section">
        <div className="welcome-text">
          <h2 className="new-app-header-title">
            New <span className="new-app-title-italic">Application</span>
          </h2>
          <p className="new-app-subtitle">Submit a request for Barangay Business Clearance certification.</p>
        </div>
      </section>

      <div className="form-section-card">
        <form onSubmit={submit} noValidate>
          <div className="form-section-card-header">
            <span className="title-indicator" style={{ height: '12px', backgroundColor: 'var(--orange-primary)', borderRadius: '2px', width: '4px' }}></span>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--teal-primary)' }}>BUSINESS CLEARANCE DETAILS</h3>
          </div>

          <div className="form-section-card-body" style={{ padding: '32px 32px 48px' }}>
            <div className="application-field-grid">
              <div className="application-field">
                <label htmlFor="businessName">BUSINESS NAME <span>*</span></label>
                <input id="businessName" name="businessName" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Enter registered business name" aria-invalid={Boolean(errors.businessName)} aria-describedby={errors.businessName ? 'businessName-error' : undefined} />
                {errors.businessName && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="businessName-error">{errors.businessName}</small>}
              </div>

              <div className="application-field">
                <label htmlFor="ownerFullName">OWNER'S FULL NAME <span>*</span></label>
                <input id="ownerFullName" name="ownerFullName" value={form.ownerFullName} onChange={(e) => update('ownerFullName', e.target.value)} placeholder="First Name, Last Name" aria-invalid={Boolean(errors.ownerFullName)} aria-describedby={errors.ownerFullName ? 'ownerFullName-error' : undefined} />
                {errors.ownerFullName && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="ownerFullName-error">{errors.ownerFullName}</small>}
              </div>

              <div className="application-field">
                <label htmlFor="natureOfBusiness">NATURE OF BUSINESS <span>*</span></label>
                <select id="natureOfBusiness" name="natureOfBusiness" value={form.natureOfBusiness} onChange={(e) => update('natureOfBusiness', e.target.value)} aria-invalid={Boolean(errors.natureOfBusiness)} aria-describedby={errors.natureOfBusiness ? 'natureOfBusiness-error' : undefined}>
                  <option value="">Select business type</option>
                  {['Retail', 'Food Service', 'Professional Services', 'Manufacturing', 'Other'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.natureOfBusiness && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="natureOfBusiness-error">{errors.natureOfBusiness}</small>}
              </div>

              <div className="application-field">
                <label htmlFor="ownershipType">OWNERSHIP TYPE <span>*</span></label>
                <select id="ownershipType" name="ownershipType" value={form.ownershipType} onChange={(e) => update('ownershipType', e.target.value)} aria-invalid={Boolean(errors.ownershipType)} aria-describedby={errors.ownershipType ? 'ownershipType-error' : undefined}>
                  <option value="">Select ownership type</option>
                  {['Sole Proprietorship', 'Partnership', 'Corporation'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.ownershipType && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="ownershipType-error">{errors.ownershipType}</small>}
              </div>

              <div className="application-field">
                <label htmlFor="applicationType">APPLICATION TYPE <span>*</span></label>
                <select id="applicationType" name="applicationType" value={form.applicationType} onChange={(e) => update('applicationType', e.target.value)} aria-invalid={Boolean(errors.applicationType)} aria-describedby={errors.applicationType ? 'applicationType-error' : undefined}>
                  <option value="">Select application type</option>
                  {['New', 'Renewal'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.applicationType && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="applicationType-error">{errors.applicationType}</small>}
              </div>

              <div className="application-field">
                <label htmlFor="contactNumber">CONTACT NUMBER <span>*</span></label>
                <input id="contactNumber" name="contactNumber" value={form.contactNumber} onChange={(e) => update('contactNumber', e.target.value)} placeholder="09XX XXX XXXX" inputMode="tel" aria-invalid={Boolean(errors.contactNumber)} aria-describedby={errors.contactNumber ? 'contactNumber-error' : undefined} />
                {errors.contactNumber && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="contactNumber-error">{errors.contactNumber}</small>}
              </div>

              <div className="application-field wide">
                <label htmlFor="businessAddress">REGISTERED BUSINESS ADDRESS <span>*</span></label>
                <input id="businessAddress" name="businessAddress" value={form.businessAddress} onChange={(e) => update('businessAddress', e.target.value)} placeholder="Unit/Floor, Building, Street, Barangay Napindan, Taguig City" aria-invalid={Boolean(errors.businessAddress)} aria-describedby={errors.businessAddress ? 'businessAddress-error' : undefined} />
                <span className="dropzone-help-text" style={{ marginTop: '4px' }}>Must be within Barangay Napindan, Taguig City.</span>
                {errors.businessAddress && <small style={{ color: 'var(--error-color)', fontSize: '0.72rem', marginTop: '4px' }} id="businessAddress-error">{errors.businessAddress}</small>}
              </div>
            </div>

            <h4 className="form-docs-heading">SUPPORTING DOCUMENTS <span>*</span></h4>
            <div className={`figma-dropzone ${errors.files ? 'invalid' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }} onClick={() => fileInput.current?.click()}>
              <div className="dropzone-icon-circle"><UploadCloud size={24} /></div>
              <p className="dropzone-text"><span className="orange-highlight">Click to upload</span> or drag and drop</p>
              <p className="dropzone-subtext">DTI/SEC Registration, Valid ID, Lease Contract - SVG, PNG, JPG, PDF (max. 10MB)</p>
              <input ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </div>

            {errors.files && (
              <p className="application-error" style={{ color: 'var(--error-color)', fontSize: '0.75rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} />
                <span>{errors.files}</span>
              </p>
            )}
            <p className="dropzone-help-text" style={{ marginBottom: '16px' }}>Upload at least one valid supporting document.</p>

            {files.length > 0 && (
              <div className="application-files" style={{ marginTop: '16px', marginBottom: '24px' }}>
                {files.map((file, idx) => (
                  <div key={`${file.name}-${file.size}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--slate-200)', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={18} style={{ color: 'var(--teal-primary)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-900)' }}>{file.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={(e) => { e.stopPropagation(); setFiles(curr => curr.filter((_, i) => i !== idx)) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <p style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--slate-500)' }}>{files.length} of {MAX_FILES} files · {(totalSize / 1024 / 1024).toFixed(2)} MB total</p>
              </div>
            )}

            {submitError && (
              <div className="application-submit-error" role="alert" style={{ marginTop: '16px', marginBottom: '24px' }}>
                <AlertCircle size={18} />
                <span>{submitError}</span>
              </div>
            )}
          </div>

          <div className="form-actions-bar">
            <button type="button" className="cancel-action-btn" onClick={onCancel || (() => navigate('/owner'))}>Cancel</button>
            <button type="submit" className="submit-action-btn" disabled={pending}>
              <ArrowRight size={16} />
              {pending ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
