import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  RotateCcw,
  UploadCloud,
  X,
  Building2,
  Phone,
  MapPin,
  User,
  Info,
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const STEPS = ['Submitted', 'Under Review', 'Approved', 'Ready for Claiming', 'Complete']
const STEP_BY_STATUS = {
  'Pending Review': 1,
  'Action Required': 1,
  Approved: 2,
  'Proceed to Barangay Hall': 3,
  Complete: 4,
  Rejected: 1,
}
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5

function safeName(name) {
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : ''
  const base = name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'document'
  return `${base}${extension}`
}

export default function ApplicationStatusView({
  application,
  documents = [],
  onRefresh,
  user,
  onBack,
  allApplications = [],
  onSelectApplication
}) {
  const fileInput = useRef(null)
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)
  const [resubmitted, setResubmitted] = useState(false)

  function addFiles(incoming) {
    const next = [...files]
    let nextError = ''
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        nextError = `You can upload up to ${MAX_FILES} documents.`
        break
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        nextError = `${file.name} must be a PDF, JPG, or PNG.`
        continue
      }
      if (file.size > MAX_SIZE) {
        nextError = `${file.name} is larger than 10 MB.`
        continue
      }
      if (!next.some((item) => item.name === file.name && item.size === file.size)) {
        next.push(file)
      }
    }
    setFiles(next)
    setFileError(nextError)
  }

  async function resubmit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!files.length) {
      setFileError('Upload at least one corrected document.')
      return
    }
    setPending(true)
    const uploadedPaths = []
    try {
      const documentsPayload = []
      const revision = Date.now()
      for (const [index, file] of files.entries()) {
        const storagePath = `${user.id}/${application.id}/correction-${revision}-${index + 1}-${safeName(file.name)}`
        const { error: uploadError } = await supabase.storage.from('application-docs').upload(storagePath, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        uploadedPaths.push(storagePath)
        documentsPayload.push({
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size
        })
      }
      const { data: replacedPaths, error: rpcError } = await supabase.rpc('resubmit_owner_application', {
        application_id: application.id,
        documents: documentsPayload
      })
      if (rpcError) throw rpcError
      if (replacedPaths?.length) {
        await supabase.storage.from('application-docs').remove(replacedPaths)
      }
      setFiles([])
      setResubmitted(true)
      if (onRefresh) await onRefresh()
    } catch (err) {
      if (uploadedPaths.length) {
        await supabase.storage.from('application-docs').remove(uploadedPaths)
      }
      setSubmitError('Correction could not be submitted. Your existing documents were not changed. Try again.')
    } finally {
      setPending(false)
    }
  }

  const statusClass = application.status.toLowerCase().replaceAll(' ', '-')
  const currentStep = STEP_BY_STATUS[application.status] ?? 0
  const interrupted = application.status === 'Rejected'

  const formattedDate = (dateString) => {
    return new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' }).format(new Date(dateString))
  }

  const getStepStatus = (index) => {
    if (interrupted) {
      if (index === 0) return 'complete'
      if (index === 1) return 'rejected'
      return 'disabled'
    }
    if (currentStep > index) return 'complete'
    if (currentStep === index) return 'active'
    return 'pending'
  }

  const formatFileSize = (bytes) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // Filter other applications
  const otherApps = allApplications.filter(app => app.id !== application.id).slice(0, 4)

  return (
    <div className="figma-status-container">
      {/* Page Header & Breadcrumbs */}
      <div className="figma-status-header">
        <div className="header-left">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <span className="crumb-link" onClick={onBack} style={{ cursor: 'pointer' }}>Applications</span>
            <ChevronRight size={14} className="crumb-separator" />
            <span className="crumb-current monospace-value">{application.reference_no ?? `APP-${application.id.slice(0, 8).toUpperCase()}`}</span>
          </nav>
          <div className="title-row">
            <span className="title-indicator"></span>
            <h2>Application <span className="highlight-italic">Status</span></h2>
          </div>
          <p className="subtitle">Track the progress of your Barangay Business Clearance request.</p>
        </div>

        <div className="header-actions">
          {onBack && (
            <button className="back-btn-figma" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <button 
            className="update-btn-figma"
            onClick={() => {
              if (application.status === 'Action Required') {
                const element = document.getElementById('correction-form-section')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              } else {
                alert('You can only update or resubmit documents for this application when its status is "Action Required" (under review by Barangay staff).')
              }
            }}
            style={application.status !== 'Action Required' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            title={application.status !== 'Action Required' ? 'Updates are only allowed when Action is Required' : undefined}
          >
            <RotateCcw size={16} />
            <span>UPDATE APPLICATION</span>
          </button>
        </div>
      </div>

      {(resubmitted) && (
        <div className="application-success alert-bounce">
          <CheckCircle2 size={20} />
          <span>
            <strong>Corrections resubmitted</strong>
            Your corrected documents are back in the review queue.
          </span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="status-bento-grid">
        
        {/* Left Column - Main Details */}
        <div className="bento-left-col">
          
          {/* Action Required Alert Banner */}
          {application.status === 'Action Required' && (
            <div className="action-required-alert-banner">
              <div className="alert-icon-wrap">
                <AlertCircle size={20} />
              </div>
              <div className="alert-text-wrap">
                <h5>Action Required</h5>
                <p>
                  {application.remarks
                    ? application.remarks
                    : 'Your application requires additional supporting documents before it can be processed. Please upload the corrected files and resubmit.'}
                </p>
              </div>
            </div>
          )}

          {/* Application Progress */}
          <div className="bento-card">
            <div className="card-header border-bottom">
              <div className="card-header-title">
                <span className="title-indicator"></span>
                <h4>APPLICATION PROGRESS</h4>
              </div>
            </div>
            <div className="card-body">
              <div className={`figma-progress-bar ${interrupted ? 'interrupted' : ''}`}>
                {STEPS.map((step, index) => {
                  const stepStatus = getStepStatus(index)
                  const stepText = step === 'Proceed to Barangay Hall' ? 'Ready for Claiming' : step

                  return (
                    <div key={step} className={`progress-step-item ${stepStatus}`}>
                      <div className="step-circle-container">
                        <div className="step-circle">
                          {stepStatus === 'complete' ? <Check size={16} /> : index + 1}
                        </div>
                        {index < STEPS.length - 1 && <div className="step-line"></div>}
                      </div>
                      <div className="step-label-wrap">
                        <strong>{stepText}</strong>
                        <span className="step-subtext">
                          {stepStatus === 'complete' ? 'Completed' : 
                           stepStatus === 'pending' ? 'Pending' : 
                           stepStatus === 'rejected' ? 'Rejected' :
                           (index === 1 && application.status === 'Action Required') ? 'Action Required' :
                           (index === 1 && application.status === 'Pending Review') ? 'Awaiting update' :
                           'Active'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Remarks from Barangay Staff */}
          {application.remarks && (
            <div className="bento-card remarks-card-figma">
              <div className="card-header border-bottom">
                <div className="card-header-title">
                  <span className="title-indicator"></span>
                  <h4>REMARKS FROM BARANGAY STAFF</h4>
                </div>
              </div>
              <div className="card-body">
                <div className="remarks-inner-bubble">
                  <div className="bubble-icon-wrap">
                    <MessageSquareText size={20} />
                  </div>
                  <div className="bubble-content-wrap">
                    <h5>Additional Documents Needed</h5>
                    <p className="remarks-paragraph">{application.remarks}</p>
                    <span className="remarks-timestamp">
                      Latest update {formattedDate(application.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Details */}
          <div className="bento-card">
            <div className="card-header border-bottom">
              <div className="card-header-title">
                <span className="title-indicator"></span>
                <h4>BUSINESS DETAILS</h4>
              </div>
            </div>
            <div className="card-body">
              <div className="details-grid-figma">
                <div className="detail-item-figma">
                  <span>APPLICATION ID</span>
                  <strong>{application.reference_no ?? `APP-${application.id.slice(0, 8).toUpperCase()}`}</strong>
                </div>
                <div className="detail-item-figma">
                  <span>APPLICATION TYPE</span>
                  <strong>{application.application_type}</strong>
                </div>
                <div className="detail-item-figma">
                  <span>BUSINESS NAME</span>
                  <strong>{application.business_name}</strong>
                </div>
                <div className="detail-item-figma">
                  <span>OWNER'S FULL NAME</span>
                  <strong>{application.owner_full_name}</strong>
                </div>
                <div className="detail-item-figma">
                  <span>NATURE OF BUSINESS</span>
                  <strong>{application.nature_of_business}</strong>
                </div>
                <div className="detail-item-figma">
                  <span>CONTACT NUMBER</span>
                  <strong>{application.contact_number}</strong>
                </div>
                <div className="detail-item-figma full-width">
                  <span>REGISTERED BUSINESS ADDRESS</span>
                  <strong>{application.business_address}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="bento-card">
            <div className="card-header border-bottom">
              <div className="card-header-title">
                <span className="title-indicator"></span>
                <h4>SUPPORTING DOCUMENTS</h4>
              </div>
            </div>
            <div className="card-body">
              <div className="documents-list-figma">
                {documents.map((document) => {
                  const isExpired = document.file_name.toLowerCase().includes('expired') || (application.remarks?.toLowerCase().includes(document.file_name.toLowerCase()) && application.status === 'Action Required')
                  
                  let statusBadge = 'Verified'
                  let statusClass = 'verified'

                  if (application.status === 'Pending Review') {
                    statusBadge = 'Awaiting Review'
                    statusClass = 'pending'
                  } else if (application.status === 'Action Required') {
                    // All docs need correction when admin flags the application
                    statusBadge = 'Needs Update'
                    statusClass = 'needs-update'
                  } else if (application.status === 'Rejected') {
                    statusBadge = 'Not Accepted'
                    statusClass = 'needs-update'
                  }
                  // 'Approved', 'Proceed to Barangay Hall', 'Complete' → stays 'Verified'

                  return (
                    <div key={document.id} className="doc-row-figma">
                      <div className="doc-info-wrap">
                        <div className="doc-icon-wrap">
                          <FileText size={20} />
                        </div>
                        <div className="doc-text-wrap">
                          <strong>{document.file_name}</strong>
                          <span>Uploaded {formattedDate(application.created_at)} · {formatFileSize(document.file_size)}</span>
                        </div>
                      </div>
                      <span className={`status-badge-figma ${statusClass}`}>
                        {statusBadge}
                      </span>
                    </div>
                  )
                })}

                {documents.length === 0 && (
                  <p className="no-docs-text">No documents uploaded.</p>
                )}
              </div>
            </div>
          </div>

          {/* Replace and Resubmit Form */}
          {application.status === 'Action Required' && (
            <div className="bento-card" id="correction-form-section">
              <div className="card-header border-bottom">
                <div className="card-header-title">
                  <span className="title-indicator"></span>
                  <h4>REPLACE AND RESUBMIT DOCUMENTS</h4>
                </div>
              </div>
              <div className="card-body">
                <form className="correction-form-figma" onSubmit={resubmit}>
                  <p className="form-instruction">The selected files will replace the current document set.</p>
                  
                  <div 
                    className={`figma-dropzone ${fileError ? 'invalid' : ''}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      addFiles(event.dataTransfer.files)
                    }}
                  >
                    <UploadCloud size={32} />
                    <strong>Drop corrected documents here</strong>
                    <span>PDF, JPG, or PNG · 10 MB each</span>
                    <button type="button" onClick={() => fileInput.current?.click()}>Choose files</button>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={(event) => {
                        addFiles(event.target.files)
                        event.target.value = ''
                      }}
                    />
                  </div>

                  {fileError && (
                    <p className="form-error-msg">
                      <AlertCircle size={14} />
                      {fileError}
                    </p>
                  )}

                  {files.length > 0 && (
                    <div className="staged-files-figma">
                      {files.map((file, index) => (
                        <div key={`${file.name}-${file.size}`} className="staged-file-row">
                          <FileText size={18} />
                          <div className="staged-file-text">
                            <strong>{file.name}</strong>
                            <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {submitError && (
                    <div className="submit-error-banner-figma">
                      <AlertCircle size={18} />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="resubmit-actions-figma">
                    <button type="submit" disabled={pending} className="resubmit-submit-btn">
                      {pending ? 'Resubmitting…' : 'Resubmit corrected documents'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="bento-right-col">
          
          {/* Summary Card */}
          <div className="bento-card">
            <div className="card-header border-bottom">
              <div className="card-header-title">
                <span className="title-indicator"></span>
                <h4>APPLICATION SUMMARY</h4>
              </div>
            </div>
            <div className="card-body padding-none">
              <div className="summary-list-figma">
                <div className="summary-row-figma">
                  <span>App ID</span>
                  <strong className="monospace-value">{application.reference_no ?? `APP-${application.id.slice(0, 8).toUpperCase()}`}</strong>
                </div>
                <div className="summary-row-figma">
                  <span>Date Submitted</span>
                  <strong>{formattedDate(application.created_at)}</strong>
                </div>
                <div className="summary-row-figma">
                  <span>Last Updated</span>
                  <strong>{formattedDate(application.updated_at)}</strong>
                </div>
                <div className="summary-row-figma">
                  <span>Reviewed by</span>
                  <strong>Brgy. Staff Admin</strong>
                </div>
                <div className="summary-row-figma status-row">
                  <span>Current Status</span>
                  <span className={`status-pill ${
                    application.status === 'Action Required' || application.status === 'Rejected' ? 'status-red' : 
                    application.status === 'Proceed to Barangay Hall' ? 'status-blue' :
                    application.status === 'Approved' || application.status === 'Complete' ? 'status-teal' : 'status-orange'
                  }`}>
                    <span className="status-dot"></span>
                    <span>{application.status === 'Proceed to Barangay Hall' ? 'Ready for Claiming' : application.status}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="bento-card help-card-figma">
            <div className="decor-circle circle-small opacity-20"></div>
            <div className="card-body">
              <div className="help-icon-wrap">
                <Info size={24} />
              </div>
              <h4>Need help with your application?</h4>
              <p>Visit Barangay Napindan Hall during office hours or send us a message through our official Facebook page.</p>
              <a 
                href="mailto:support@napindan.taguig.gov.ph"
                className="help-action-btn-figma"
              >
                <span>Contact Barangay</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Other Applications */}
          {otherApps.length > 0 && (
            <div className="bento-card">
              <div className="card-header border-bottom">
                <div className="card-header-title">
                  <span className="title-indicator"></span>
                  <h4>OTHER APPLICATIONS</h4>
                </div>
              </div>
              <div className="card-body padding-none">
                <div className="other-apps-list-figma">
                  {otherApps.map((app) => {
                    const pillClass = 
                      app.status === 'Action Required' || app.status === 'Rejected' ? 'status-red' : 
                      app.status === 'Proceed to Barangay Hall' ? 'status-blue' :
                      app.status === 'Approved' || app.status === 'Complete' ? 'status-teal' : 'status-orange'
                    const displayStatus = app.status === 'Proceed to Barangay Hall' ? 'Ready for Claiming' : app.status

                    return (
                      <div 
                        key={app.id} 
                        className="other-app-row-figma"
                        onClick={() => onSelectApplication && onSelectApplication(app)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view this application status"
                      >
                        <div className="other-app-info">
                          <strong className="monospace-value">{app.reference_no ?? `APP-${app.id.slice(0, 8).toUpperCase()}`}</strong>
                          <span>{formattedDate(app.created_at)}</span>
                        </div>
                        <span className={`status-pill ${pillClass}`}>
                          <span className="status-dot"></span>
                          <span>{displayStatus}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
        
      </div>
    </div>
  )
}
