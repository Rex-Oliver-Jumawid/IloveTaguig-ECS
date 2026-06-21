document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const appContainer = document.getElementById('app');
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const formHeading = document.getElementById('form-heading');
  const formSubheading = document.getElementById('form-subheading');
  const authForm = document.getElementById('auth-form');
  const submitBtn = document.getElementById('submit-btn');
  
  // Fields to toggle
  const nameGroup = document.getElementById('name-group');
  const confirmGroup = document.getElementById('confirm-group');
  const termsContainer = document.getElementById('terms-container');
  const forgotPwLink = document.getElementById('forgot-pw-link');
  
  // Inputs
  const fullNameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const termsCheckbox = document.getElementById('terms');
  
  // Password Visibility Toggle
  const togglePwBtn = document.getElementById('toggle-pw-btn');
  const eyeOpenIcon = togglePwBtn.querySelector('.eye-open');
  const eyeClosedIcon = togglePwBtn.querySelector('.eye-closed');
  
  // Current Mode: 'register' or 'login'
  let currentMode = 'register';

  // Toggle Tab Action
  function setMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    
    // Clear validation errors on switch
    clearAllErrors();
    
    if (mode === 'login') {
      // Update Tab buttons styling
      registerTab.classList.remove('active');
      registerTab.setAttribute('aria-selected', 'false');
      loginTab.classList.add('active');
      loginTab.setAttribute('aria-selected', 'true');
      
      // Animate transition (Fade out fields first)
      nameGroup.classList.add('fade-out');
      confirmGroup.classList.add('fade-out');
      termsContainer.classList.add('fade-out');
      
      setTimeout(() => {
        // Toggle visibility
        nameGroup.classList.add('hidden');
        confirmGroup.classList.add('hidden');
        termsContainer.classList.add('hidden');
        forgotPwLink.classList.remove('hidden');
        
        // Update labels & texts
        formHeading.innerHTML = 'Welcome <span class="highlight-orange">back.</span>';
        formSubheading.textContent = 'Log in to access your dashboard.';
        submitBtn.textContent = 'LOG IN';
        passwordInput.placeholder = 'Enter your password';
        
        // Remove animation class for next toggle
        nameGroup.classList.remove('fade-out');
        confirmGroup.classList.remove('fade-out');
        termsContainer.classList.remove('fade-out');
        
        // Trigger fade-in for login items
        forgotPwLink.classList.add('fade-in');
        setTimeout(() => forgotPwLink.classList.remove('fade-in'), 250);
      }, 200);
      
    } else {
      // Switch back to Register
      loginTab.classList.remove('active');
      loginTab.setAttribute('aria-selected', 'false');
      registerTab.classList.add('active');
      registerTab.setAttribute('aria-selected', 'true');
      
      forgotPwLink.classList.add('fade-out');
      
      setTimeout(() => {
        forgotPwLink.classList.add('hidden');
        nameGroup.classList.remove('hidden');
        confirmGroup.classList.remove('hidden');
        termsContainer.classList.remove('hidden');
        
        nameGroup.classList.add('fade-in');
        confirmGroup.classList.add('fade-in');
        termsContainer.classList.add('fade-in');
        
        // Update labels & texts
        formHeading.innerHTML = 'Create <span class="highlight-orange">account.</span>';
        formSubheading.textContent = 'Register to start your business clearance application.';
        submitBtn.textContent = 'CREATE ACCOUNT';
        passwordInput.placeholder = 'Create a password';
        
        forgotPwLink.classList.remove('fade-out');
        
        setTimeout(() => {
          nameGroup.classList.remove('fade-in');
          confirmGroup.classList.remove('fade-in');
          termsContainer.classList.remove('fade-in');
        }, 250);
      }, 200);
    }
  }

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));

  // Toggle Password Visibility
  togglePwBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    if (isPassword) {
      eyeOpenIcon.classList.add('hidden');
      eyeClosedIcon.classList.remove('hidden');
      togglePwBtn.setAttribute('aria-label', 'Hide password');
    } else {
      eyeClosedIcon.classList.add('hidden');
      eyeOpenIcon.classList.remove('hidden');
      togglePwBtn.setAttribute('aria-label', 'Show password');
    }
  });

  // Real-Time Input Error Clearing
  const inputsList = [fullNameInput, emailInput, passwordInput, confirmPasswordInput, termsCheckbox];
  inputsList.forEach(input => {
    input.addEventListener('input', () => {
      const parent = input.closest('.input-group') || document.getElementById('terms-error').parentElement;
      if (parent) {
        parent.classList.remove('has-error');
      }
      
      // Special check for confirm-error when typing confirm password
      if (input === confirmPasswordInput || input === passwordInput) {
        document.getElementById('confirm-group').classList.remove('has-error');
      }
      
      if (input === termsCheckbox && termsCheckbox.checked) {
        document.getElementById('terms-error').style.display = 'none';
      }
    });
  });

  function clearAllErrors() {
    document.querySelectorAll('.input-group').forEach(el => el.classList.remove('has-error'));
    document.getElementById('terms-error').style.display = 'none';
  }

  // Form Validation
  function validateForm() {
    let isValid = true;
    
    // 1. Email validation (required for both login/register)
    const emailVal = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      setError(document.getElementById('email-group'));
      isValid = false;
    }
    
    // 2. Password validation (required for both)
    const pwVal = passwordInput.value;
    if (!pwVal || pwVal.length < 8) {
      setError(document.getElementById('password-group'));
      isValid = false;
    }
    
    // Mode-specific validations
    if (currentMode === 'register') {
      // 3. Name validation
      if (!fullNameInput.value.trim()) {
        setError(document.getElementById('name-group'));
        isValid = false;
      }
      
      // 4. Confirm Password validation
      if (confirmPasswordInput.value !== pwVal) {
        setError(document.getElementById('confirm-group'));
        isValid = false;
      }
      
      // 5. Terms validation
      if (!termsCheckbox.checked) {
        document.getElementById('terms-error').style.display = 'block';
        isValid = false;
      }
    }
    
    return isValid;
  }

  function setError(element) {
    if (element) {
      element.classList.add('has-error');
    }
  }

  // Form Submission
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors();
    
    const isValid = validateForm();
    
    if (isValid) {
      // Premium aesthetics: Show loading micro-animation on submit button
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.8';
      submitBtn.innerHTML = `<span class="spinner"></span> Processing...`;
      
      // Inject temporary spinner styles dynamically
      if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.innerHTML = `
          .spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 0.8s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Simulate API delay
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = originalText;
        
        // Show rich popup success
        const actionType = currentMode === 'register' ? 'Registration' : 'Login';
        alert(`🎉 ${actionType} Successful!\nWelcome to ILoveTaguig ECS.`);
        
        // Clear forms
        authForm.reset();
      }, 1500);
    }
  });
});
