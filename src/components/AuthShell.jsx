export default function AuthShell({ children }) {
  return (
    <div className="app-container" id="app">
      <a className="skip-link" href="#main-content">Skip to Main Content</a>
      
      {/* LEFT PANEL: Branding & Features */}
      <section class="left-panel">
        {/* Backdrop concentric decorative circles */}
        <div class="decor-circle circle-large"></div>
        <div class="decor-circle circle-small"></div>
        
        {/* Top header branding */}
        <header class="panel-header">
          <div class="logo-container">
            <div class="logo-border">
              <img src="/assets/images/logo2.png" alt="Napindan Logo" class="logo-img" />
            </div>
            <div class="logo-border">
              <img src="/assets/images/logo1.png" alt="Taguig Logo" class="logo-img" />
            </div>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">ILoveTaguig ECS</h1>
            <span class="brand-subtitle">BARANGAY NAPINDAN · TAGUIG CITY</span>
          </div>
        </header>

        {/* Main body branding content */}
        <main class="panel-main">
          <div class="badge-row">
            <span class="pulse-dot"></span>
            <span class="badge-text">ELECTRONIC CERTIFICATION SERVICE</span>
          </div>
          
          <h2 class="main-heading">
            Secure & <span class="highlight-italic">Fast</span> Business Clearances.
          </h2>
          
          <p class="main-description">
            Skip the queue. Apply for your Barangay Business Clearance online — anytime, anywhere. Built for the people of Napindan.
          </p>

          {/* Feature List */}
          <div class="features-list">
            
            <div class="feature-card">
              <div class="feature-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="feature-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div class="feature-content">
                <h3>Verified Identity</h3>
                <p>Secure authentication for all citizens</p>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="feature-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div class="feature-content">
                <h3>Digital Records</h3>
                <p>Instant access to your official clearances</p>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="feature-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="feature-content">
                <h3>Real-Time Status</h3>
                <p>Track your application from submission to release</p>
              </div>
            </div>

          </div>
        </main>

        {/* Panel footer */}
        <footer class="panel-footer">
          <div class="sdg-container">
            <span class="sdg-pill sdg-accent">SDG 9</span>
            <span class="sdg-pill">SDG 11</span>
            <span class="sdg-pill">SDG 16</span>
          </div>
          <span class="footer-tagline">Uukit ng Kasaysayan...</span>
        </footer>
      </section>

      {/* RIGHT PANEL: Form Shell */}
      <section class="right-panel" id="main-content">
        <div class="top-glow"></div>
        <div class="form-container">
          {children}
        </div>
      </section>
    </div>
  )
}

