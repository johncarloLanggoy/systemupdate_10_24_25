/* ===== Toggle Password Visibility ===== */
function togglePassword(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === "password") {
    input.type = "text";
    icon.classList.replace('bx-show', 'bx-hide');
  } else {
    input.type = "password";
    icon.classList.replace('bx-hide', 'bx-show');
  }
}

document.getElementById('toggleLoginPass')?.addEventListener('click', () => {
  togglePassword('loginPassword', 'toggleLoginPass');
});
document.getElementById('toggleRegPass')?.addEventListener('click', () => {
  togglePassword('regPassword', 'toggleRegPass');
});
document.getElementById('toggleRegConfirmPass')?.addEventListener('click', () => {
  togglePassword('regConfirmPassword', 'toggleRegConfirmPass');
});

/* ===== Open/Close Modal (fixed for inline display) ===== */
function openForm(form) {
  const modal = document.getElementById('authModal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
  switchAuth(form);
}

function closeForm() {
  const modal = document.getElementById('authModal');
  modal.classList.remove('show');
  const onEnd = () => {
    modal.style.display = 'none';
    modal.removeEventListener('transitionend', onEnd);
  };
  modal.addEventListener('transitionend', onEnd, { once: true });
}

window.addEventListener('click', (event) => {
  const modal = document.getElementById('authModal');
  if (event.target === modal) closeForm();
});

/* ===== Smooth Switch Login/Register/Admin/Staff ===== */
function switchAuth(form) {
  const loginBox = document.getElementById('loginBox');
  const registerBox = document.getElementById('registerBox');
  const adminBox = document.getElementById('adminBox');
  const staffBox = document.getElementById('staffBox');

  const boxes = { login: loginBox, register: registerBox };
  if (adminBox) boxes.admin = adminBox;
  if (staffBox) boxes.staff = staffBox;

  const showBox = boxes[form];
  if (!showBox) return;

  // Hide all other boxes
  Object.values(boxes).forEach(box => {
    if (box && box !== showBox) {
      box.classList.remove('active');
      setTimeout(() => { box.style.display = 'none'; }, 500);
    }
  });

  // Show selected box
  showBox.style.display = 'block';
  requestAnimationFrame(() => {
    showBox.classList.add('active');
  });

  // 🔥 FIX: Re-initialize password strength AND confirm password validation when switching to register form
  if (form === 'register') {
    setTimeout(() => {
      initializePasswordStrength();
      initializeConfirmPasswordValidation(); // 🔥 NEW: Also initialize confirm password validation
    }, 100);
  } else {
    // Hide requirements when switching away from register
    hideRequirements();
  }

  // Fix for clickable buttons: bring the selected box on top
  showBox.style.zIndex = 1001;
}

/* ===== Password Strength Initialization ===== */
function initializePasswordStrength() {
  const passwordInput = document.getElementById('regPassword');
  const strengthBar = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  const passwordStrength = document.querySelector('.password-strength');
  const registerSubmit = document.getElementById('registerSubmit');
  
  if (!passwordInput || !strengthBar || !strengthText) {
    return;
  }

  // Reset to initial state and HIDE the indicator
  passwordStrength.classList.add('hidden');
  strengthBar.style.width = '0%';
  strengthBar.style.background = '#2a2a2a';
  strengthText.textContent = 'Password strength';
  strengthText.style.color = '#888';
  
  if (registerSubmit) {
    registerSubmit.disabled = false;
  }
  
  hideRequirements();

  // Remove existing event listeners and add new one
  const newPasswordInput = passwordInput.cloneNode(true);
  passwordInput.parentNode.replaceChild(newPasswordInput, passwordInput);
  
  newPasswordInput.addEventListener('input', function() {
    updatePasswordStrength(this.value);
  });
}

function handlePasswordInput() {
  updatePasswordStrength(this.value);
}

/* ===== Enhanced Password Strength Validation ===== */
function checkPasswordStrength(password) {
    let score = 0;
    const requirements = {
        length: false,
        lowercase: false,
        uppercase: false,
        number: false,
        special: false
    };

    // Length requirement (at least 8 characters)
    if (password.length >= 8) {
        score += 1;
        requirements.length = true;
    }

    // Lowercase letters
    if (/[a-z]/.test(password)) {
        score += 1;
        requirements.lowercase = true;
    }

    // Uppercase letters
    if (/[A-Z]/.test(password)) {
        score += 1;
        requirements.uppercase = true;
    }

    // Numbers
    if (/[0-9]/.test(password)) {
        score += 1;
        requirements.number = true;
    }

    // Special characters
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        score += 1;
        requirements.special = true;
    }

    // Check if ALL requirements are met
    const allRequirementsMet = requirements.length && 
                              requirements.lowercase && 
                              requirements.uppercase && 
                              requirements.number && 
                              requirements.special;

    return { score, requirements, allRequirementsMet };
}

