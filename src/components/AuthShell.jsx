import { ShieldCheck } from 'lucide-react'

export default function AuthShell({ title, description, children }) {
  return (
    <div className="auth-page">
      <a className="skip-link" href="#main-content">Skip to Main Content</a>
      <header className="brand-bar">
        <a className="brand" href="/auth" aria-label="ILoveTaguig ECS home">
          <img src="/assets/images/logo2.png" alt="" width="48" height="48" />
          <span><small>BARANGAY NAPINDAN · TAGUIG CITY</small><strong>ILoveTaguig ECS</strong></span>
        </a>
      </header>
      <main className="auth-layout" id="main-content">
        <section className="auth-intro" aria-labelledby="auth-title">
          <div className="trust-mark"><ShieldCheck size={20} aria-hidden="true" /> Secure Barangay Service</div>
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
        </section>
        <section className="auth-shell" aria-label="Account access">
          <div className="auth-card">{children}</div>
        </section>
      </main>
    </div>
  )
}
