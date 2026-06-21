import { X, BookOpen, CheckCircle2, Printer, ClipboardList, FileCheck2, ArrowRight } from 'lucide-react'

/**
 * AdminHelpPanel — slide-over help drawer for admin pages.
 *
 * Props:
 *   open    {boolean}  — controlled open state
 *   onClose {function} — called when the panel should close
 *   context {'dashboard'|'review'|'clearance'} — which page's help to show
 */
export default function AdminHelpPanel({ open, onClose, context = 'dashboard' }) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="help-panel-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Help guide"
      >
        <header className="help-panel-header">
          <div className="help-panel-title-row">
            <BookOpen size={16} className="help-panel-icon" />
            <h2 className="help-panel-title">Help Guide</h2>
          </div>
          <button
            type="button"
            className="help-panel-close"
            onClick={onClose}
            aria-label="Close help panel"
          >
            <X size={16} />
          </button>
        </header>

        <div className="help-panel-body">
          {context === 'dashboard' && <DashboardHelp />}
          {context === 'review' && <ReviewHelp />}
          {context === 'clearance' && <ClearanceHelp />}
        </div>
      </aside>
    </>
  )
}

/* ── Dashboard help ────────────────────────────────────────────── */
function DashboardHelp() {
  return (
    <>
      <p className="help-panel-lead">
        The Admin Dashboard is your command center for processing Barangay Business Clearance applications end-to-end.
      </p>

      <Section icon={<ClipboardList size={15} />} title="End-to-End Workflow">
        <Step n={1} label="Review pending applications" desc="Open the Applications tab to see all submissions awaiting your decision. Click any row to open the full review page." />
        <Step n={2} label="Approve, request info, or reject" desc="On the review page, verify documents, fill in remarks, and choose an action. Approving automatically generates the clearance certificate." />
        <Step n={3} label="Print the certificate" desc="After approval, the application moves to the Print Queue tab. Open it, generate the PDF if not yet done, and download it for printing." />
        <Step n={4} label="Mark as Complete" desc="Once the applicant has physically collected their sealed certificate at the barangay, mark the application Complete. The owner is notified automatically." />
      </Section>

      <Section icon={<CheckCircle2 size={15} />} title="Tab Quick Reference">
        <Tip label="Applications" desc="All submissions; filter by status." />
        <Tip label="Print Queue" desc="Approved applications ready to generate and print." />
        <Tip label="Owners" desc="All registered business owners and their application counts." />
        <Tip label="History" desc="Completed and rejected applications for audit." />
        <Tip label="Notifications" desc="System and applicant activity alerts." />
        <Tip label="Settings" desc="Profile, password, and account preferences." />
      </Section>

      <Section icon={<FileCheck2 size={15} />} title="Application Statuses">
        <StatusRow badge="pending" label="Pending Review" desc="Newly submitted, not yet reviewed." />
        <StatusRow badge="action" label="Action Required" desc="Sent back to owner for more documents." />
        <StatusRow badge="approved" label="Approved" desc="Approved but certificate not yet generated." />
        <StatusRow badge="proceed" label="Proceed to Barangay Hall" desc="Certificate generated; awaiting physical pickup." />
        <StatusRow badge="complete" label="Complete" desc="Certificate handed over in person." />
        <StatusRow badge="rejected" label="Rejected" desc="Application denied with remarks." />
      </Section>
    </>
  )
}