function updatePasswordStrength(password) {
    const strengthBar = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const passwordStrength = document.querySelector('.password-strength');
    const registerSubmit = document.getElementById('registerSubmit');
    const passwordInput = document.getElementById('regPassword');
    
    if (!password) {
        // Hide the indicator when no password
        passwordStrength.classList.add('hidden');
        strengthBar.style.width = '0%';
        strengthBar.style.background = '#2a2a2a';
        strengthText.textContent = 'Password strength';
        strengthText.style.color = '#888';
        passwordStrength.className = 'password-strength hidden';
        if (registerSubmit) registerSubmit.disabled = false;
        if (passwordInput) {
            passwordInput.style.border = '';
            passwordInput.style.boxShadow = '';
        }
        hideRequirements();
        return;
    }

    // Show the indicator when password has content
    passwordStrength.classList.remove('hidden');
    
    const { score, requirements, allRequirementsMet } = checkPasswordStrength(password);
    
    // Update strength bar and text
    let strengthLevel = '';
    let message = '';
    let isStrongEnough = false;
    
    if (allRequirementsMet) {
        strengthLevel = 'strength-strong';
        message = 'Strong password! - can register';
        isStrongEnough = true;
        if (passwordInput) {
            passwordInput.style.border = '2px solid #4CAF50';
            passwordInput.style.boxShadow = '0 0 8px rgba(76, 175, 80, 0.5)';
        }
    } else {
        // If ANY requirement is missing, show as weak
        strengthLevel = 'strength-weak';
        message = '❌ Missing requirements - cannot register';
        isStrongEnough = false;
        if (passwordInput) {
            passwordInput.style.border = '2px solid #ff4444';
            passwordInput.style.boxShadow = '0 0 8px rgba(255, 68, 68, 0.5)';
        }
    }

    strengthBar.style.width = allRequirementsMet ? '100%' : '25%';
    strengthBar.style.background = allRequirementsMet ? '#4CAF50' : '#ff4444';
    strengthText.textContent = message;
    passwordStrength.className = `password-strength ${strengthLevel}`;
    
    // Disable register button if not ALL requirements are met
    if (registerSubmit) {
        registerSubmit.disabled = !allRequirementsMet;
        if (!allRequirementsMet) {
            registerSubmit.style.opacity = '0.6';
            registerSubmit.style.cursor = 'not-allowed';
            registerSubmit.title = 'All password requirements must be met.';
        } else {
            registerSubmit.style.opacity = '1';
            registerSubmit.style.cursor = 'pointer';
            registerSubmit.title = '';
        }
    }
    
    updateRequirementsDisplay(requirements);
}

function getWidthFromScore(score) {
    const widths = ['25%', '50%', '75%', '100%', '100%'];
    return widths[score] || '0%';
}

function updateRequirementsDisplay(requirements) {
    let requirementsHtml = `
        <div class="password-requirements">
            <small style="display: block; margin-bottom: 8px; color: #ffb347;">Password must contain:</small>
            <ul>
                <li class="${requirements.length ? 'requirement-met' : 'requirement-unmet'}">
                    ${requirements.length ? '✓' : '✗'} At least 8 characters
                </li>
                <li class="${requirements.lowercase ? 'requirement-met' : 'requirement-unmet'}">
                    ${requirements.lowercase ? '✓' : '✗'} One lowercase letter (a-z)
                </li>
                <li class="${requirements.uppercase ? 'requirement-met' : 'requirement-unmet'}">
                    ${requirements.uppercase ? '✓' : '✗'} One uppercase letter (A-Z)
                </li>
                <li class="${requirements.number ? 'requirement-met' : 'requirement-unmet'}">
                    ${requirements.number ? '✓' : '✗'} One number (0-9)
                </li>
                <li class="${requirements.special ? 'requirement-met' : 'requirement-unmet'}">
                    ${requirements.special ? '✓' : '✗'} One special character (!@#$% etc.)
                </li>
            </ul>
        </div>
    `;

    // Remove existing requirements display
    const existingRequirements = document.querySelector('.password-requirements');
    if (existingRequirements) {
        existingRequirements.remove();
    }

    // Insert new requirements display
    const passwordWrapper = document.querySelector('#regPassword')?.closest('.password-wrapper');
    if (passwordWrapper) {
        passwordWrapper.insertAdjacentHTML('afterend', requirementsHtml);
    }
}

function hideRequirements() {
    const existingRequirements = document.querySelector('.password-requirements');
    if (existingRequirements) {
        existingRequirements.remove();
    }
}

/* ===== Admin & Staff Login Handling ===== */
document.addEventListener('DOMContentLoaded', () => {
  const adminForm = document.getElementById('adminForm');
  const staffForm = document.getElementById('staffForm');

  // Ensure buttons are enabled
  document.querySelectorAll('#adminForm button, #staffForm button').forEach(btn => btn.disabled = false);

  adminForm?.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = this.username.value.trim();
      const password = this.password.value.trim();

      if (!username || !password) {
          showAuthMessage("Please fill in all fields", "error", "admin");
          return;
      }

      fetch('/admin_login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
      }).then(res => res.json())
        .then(data => {
          if (data.success) {
              location.href = '/dashboard';
          } else {
              // Warn if a normal user tries to login
              if (data.message.includes("Invalid")) {
                  alert("Warning: You are not authorized to log in as Admin!");
              }
              showAuthMessage(data.message, "error", "admin");
          }
        }).catch(() => showAuthMessage("Server error", "error", "admin"));
  });

  staffForm?.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = this.username.value.trim();
      const password = this.password.value.trim();

      if (!username || !password) {
          showAuthMessage("Please fill in all fields", "error", "staff");
          return;
      }

      fetch('/staff_login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
      }).then(res => res.json())
        .then(data => {
          if (data.success) {
              location.href = '/dashboard';
          } else {
              // Warn if a normal user tries to login
              if (data.message.includes("Invalid")) {
                  alert("Warning: You are not authorized to log in as Staff!");
              }
              showAuthMessage(data.message, "error", "staff");
          }
        }).catch(() => showAuthMessage("Server error", "error", "staff"));
  });

  // Initialize password strength if register form is visible on load
  if (document.getElementById('registerBox').style.display === 'block') {
    initializePasswordStrength();
  }
});


/* ===== Inline Messages Helper ===== */
function showAuthMessage(msg, type = "error", form = "login") {
  const messageBox = form === "login"
    ? document.getElementById('loginMessage')
    : document.getElementById('registerMessage');
  messageBox.textContent = msg;
  messageBox.style.color = type === "error" ? "#ff4d4d" : "#4dff88";
  messageBox.style.fontWeight = "bold";
  messageBox.style.marginBottom = "10px";
}

/* ===== Client-Side Form Validation ===== */
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
  const username = this.username.value.trim();
  const password = this.password.value.trim();
  if (!username || !password) {
    e.preventDefault();
    showAuthMessage("Please fill in all fields", "error", "login");
  }
});

