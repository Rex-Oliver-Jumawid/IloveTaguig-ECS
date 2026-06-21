document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const mobileToggle = document.getElementById('mobile-toggle');
  const sidebar = document.getElementById('sidebar');
  const searchBar = document.getElementById('search-bar');
  const tableRows = document.querySelectorAll('#applications-table tbody .table-row');
  const noResultsMsg = document.getElementById('no-results-msg');
  const dismissAlertBtn = document.getElementById('dismiss-alert-btn');
  const actionAlertWidget = document.getElementById('action-alert-widget');
  
  // Mobile Sidebar Toggle
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('sidebar-open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('sidebar-open') && !sidebar.contains(e.target) && e.target !== mobileToggle) {
        sidebar.classList.remove('sidebar-open');
      }
    });
  }

  // Application Row Filtering (Search)
  if (searchBar) {
    searchBar.addEventListener('input', () => {
      const query = searchBar.value.toLowerCase().trim();
      let visibleCount = 0;

      tableRows.forEach(row => {
        const appId = row.getAttribute('data-id').toLowerCase();
        const appType = row.getAttribute('data-type').toLowerCase();
        
        if (appId.includes(query) || appType.includes(query)) {
          row.classList.remove('hidden');
          visibleCount++;
        } else {
          row.classList.add('hidden');
        }
      });

      // Toggle no results message
      if (visibleCount === 0) {
        noResultsMsg.classList.remove('hidden');
      } else {
        noResultsMsg.classList.add('hidden');
      }
    });
  }

  // Dismiss Action Required Alert Widget
  if (dismissAlertBtn && actionAlertWidget) {
    dismissAlertBtn.addEventListener('click', () => {
      actionAlertWidget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      actionAlertWidget.style.opacity = '0';
      actionAlertWidget.style.transform = 'scale(0.95)';
      actionAlertWidget.style.maxHeight = '0px';
      actionAlertWidget.style.padding = '0px';
      actionAlertWidget.style.margin = '0px';
      actionAlertWidget.style.border = 'none';
      
      setTimeout(() => {
        actionAlertWidget.classList.add('hidden');
      }, 300);
    });
  }

  // Quick Action Click simulation
  const newAppTriggers = [
    document.getElementById('new-app-trigger'),
    document.querySelector('.quick-action-item')
  ];

  newAppTriggers.forEach(trigger => {
    if (trigger) {
      trigger.addEventListener('click', () => {
        alert('📝 Open Application Wizard:\nPreparing the Barangay Business Clearance Application Form...');
      });
    }
  });

  // Table Row "View" Buttons
  const viewButtons = document.querySelectorAll('.action-view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.table-row');
      const appId = row.getAttribute('data-id');
      const appType = row.getAttribute('data-type');
      alert(`🔍 Application Details:\nID: ${appId}\nType: ${appType}\n\nLoading application file...`);
    });
  });

  // Sidebar Links Navigation Active State Simulation
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      if (!link.classList.contains('active')) {
        // Clear active classes
        navLinks.forEach(item => {
          item.classList.remove('active');
          const icon = item.querySelector('.nav-icon');
          if (icon) icon.classList.remove('text-green');
        });
        
        // Apply active to current
        link.classList.add('active');
        const icon = link.querySelector('.nav-icon');
        if (icon) icon.classList.add('text-green');
        
        // Show simulated loading
        const pageName = link.querySelector('span').textContent;
        console.log(`Navigating to ${pageName}...`);
      }
    });
  });

  // Logout Trigger
  const logoutTrigger = document.getElementById('logout-trigger');
  if (logoutTrigger) {
    logoutTrigger.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of your session?')) {
        window.location.href = 'index.html';
      }
    });
  }
});