/* ── Review page help ──────────────────────────────────────────── */
function ReviewHelp() {
  return (
    <>
      <p className="help-panel-lead">
        This page shows the full detail of one application. Review documents, run verification checks, then take a decision.
      </p>

      <Section icon={<ClipboardList size={15} />} title="Review Steps">
        <Step n={1} label="Check applicant documents" desc="Click any document link to open a secure, short-lived preview. Links expire after 5 minutes — click again to refresh." />
        <Step n={2} label="Tick the verification checklist" desc="Work through each checkbox. The checklist is advisory — you can still take action even if not all items are checked." />
        <Step n={3} label="Write remarks" desc="Remarks are shown to the applicant on their status page. Be clear and specific, especially for Action Required and Rejected decisions." />
        <Step n={4} label="Choose an action" desc="Approve, Request More Info, or Reject. Approving automatically generates the clearance certificate and notifies the owner." />
      </Section>

      <Section icon={<CheckCircle2 size={15} />} title="Action Reference">
        <Tip label="Approve" desc="Generates certificate, moves to Print Queue. Sends 'Proceed to Barangay Hall' notification." />
        <Tip label="Request More Info" desc="Sets status to Action Required. Owner must re-upload documents before you can re-review." />
        <Tip label="Reject" desc="Permanently closes the application. Remarks are required so the owner understands why." />
      </Section>

      <Section icon={<FileCheck2 size={15} />} title="Document Security">
        <p className="help-tip-body" style={{ marginBottom: 0 }}>
          All document links are signed URLs that expire after 5 minutes. They are never shared with owners — only admins can generate them. Do not copy or forward these links.
        </p>
      </Section>
    </>
  )
}

/* ── Generated Clearance help ──────────────────────────────────── */
function ClearanceHelp() {
  return (
    <>
      <p className="help-panel-lead">
        This page shows the generated Barangay Business Clearance PDF for one approved application. Use it to download, review, and finalize the handover.
      </p>

      <Section icon={<Printer size={15} />} title="Certificate Workflow">
        <Step n={1} label="Review the PDF" desc="The iframe shows the filled clearance form. Verify the reference number, applicant name, business name, and validity date are correct." />
        <Step n={2} label="Download and print" desc="Click Download PDF to save the certificate to your computer, then print it at the barangay's printer. Use A4 paper." />
        <Step n={3} label="Physical preparation" desc="After printing: have the Punong Barangay sign the certificate, apply the official barangay seal (tatak), and attach the applicant's ID photo." />
        <Step n={4} label="Hand over to applicant" desc="The applicant must appear in person with a valid ID. Do not release the certificate to a third party without written authorization." />
        <Step n={5} label="Mark as Complete" desc="Once the certificate has been handed over, click Mark as Complete. This updates the applicant's status page and sends a completion notification." />
      </Section>

      <Section icon={<CheckCircle2 size={15} />} title="Signed Link Expiry">
        <p className="help-tip-body" style={{ marginBottom: 0 }}>
          The PDF preview link expires every 5 minutes for security. If the preview goes blank or fails to load, click <strong>Refresh Link</strong> in the preview toolbar to generate a new one.
        </p>
      </Section>

      <Section icon={<FileCheck2 size={15} />} title="Admin-Only Access">
        <p className="help-tip-body" style={{ marginBottom: 0 }}>
          This page is restricted to administrators. The applicant's status page only shows "Proceed to Barangay Hall" — they never see the generated PDF or this download link.
        </p>
      </Section>
    </>
  )
}

/* ── Shared sub-components ─────────────────────────────────────── */
function Section({ icon, title, children }) {
  return (
    <div className="help-section">
      <div className="help-section-header">
        <span className="help-section-icon">{icon}</span>
        <h3 className="help-section-title">{title}</h3>
      </div>
      <div className="help-section-body">{children}</div>
    </div>
  )
}

function Step({ n, label, desc }) {
  return (
    <div className="help-step">
      <span className="help-step-num">{n}</span>
      <div className="help-step-content">
        <span className="help-step-label">{label}</span>
        <p className="help-step-desc">{desc}</p>
      </div>
    </div>
  )
}

function Tip({ label, desc }) {
  return (
    <div className="help-tip">
      <ArrowRight size={11} className="help-tip-arrow" />
      <div>
        <span className="help-tip-label">{label}</span>
        <span className="help-tip-sep"> — </span>
        <span className="help-tip-body">{desc}</span>
      </div>
    </div>
  )
}

function StatusRow({ badge, label, desc }) {
  return (
    <div className="help-status-row">
      <span className={`help-status-dot help-dot--${badge}`} />
      <div>
        <span className="help-tip-label">{label}</span>
        <span className="help-tip-sep"> — </span>
        <span className="help-tip-body">{desc}</span>
      </div>
    </div>
  )
}