document.getElementById('registerForm')?.addEventListener('submit', function (e) {
  const username = this.username.value.trim();
  const email = this.email.value.trim();
  const password = this.password.value.trim();
  const confirm = this.confirm_password.value.trim();
  const phone = this.phone.value.trim();
  const address = this.address.value.trim();

  // Check for empty fields
  if (!username || !email || !password || !confirm || !phone || !address) {
    e.preventDefault();
    showAuthMessage("Please fill in all fields", "error", "register");
    return;
  }

  // NEW: Check if username is taken (by checking the current validation state)
  const usernameInput = document.querySelector('#registerForm input[name="username"]');
    if (usernameInput.classList.contains('username-taken')) {
      e.preventDefault();
      showAuthMessage("Username is already taken. Please choose another one.", "error", "register");
      usernameInput.focus();
      return;
    }

  // Check if passwords match
  if (password !== confirm) {
    e.preventDefault();
    showAuthMessage("Passwords do not match", "error", "register");
    return;
  }

  // Check phone number format
  if (!/^\d{11}$/.test(phone)) {
    e.preventDefault();
    showAuthMessage("Enter a valid phone number (11 digits)", "error", "register");
    return;
  }

  // 🔒 NEW: Check if ALL password requirements are met
  const { allRequirementsMet } = checkPasswordStrength(password);
  if (!allRequirementsMet) {
    e.preventDefault();
    showAuthMessage("❌ Password must meet ALL requirements! Please check the password guidelines.", "error", "register");
    
    // Ensure the strength indicator is visible
    const passwordStrength = document.querySelector('.password-strength');
    if (passwordStrength) {
      passwordStrength.classList.remove('hidden');
    }
    
    // Highlight the password field
    const passwordInput = document.getElementById('regPassword');
    if (passwordInput) {
      passwordInput.style.border = '2px solid #ff4444';
      passwordInput.style.boxShadow = '0 0 8px rgba(255, 68, 68, 0.5)';
      passwordInput.focus();
    }
    
    return;
  }

  // If all validations pass, allow form submission
});

/* ===== Real-time Username Validation for REGISTER FORM ===== */
function initializeUsernameValidation() {
    const usernameInput = document.querySelector('#registerForm input[name="username"]');
    if (!usernameInput) return;

    let validationTimeout;
    let fadeOutTimeout;
    
    usernameInput.addEventListener('input', function() {
        const username = this.value.trim();
        
        // Clear previous timeouts
        clearTimeout(validationTimeout);
        clearTimeout(fadeOutTimeout);
        
        // Clear previous validation state and hide message immediately
        clearUsernameValidation();
        
        // Only validate if username has content
        if (username.length > 0) {
            // Add loading state
            showUsernameValidation('Checking username...', 'loading', false); // Don't auto-fade loading
            
            // Debounce the validation (wait 500ms after user stops typing)
            validationTimeout = setTimeout(() => {
                checkUsernameAvailability(username);
            }, 500);
        } else {
            // Reset styling when empty
            this.classList.remove('username-available', 'username-taken');
        }
    });
    
    // Also clear validation when user focuses out (clicks elsewhere)
    usernameInput.addEventListener('blur', function() {
        // Keep the message visible for a bit longer when user moves away
        fadeOutTimeout = setTimeout(() => {
            clearUsernameValidation();
        }, 2000); // 2 seconds after focus loss
    });
    
    // Show message again when user focuses back (if there was a validation result)
    usernameInput.addEventListener('focus', function() {
        const username = this.value.trim();
        if (username.length > 0) {
            // Re-validate or show last result briefly
            const existingClass = this.classList.contains('username-available') ? 'success' : 
                                this.classList.contains('username-taken') ? 'error' : null;
            
            if (existingClass) {
                const message = existingClass === 'success' ? '✓ Username available' : '❌ Username already taken';
                showUsernameValidation(message, existingClass, true); // Auto-fade this one
            }
        }
    });
}

function checkUsernameAvailability(username) {
    fetch('/check_username', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.available) {
            showUsernameValidation('✓ Username available', 'success', true); // Auto-fade after 4 seconds
        } else {
            showUsernameValidation('❌ Username already taken', 'error', true); // Auto-fade after 4 seconds
        }
    })
    .catch(error => {
        console.error('Error checking username:', error);
        showUsernameValidation('⚠️ Error checking username', 'error', true); // Auto-fade after 4 seconds
    });
}

function showUsernameValidation(message, type, autoFade = false) {
    // Remove existing validation message
    clearUsernameValidation();
    
    const usernameInput = document.querySelector('#registerForm input[name="username"]');
    if (!usernameInput) return;
    
    // Create validation message element
    const validationElement = document.createElement('div');
    validationElement.className = `username-validation ${type} showing`;
    validationElement.textContent = message;
    
    // Insert after username input
    usernameInput.parentNode.appendChild(validationElement);
    
    // ✅ REMOVED: No border styling - just keep the message functionality
    
    // Auto-fade out after 4 seconds if requested
    if (autoFade && type !== 'loading') {
        setTimeout(() => {
            if (validationElement.parentNode) {
                validationElement.classList.remove('showing');
                validationElement.classList.add('fading');
                
                // Remove from DOM after fade animation
                setTimeout(() => {
                    if (validationElement.parentNode) {
                        validationElement.remove();
                    }
                }, 300);
            }
        }, 4000);
    }
}

function clearUsernameValidation() {
    const existingValidation = document.querySelector('.username-validation');
    if (existingValidation) {
        existingValidation.remove();
    }
}

// Keep the rest of your initialization code the same...
function initializeRegisterFormFeatures() {
    initializeUsernameValidation();
    initializePhoneValidation();
    // Your other register form initializations...
}

// Update the switchAuth function to initialize username validation when switching to register
function switchAuth(form) {
  const loginBox = document.getElementById('loginBox');
  const registerBox = document.getElementById('registerBox');
  const adminBox = document.getElementById('adminBox');
  const staffBox = document.getElementById('staffBox');

  const boxes = { login: loginBox, register: registerBox };
  if (adminBox) boxes.admin = adminBox;
  if (staffBox) boxes.staff = staffBox;

  const showBox = boxes[form];
  if (!showBox) return;

  // Hide all other boxes
  Object.values(boxes).forEach(box => {
    if (box && box !== showBox) {
      box.classList.remove('active');
      setTimeout(() => { box.style.display = 'none'; }, 500);
    }
  });

  // Show selected box
  showBox.style.display = 'block';
  requestAnimationFrame(() => {
    showBox.classList.add('active');
  });

  // Initialize register form features when switching to register
  if (form === 'register') {
    setTimeout(() => {
      initializeRegisterFormFeatures();
      initializePasswordStrength();
      initializeConfirmPasswordValidation();
    }, 100);
  } else {
    // Hide requirements when switching away from register
    hideRequirements();
  }

  // Fix for clickable buttons: bring the selected box on top
  showBox.style.zIndex = 1001;
}

// Also initialize if register form is already visible on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('registerBox').style.display === 'block') {
        initializeRegisterFormFeatures();
    }
});

/* ===== Live Confirm Password Validation ===== */
function initializeConfirmPasswordValidation() {
    const passwordInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regConfirmPassword');
    
    if (!passwordInput || !confirmInput) return;
    
    // Function to check password match
    function checkPasswordMatch() {
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        // Clear previous validation
        confirmInput.classList.remove('password-match', 'password-mismatch');
        
        if (confirm === '') {
            // Empty confirm field - neutral state
            return;
        }
        
        if (password === confirm) {
            // Passwords match
            confirmInput.classList.add('password-match');
            confirmInput.classList.remove('password-mismatch');
        } else {
            // Passwords don't match
            confirmInput.classList.add('password-mismatch');
            confirmInput.classList.remove('password-match');
        }
    }
    
    // Add event listeners to both fields
    passwordInput.addEventListener('input', checkPasswordMatch);
    confirmInput.addEventListener('input', checkPasswordMatch);
    
    // Also check when switching to register form
    document.addEventListener('DOMContentLoaded', function() {
        // Initial check if there are values already
        setTimeout(checkPasswordMatch, 100);
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeConfirmPasswordValidation();
});

/* ===== Real-time Phone Number Validation for REGISTER FORM ===== */
function initializePhoneValidation() {
    const phoneInput = document.querySelector('#registerForm input[name="phone"]');
    if (!phoneInput) return;

    let validationTimeout;
    let fadeOutTimeout;
    
    phoneInput.addEventListener('input', function() {
        // ✅ Philippine-style: Start with 09 and total 11 digits
        let phone = this.value.replace(/\D/g, ''); // Remove non-digits
        
        // Ensure it starts with 09
        if (!phone.startsWith('09') && phone.length > 0) {
            phone = '09' + phone.replace(/^09/, ''); // Add 09 prefix if missing
        }
        
        // Limit to 11 digits total
        phone = phone.slice(0, 11);
        this.value = phone;
        
        const phoneValue = this.value.trim();
        
        // Clear previous timeouts
        clearTimeout(validationTimeout);
        clearTimeout(fadeOutTimeout);
        
        // Clear previous validation state and hide message immediately
        clearPhoneValidation();
        
        // Real-time format validation for PH style
        if (phoneValue.length === 11 && phoneValue.startsWith('09')) {
            this.classList.add('valid-format');
            this.classList.remove('invalid-format');
        } else if (phoneValue.length > 0) {
            this.classList.add('invalid-format');
            this.classList.remove('valid-format');
        } else {
            this.classList.remove('valid-format', 'invalid-format');
        }
        
        // Only validate availability if phone number is complete PH style (09 + 9 digits)
        if (phoneValue.length === 11 && phoneValue.startsWith('09')) {
            // Add loading state
            showPhoneValidation('Checking phone number...', 'loading', false);
            
            // Debounce the validation
            validationTimeout = setTimeout(() => {
                checkPhoneAvailability(phoneValue);
            }, 500);
        } else {
            // Clear any existing validation messages
            clearPhoneValidation();
        }
    });
    
    // Also clear validation when user focuses out (clicks elsewhere)
    phoneInput.addEventListener('blur', function() {
        // Auto-format on blur if incomplete
        const phone = this.value.trim();
        if (phone.length > 0 && phone.length < 11 && !phone.startsWith('09')) {
            this.value = '09' + phone.replace(/^09/, '').slice(0, 9);
        }
        
        // Keep the message visible for a bit longer when user moves away
        fadeOutTimeout = setTimeout(() => {
            clearPhoneValidation();
        }, 2000);
    });
    
    // Show message again when user focuses back (if there was a validation result)
    phoneInput.addEventListener('focus', function() {
        const phone = this.value.trim();
        if (phone.length === 11 && phone.startsWith('09')) {
            // Re-validate or show last result briefly
            const existingClass = this.classList.contains('phone-available') ? 'success' : 
                                this.classList.contains('phone-taken') ? 'error' : null;
            
            if (existingClass) {
                const message = existingClass === 'success' ? '✓ Phone number available' : '❌ Phone number already registered';
                showPhoneValidation(message, existingClass, true);
            }
        }
    });
    
    // Enhanced form submission validation for PH style
    document.getElementById('registerForm')?.addEventListener('submit', function(e) {
        const phone = phoneInput.value.trim();
        
        // Enhanced PH phone validation
        if (!/^09\d{9}$/.test(phone)) {
            e.preventDefault();
            showAuthMessage("Please enter a valid Philippine phone number starting with 09 (11 digits total)", "error", "register");
            phoneInput.focus();
            return;
        }
        
        // NEW: Check if phone is taken (by checking the current validation state)
        if (phoneInput.classList.contains('phone-taken')) {
            e.preventDefault();
            showAuthMessage("Phone number is already registered. Please use a different number.", "error", "register");
            phoneInput.focus();
            return;
        }
        
        // Your existing password validation remains...
        const { allRequirementsMet } = checkPasswordStrength(this.password.value);
        if (!allRequirementsMet) {
            e.preventDefault();
            showAuthMessage("❌ Password must meet ALL requirements!", "error", "register");
            return;
        }
    });
}

function checkPhoneAvailability(phone) {
    // Show loading state
    showPhoneValidation('Checking phone number...', 'loading', false);
    
    fetch('/check_phone', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phone })
    })
    .then(response => response.json())
    .then(data => {
        if (data.available) {
            showPhoneValidation('✓ Phone number available', 'success', true); // Auto-fade after 4 seconds
        } else {
            showPhoneValidation('❌ Phone number already registered', 'error', true); // Auto-fade after 4 seconds
        }
    })
    .catch(error => {
        console.error('Error checking phone:', error);
        showPhoneValidation('⚠️ Error checking phone number', 'error', true); // Auto-fade after 4 seconds
    });
}

function showPhoneValidation(message, type, autoFade = false) {
    // Remove existing validation message
    clearPhoneValidation();
    
    const phoneInput = document.querySelector('#registerForm input[name="phone"]');
    if (!phoneInput) return;
    
    // Create validation message element
    const validationElement = document.createElement('div');
    validationElement.className = `phone-validation ${type} showing`;
    validationElement.textContent = message;
    
    // Insert after phone input
    phoneInput.parentNode.appendChild(validationElement);
    
    // ✅ REMOVED: No border styling - just keep the message functionality
    
    // Auto-fade out after 4 seconds if requested
    if (autoFade && type !== 'loading') {
        setTimeout(() => {
            if (validationElement.parentNode) {
                validationElement.classList.remove('showing');
                validationElement.classList.add('fading');
                
                // Remove from DOM after fade animation
                setTimeout(() => {
                    if (validationElement.parentNode) {
                        validationElement.remove();
                    }
                }, 300);
            }
        }, 4000);
    }
}

function clearPhoneValidation() {
    const existingValidation = document.querySelector('.phone-validation');
    if (existingValidation) {
        existingValidation.remove();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePhoneValidation();
});

// Update form submission validation
document.getElementById('registerForm')?.addEventListener('submit', function(e) {
    const phone = this.phone.value.trim();

    // Your existing password validation...
    const { allRequirementsMet } = checkPasswordStrength(this.password.value);
    if (!allRequirementsMet) {
        e.preventDefault();
        showAuthMessage("❌ Password must meet ALL requirements!", "error", "register");
        return;
    }
});

function centerModal() {
  const modalContent = document.querySelector('.modal-content');
  if (!modalContent) return;
  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight;
  const contentHeight = modalContent.offsetHeight;
  const topPos = scrollY + (viewportHeight - contentHeight) / 2;
  modalContent.style.top = `${Math.max(topPos, 20)}px`;
}

window.addEventListener('scroll', centerModal);
window.addEventListener('resize', centerModal);

/* ===== Display server-side messages ===== */
window.addEventListener('DOMContentLoaded', () => {
  const loginMsg = document.getElementById('loginMessage')?.textContent.trim();
  const registerMsg = document.getElementById('registerMessage')?.textContent.trim();
  if (loginMsg) openForm('login');
  if (registerMsg) openForm('register');
});

/* ===== Swiper Slider ===== */
const swiper = new Swiper('.swiper-container', {
  slidesPerView: 3,
  spaceBetween: 30,
  centeredSlides: true,
  loop: true,
  slideToClickedSlide: true,
  effect: 'coverflow',
  coverflowEffect: { rotate: 0, stretch: 0, depth: 100, modifier: 1, slideShadows: false, scale: 0.9 },
  autoplay: { delay: 2500, disableOnInteraction: false },
  pagination: { el: '.swiper-pagination', clickable: true },
  navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
  breakpoints: { 480: { slidesPerView: 1, spaceBetween: 15 }, 768: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 3, spaceBetween: 30 } },
});

/* ===== About Section Images Fade ===== */
const topLeftImages = ['/static/1.jpg', '/static/3.jpg', '/static/2.jpg'];
const bottomRightImages = ['/static/3.jpg', '/static/2.jpg', '/static/1.jpg'];
let topIndex = 0, bottomIndex = 0;

function fadeImage(imgElement, newSrc) {
  imgElement.style.opacity = 0;
  setTimeout(() => { imgElement.src = newSrc; imgElement.style.opacity = 1; }, 1000);
}

setInterval(() => {
  topIndex = (topIndex + 1) % topLeftImages.length;
  bottomIndex = (bottomIndex + 1) % bottomRightImages.length;
  fadeImage(document.querySelector('.about-img.top-left'), topLeftImages[topIndex]);
  fadeImage(document.querySelector('.about-img.bottom-right'), bottomRightImages[bottomIndex]);
}, 3000);

/* ===== Scroll-to-Top Button ===== */
const scrollBtn = document.getElementById("scrollTopBtn");
window.onscroll = function() {
  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) scrollBtn.style.display = "block";
  else scrollBtn.style.display = "none";
};
scrollBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* ===== Rating System ===== */
const isLoggedIn = document.body.dataset.loggedIn === 'true';

async function rateFood(food, stars) {
  if (!isLoggedIn) { 
    openForm('login'); 
    showGuestToast(); 
    return; 
  }

  // 🔒 Check if user has ordered this food
  const res = await fetch("/can_rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ food })
  });
  const data = await res.json();

  if (!data.allowed) {
    showToast("🚫 You can only rate this food after ordering it first.", "warning");
    return;
  }

  // ✅ Try to submit rating
  const rateRes = await fetch("/rate", { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ food, rating: stars }) 
  });

  const rateData = await rateRes.json();

  if (!rateData.success && rateData.error === "Already rated") {
    showToast("⚠️ You already gave a rating for this order.", "error");
    return;
  }

  if (rateData.success) {
    showToast("✅ Thanks for rating! Your feedback is saved.", "success");
  } else {
    showToast("❌ Something went wrong while rating. Please try again.", "error");
  }

  loadFoodData();
}



function updateStars(food, avg) {
  const starElems = document.querySelectorAll(`.stars[data-food="${food}"] i`);
  starElems.forEach((star, i) => {
    if (i < Math.round(avg)) { 
      star.classList.remove("bx-star"); 
      star.classList.add("bxs-star", "star-checked"); 
    }
    else { 
      star.classList.remove("bxs-star", "star-checked"); 
      star.classList.add("bx-star"); 
    }
  });
}

async function loadFoodData() {
  const res = await fetch("/food_data");
  const data = await res.json();
  for (const food in data) {
    const avg = data[food].avg_rating?.toFixed(1) || 0;
    document.getElementById(`avg-${food}`).innerText = `⭐ Average Rating: ${avg}`;
    updateStars(food, avg);
  }
}
window.addEventListener("DOMContentLoaded", loadFoodData);

async function loadRatings() {
  const res = await fetch("/get_ratings");
  const data = await res.json();
  const foods = ["Tapsilog", "Silog", "Porksilog", "Longsilog", "Maling silog", "Bangus silog", "Hotsilog"];
  foods.forEach(food => {
    const container = document.getElementById(`ratings-${food}`);
    if (!container) return;
    container.innerHTML = "";
    data.filter(r => r.food === food).forEach(r => {
      const div = document.createElement("div");
      div.textContent = `${r.username}: ${r.rating} ⭐`;
      container.appendChild(div);
    });
  });
}
loadRatings();


/* ===== Profanity Filter for Client-Side ===== */
const profanityList = [
    'shit', 'fuck', 'asshole', 'bitch', 'damn', 'hell', 'dick', 'pussy', 'cock',
    'whore', 'slut', 'bastard', 'motherfucker', 'cunt', 'faggot', 'nigger',
    // Filipino profanity
    'putang', 'puta', 'gago', 'tangina', 'ulol', 'bobo', 'tarantado', 'punyeta',
    'leche', 'bulok', 'siraulo', 'hayop', 'animal', 'lintik', 'shet', 'pakshet',
    'gagu', 'bwisit', 'pakyu', 'pota', 'potang', 'tanga', 'engot', 'sira'
];

function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    return profanityList.some(word => lowerText.includes(word));
}

/* ===== Global Comment Section ===== */
const commentInput = document.getElementById('global-comment-input');
const commentSubmit = document.getElementById('global-comment-submit');
const commentContainer = document.getElementById('global-comments');

async function loadGlobalComments() {
  const res = await fetch('/get_comments_global');
  const data = await res.json();
  commentContainer.innerHTML = '';
  data.reverse().forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `<strong>${c.username}:</strong> ${c.comment}`;
    commentContainer.appendChild(div);
  });
  commentContainer.scrollTop = commentContainer.scrollHeight;
}

// Function to post comment
async function postComment() {
  if (!isLoggedIn) { 
    openForm('login'); 
    showGuestToast(); 
    return; 
  }
  
  const comment = commentInput.value.trim();
  
  if (!comment) {
    showToast("❌ Please write a comment before posting.", "error");
    return;
  }
  
  // Client-side profanity check (immediate feedback)
  if (containsProfanity(comment)) {
    showToast("🚫 Please keep comments respectful. Inappropriate language is not allowed.", "error");
    
    // Highlight the input to draw attention
    commentInput.style.border = '2px solid #ff4444';
    commentInput.style.boxShadow = '0 0 8px rgba(255, 68, 68, 0.5)';
    setTimeout(() => {
      commentInput.style.border = '';
      commentInput.style.boxShadow = '';
    }, 3000);
    
    return;
  }
  
  // Check comment length
  if (comment.length > 500) {
    showToast("❌ Comment is too long. Maximum 500 characters.", "error");
    return;
  }
  
  try {
    const response = await fetch('/add_comment_global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      // Handle server-side errors (including profanity filter)
      if (result.error && result.error.includes('inappropriate')) {
        showToast("🚫 " + result.error, "error");
      } else if (result.error && result.error.includes('too long')) {
        showToast("❌ " + result.error, "error");
      } else {
        showToast("❌ Failed to post comment: " + (result.error || 'Unknown error'), "error");
      }
      return;
    }
    
    // Success
    commentInput.value = '';
    await loadGlobalComments();
    showToast("✅ Comment posted successfully!", "success");
    
  } catch (error) {
    console.error('Error posting comment:', error);
    showToast("❌ Network error. Please try again.", "error");
  }
}

// Submit via button click
commentSubmit?.addEventListener('click', postComment);

// Submit via Enter key
commentInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { // shift+enter allows new line
    e.preventDefault();
    postComment();
  }
});

window.addEventListener('DOMContentLoaded', loadGlobalComments);

// ===== NOTIFICATION SYSTEM ===== 
// Add this without changing any existing code
function initializeNotificationSystem() {
    // Only show for customers (not admin/staff)
    if (document.body.classList.contains('admin') || document.querySelector('.adminBox') || document.querySelector('.staffBox')) {
        return;
    }
    createNotificationBell();
    checkForNotifications();
    setInterval(checkForNotifications, 30000);
}

function createNotificationBell() {
    const navWrapper = document.querySelector('.nav-wrapper');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    if (!navWrapper || !profileDropdown) return;

    // Check if notification bell already exists
    if (document.querySelector('.notification-bell')) return;

    const notificationBell = document.createElement('div');
    notificationBell.className = 'notification-bell';
    notificationBell.innerHTML = `
        <button class="nav-btn notification-btn" title="Notifications">
            <i class="bx bx-bell"></i>
            <span class="notification-count" style="display: none">0</span>
        </button>
        <div class="notification-dropdown" style="display: none;">
            <div class="notification-header">
                <h4>Notifications</h4>
                <button class="clear-notifications">Clear All</button>
            </div>
            <div class="notification-list"></div>
            <div class="notification-empty">No new notifications</div>
        </div>
    `;

    navWrapper.insertBefore(notificationBell, profileDropdown);
    
    const bellBtn = notificationBell.querySelector('.notification-btn');
    const dropdown = notificationBell.querySelector('.notification-dropdown');
    const clearBtn = notificationBell.querySelector('.clear-notifications');
    
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    clearBtn.addEventListener('click', clearAllNotifications);
    
    document.addEventListener('click', () => {
        dropdown.style.display = 'none';
    });
    
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

async function checkForNotifications() {
    try {
        const response = await fetch('/api/check_notifications');
        if (!response.ok) return;
        const notifications = await response.json();
        updateNotificationUI(notifications);
        showBrowserNotifications(notifications);
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// UPDATED: Enhanced notification UI with different styling for all order types
function updateNotificationUI(notifications) {
    const notificationBell = document.querySelector('.notification-bell');
    if (!notificationBell) return;
    
    const countElement = notificationBell.querySelector('.notification-count');
    const dropdown = notificationBell.querySelector('.notification-dropdown');
    const listElement = notificationBell.querySelector('.notification-list');
    const emptyElement = notificationBell.querySelector('.notification-empty');
    
    const unreadCount = notifications.length;
    
    if (unreadCount > 0) {
        countElement.textContent = unreadCount > 9 ? '9+' : unreadCount;
        countElement.style.display = 'flex';
        countElement.classList.add('pulse');
    } else {
        countElement.style.display = 'none';
        countElement.classList.remove('pulse');
    }
    
    if (unreadCount > 0) {
        emptyElement.style.display = 'none';
        listElement.style.display = 'block';
        listElement.innerHTML = notifications.map(notif => {
            let icon, bgColor, borderColor;
            
            // NEW: Determine notification type and styling
            if (notif.message.includes('rejected')) {
                // Rejected orders - red
                icon = '❌';
                bgColor = 'rgba(244, 67, 54, 0.1)';
                borderColor = '#f44336';
            } else if (notif.message.includes('served')) {
                // Served orders - blue
                icon = '🎉';
                bgColor = 'rgba(33, 150, 243, 0.1)';
                borderColor = '#2196F3';
            } else {
                // Ready orders - green
                icon = '✅';
                bgColor = 'rgba(76, 175, 80, 0.1)';
                borderColor = '#4CAF50';
            }
            
            return `
                <div class="notification-item" data-id="${notif.id}" 
                     style="background: ${bgColor}; border-left: 3px solid ${borderColor};">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="font-size: 16px;">${icon}</span>
                        <div style="flex: 1;">
                            <div class="notification-message">${notif.message}</div>
                            <div class="notification-time">${notif.created_at}</div>
                        </div>
                    </div>
                    <button class="mark-read-btn" data-id="${notif.id}">✓</button>
                </div>
            `;
        }).join('');
        
        listElement.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const notifId = btn.dataset.id;
                await markNotificationAsRead(notifId);
                btn.closest('.notification-item').remove();
                checkForNotifications();
            });
        });
        
        listElement.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (!e.target.classList.contains('mark-read-btn')) {
                    const notifId = item.dataset.id;
                    await markNotificationAsRead(notifId);
                    item.remove();
                    checkForNotifications();
                }
            });
        });
        
    } else {
        listElement.style.display = 'none';
        emptyElement.style.display = 'block';
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        await fetch(`/api/mark_notification_read/${notificationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function clearAllNotifications() {
    try {
        const notifications = document.querySelectorAll('.notification-item');
        for (const notif of notifications) {
            const notifId = notif.dataset.id;
            await markNotificationAsRead(notifId);
        }
        checkForNotifications();
    } catch (error) {
        console.error('Error clearing notifications:', error);
    }
}

// UPDATED: Enhanced browser notifications for all order types
function showBrowserNotifications(notifications) {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
    
    notifications.forEach(notif => {
        // For ready orders
        if (notif.message.includes('ready for pickup')) {
            new Notification("Leshley's Eatery - Order Ready", {
                body: notif.message,
                icon: "/static/logo.png",
                tag: `order-ready-${notif.order_id}`
            });
        }
        // NEW: For rejected orders
        else if (notif.message.includes('rejected')) {
            new Notification("Leshley's Eatery - Order Rejected", {
                body: notif.message,
                icon: "/static/logo.png",
                tag: `order-rejected-${notif.order_id}`,
                requireInteraction: true // Keep notification until user dismisses it
            });
        }
        // NEW: For served orders
        else if (notif.message.includes('served')) {
            new Notification("Leshley's Eatery - Order Served", {
                body: notif.message,
                icon: "/static/logo.png",
                tag: `order-served-${notif.order_id}`
            });
        }
    });
}

// Add the CSS styles dynamically
function addNotificationStyles() {
    if (document.querySelector('#notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        /* Notification Bell Styles */
        .notification-bell {
            position: relative;
            display: inline-block;
            margin-right: 10px;
        }

        .notification-btn {
            position: relative;
        }

        .notification-count {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        .notification-count.pulse {
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .notification-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            width: 300px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
        }

        .notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #eee;
            background: #f8f9fa;
        }

        .notification-header h4 {
            margin: 0;
            color: #333;
        }

        .clear-notifications {
            background: none;
            border: none;
            color: #ff4444;
            cursor: pointer;
            font-size: 12px;
        }

        .clear-notifications:hover {
            text-decoration: underline;
        }

        .notification-list {
            max-height: 300px;
            overflow-y: auto;
        }

        .notification-item {
            padding: 12px 15px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background 0.2s;
            position: relative;
            border-radius: 6px;
            margin-bottom: 5px;
        }

        .notification-item:hover {
            background: #f8f9fa;
        }

        .notification-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .notification-message {
            font-size: 14px;
            color: #333;
            margin-bottom: 5px;
        }

        .notification-time {
            font-size: 12px;
            color: #888;
        }

        .mark-read-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .notification-empty {
            padding: 20px;
            text-align: center;
            color: #888;
            font-style: italic;
        }

        /* NEW: Notification type styling */
        .notification-item[style*="background: rgba(33, 150, 243, 0.1)"] {
            border-left: 3px solid #2196F3 !important;
        }

        .notification-item[style*="background: rgba(33, 150, 243, 0.1)"]:hover {
            background: rgba(33, 150, 243, 0.15) !important;
        }

        .notification-item[style*="background: rgba(244, 67, 54, 0.1)"] {
            border-left: 3px solid #f44336 !important;
        }

        .notification-item[style*="background: rgba(244, 67, 54, 0.1)"]:hover {
            background: rgba(244, 67, 54, 0.15) !important;
        }
    `;
    document.head.appendChild(style);
}
// ===== END NOTIFICATION SYSTEM =====

document.addEventListener("DOMContentLoaded", function () {
  // All nav dropdowns
  const navDropdowns = document.querySelectorAll(".nav-dropdown");
  // Profile dropdown
  const profileDropdown = document.querySelector(".profile-dropdown");
  const profileBtn = profileDropdown.querySelector(".profile-btn");

  // Handle nav dropdowns
  navDropdowns.forEach(dropdown => {
    const button = dropdown.querySelector(".dropdown-btn");

    button.addEventListener("click", function (e) {
      e.stopPropagation();

      // Close other nav dropdowns and profile dropdown
      navDropdowns.forEach(d => {
        if (d !== dropdown) d.classList.remove("active");
      });
      profileDropdown.classList.remove("active");
      profileBtn.classList.remove("active");

      // Toggle current dropdown
      const isActive = dropdown.classList.contains("active");
      dropdown.classList.toggle("active", !isActive); // stay active when clicked
    });
  });

  // Handle profile dropdown
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Close all nav dropdowns
    navDropdowns.forEach(d => d.classList.remove("active"));

    // Toggle profile dropdown
    const isActive = profileDropdown.classList.contains("active");
    profileDropdown.classList.toggle("active", !isActive);
    profileBtn.classList.toggle("active", !isActive);
  });

  // Close everything if clicking outside
  document.addEventListener("click", () => {
    navDropdowns.forEach(d => d.classList.remove("active"));
    profileDropdown.classList.remove("active");
    profileBtn.classList.remove("active");
  });

  // Initialize notification system without affecting existing functionality
  addNotificationStyles();
  initializeNotificationSystem();
});

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 100);

  // Auto-remove after 3s
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function animateOnScroll() {
  const elements = document.querySelectorAll('.scroll-animate');
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight - 100) {
      if (!el.classList.contains('visible')) {
        const children = el.children;
        for (let i = 0; i < children.length; i++) {
          children[i].style.transitionDelay = `${i * 0.5}s`; // 0.5s between each child
        }
        el.classList.add('visible');
      }
    }
  });
}

window.addEventListener('scroll', animateOnScroll);
window.addEventListener('DOMContentLoaded', animateOnScroll);

// Simple IntersectionObserver for scroll-triggered per-menu-item animations
document.addEventListener('DOMContentLoaded', function() {
  const menuSection = document.querySelector('.menu-section');
  const menuItems = document.querySelectorAll('.menu-col'); // Targets every full menu item in the list
  const menuRows = document.querySelectorAll('.menu-row');
  const menuHeader = document.querySelector('.menu-header');

  const observerOptions = {
    threshold: 0.2, // Trigger when 20% of the menu item is visible
    rootMargin: '0px 0px -100px 0px' // Start a bit earlier for smoother scroll
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        
        // Trigger section-wide .in-view for rows and header
        if (target === menuSection) {
          menuSection.classList.add('in-view');
        }
        // Trigger row animations
        else if (menuRows.includes(target)) {
          target.style.animationPlayState = 'running';
        }
        // Trigger individual menu item animations (one per .menu-col)
        else if (menuItems.includes(target)) {
          target.classList.add('animate');
          observer.unobserve(target); // Only animate on first appearance
        }
      }
    });
  }, observerOptions);

  // Observe the section, rows, and EVERY menu item in the list
  if (menuSection) observer.observe(menuSection);
  menuRows.forEach(row => observer.observe(row));
  menuItems.forEach(item => observer.observe(item)); // This ensures each full menu item is handled separately
});

async function refreshMenuStatus() {
  try {
    const res = await fetch('/get_menu_status');
    if (!res.ok) throw new Error("Failed to fetch menu status");
    const data = await res.json();

    document.querySelectorAll('.menu-col').forEach(item => {
      const food = item.dataset.food;
      const statusEl = item.querySelector('.status');
      if (!statusEl || !food) return;

      if (data[food]) {
        statusEl.textContent = data[food];
        if (data[food] === "Available") {
          statusEl.classList.add('available');
          statusEl.classList.remove('not-available');
        } else {
          statusEl.classList.add('not-available');
          statusEl.classList.remove('available');
        }
      } else {
        statusEl.textContent = "Unknown";
        statusEl.classList.remove('available', 'not-available');
      }
    });
  } catch (err) {
    console.error(err);
  }
}

// Update every 5 seconds
setInterval(refreshMenuStatus, 5000);

// Run once on page load
document.addEventListener('DOMContentLoaded', refreshMenuStatus);
