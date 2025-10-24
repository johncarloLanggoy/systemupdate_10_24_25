const plusBtns = document.querySelectorAll(".plus");
const minusBtns = document.querySelectorAll(".minus");
const counts = document.querySelectorAll(".count");
const totalPriceEl = document.getElementById("totalPrice");
const orderBtn = document.getElementById("orderBtn");
const orderPopup = document.getElementById("orderPopup");
const closePopup = document.getElementById("closePopup");
const orderDate = document.getElementById("orderDate");
const orderSummary = document.getElementById("orderSummary");
const cards = document.querySelectorAll(".card");

const items = ["Tapsilog","Longsilog","Maling silog","Hotsilog","Silog","Bangus silog","Porksilog"];
const prices = [120,80,50,60,60,90,70];

let quantities = Array(prices.length).fill(0);

// Check if user is logged in
const isLoggedIn = document.body.dataset.loggedIn === 'true';

// ✅ Disable order button initially if no items
orderBtn.disabled = true;

function updateTotal() {
    let total = 0;
    quantities.forEach((q,i) => total += q * prices[i]);
    totalPriceEl.textContent = total.toFixed(2);

    // ✅ Enable order button only if total > 0
    orderBtn.disabled = total === 0;

    totalPriceEl.style.transform = "scale(1.2)";
    setTimeout(() => totalPriceEl.style.transform = "scale(1)", 150);

    // 🪙 Update QR amount text
    const qrText = document.getElementById("qrAmountText");
    if (qrText) qrText.textContent = `Amount to pay: ₱${total.toFixed(2)}`;
}

function updateSummary() {
    let html = "";
    let hasItems = false;
    quantities.forEach((q,i) => {
        if(q > 0){
            html += `<p>${items[i]} x ${q} = ₱${q * prices[i]}</p>`;
            hasItems = true;
        }
    });
    if(!hasItems) html = "<p>No items selected yet.</p>";
    orderSummary.innerHTML = html;
}

// Real-time stock validation for quantity buttons
function initializeQuantityControls() {
    document.querySelectorAll('.card').forEach((card, i) => {
        const minusBtn = card.querySelector('.minus');
        const plusBtn = card.querySelector('.plus');
        const countSpan = card.querySelector('.count');
        const hiddenInput = card.querySelector('.quantity-input-hidden');
        const stockSpan = card.querySelector('.stock-out, .stock-low, .stock-good');
        const maxStock = parseInt(stockSpan?.textContent) || 0;
        const isAvailable = card.dataset.available === 'true';

        let currentCount = quantities[i] || 0;

        // Plus button click
        plusBtn.addEventListener('click', function() {
            if (!isAvailable) return;
            
            if (currentCount < maxStock) {
                currentCount++;
                quantities[i] = currentCount;
                updateQuantity();
                updateTotal();
                updateSummary();
            } else {
                showNotification(`❌ Only ${maxStock} units available for ${card.querySelector('h3').textContent}`, "error");
            }
        });

        // Minus button click
        minusBtn.addEventListener('click', function() {
            if (!isAvailable) return;
            
            if (currentCount > 0) {
                currentCount--;
                quantities[i] = currentCount;
                updateQuantity();
                updateTotal();
                updateSummary();
            }
        });

        function updateQuantity() {
            countSpan.textContent = currentCount;
            if (hiddenInput) hiddenInput.value = currentCount;
            
            // Update button states based on stock
            plusBtn.disabled = currentCount >= maxStock;
            minusBtn.disabled = currentCount <= 0;
            
            // Visual feedback for max stock
            if (currentCount >= maxStock) {
                plusBtn.style.opacity = '0.5';
                plusBtn.style.cursor = 'not-allowed';
            } else {
                plusBtn.style.opacity = '1';
                plusBtn.style.cursor = 'pointer';
            }

            // Animation
            countSpan.style.transform = "scale(1.4)";
            setTimeout(() => countSpan.style.transform = "scale(1)", 150);
        }

        // Initialize button states
        updateQuantity();
    });
}

// ===== IMAGE UPLOAD VALIDATION =====
const orderImageInput = document.getElementById("orderImage");
const imagePreview = document.getElementById("imagePreview");
const confirmBtn = document.querySelector("#orderForm button[type='submit']");

function initializeImageValidation() {
    if (!orderImageInput || !confirmBtn) return;
    
    // Disable confirm button initially
    disableConfirmButton();
    
    // Check image on change
    orderImageInput.addEventListener("change", function() {
        const file = this.files[0];
        
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                showNotification("❌ Please upload a valid image (JPG, PNG, GIF)", "error");
                this.value = '';
                disableConfirmButton();
                return;
            }
            
            // Validate file size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                showNotification("❌ Image size must be less than 5MB", "error");
                this.value = '';
                disableConfirmButton();
                return;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
                
                // Enable confirm button
                enableConfirmButton();
                showNotification(" Image uploaded successfully!", "success");
            };
            reader.readAsDataURL(file);
        } else {
            // No file selected
            imagePreview.style.display = "none";
            disableConfirmButton();
        }
    });
    
    // Also validate on form submission
    document.getElementById("orderForm").addEventListener("submit", function(e) {
        if (!orderImageInput.files[0]) {
            e.preventDefault();
            showNotification("❌ Please upload your payment receipt image", "error");
            orderImageInput.focus();
        }
    });
}

function disableConfirmButton() {
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.6';
        confirmBtn.style.cursor = 'not-allowed';
        confirmBtn.innerHTML = '<i class="bx bx-upload"></i> Upload Receipt to Confirm Order';
    }
}

function enableConfirmButton() {
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.innerHTML = 'Confirm & Submit Order';
    }
}

// Enhanced form submission validation
function initializeFormValidation() {
    const orderForm = document.querySelector('form');
    if (!orderForm) return;

    orderForm.addEventListener('submit', function(e) {
        const selectedItems = [];
        let hasErrors = false;
        
        // Check if image is uploaded
        if (!orderImageInput.files[0]) {
            showNotification("❌ Please upload your payment receipt image", "error");
            e.preventDefault();
            return false;
        }
        
        document.querySelectorAll('.card').forEach(card => {
            const quantity = parseInt(card.querySelector('.count').textContent) || 0;
            const foodName = card.querySelector('h3').textContent;
            const maxStock = parseInt(card.querySelector('.stock-out, .stock-low, .stock-good')?.textContent) || 0;
            const isAvailable = card.dataset.available === 'true';
            
            if (quantity > 0) {
                if (!isAvailable) {
                    showNotification(`❌ ${foodName} is currently unavailable`, "error");
                    hasErrors = true;
                } else if (quantity > maxStock) {
                    showNotification(`❌ Only ${maxStock} units available for ${foodName}`, "error");
                    hasErrors = true;
                } else {
                    selectedItems.push({ food: foodName, quantity: quantity });
                }
            }
        });
        
        if (hasErrors) {
            e.preventDefault();
            return false;
        }
        
        if (selectedItems.length === 0) {
            showNotification("❌ Please select at least one item to order", "error");
            e.preventDefault();
            return false;
        }
    });
}

// Global auth modal function (used for guest modal)
window.openForm = function(formType) {
    const authModal = document.getElementById('authModal');
    if(!authModal) return; // in case page has no auth modal
    const loginBox = document.getElementById('loginBox');
    const registerBox = document.getElementById('registerBox');

    authModal.style.display = 'flex';
    if (formType === 'login') {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
    } else {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
    }
};

// Order button click
orderBtn.addEventListener("click", () => {
    if(isLoggedIn){
        orderPopup.style.display = "flex";
        orderDate.value = new Date().toLocaleString();
        updateSummary();
        document.getElementById("custName").focus();
        
        // Reset image and disable confirm button when popup opens
        if (orderImageInput) {
            orderImageInput.value = '';
            imagePreview.style.display = 'none';
            disableConfirmButton();
        }
    } else {
        // Guest user: open landing page auth modal if exists
        if(document.getElementById('authModal')){
            openForm('login');
        } else {
            // fallback: inline guest popup
            const guestModal = document.createElement('div');
            guestModal.classList.add('popup');
            guestModal.id = 'guestModal';
            guestModal.style.justifyContent = "center";
            guestModal.style.alignItems = "center";
            guestModal.innerHTML = `
                <div class="popup-content" style="text-align:center; padding:25px; border-radius:12px; max-width:400px; background: #1b1b1b; color:#fff; box-shadow:0 0 20px rgba(0,0,0,0.5);">
                    <span class="close-btn" id="closeGuestPopup" style="position:absolute; top:10px; right:12px; cursor:pointer; font-size:22px;">&times;</span>
                    <h2 style="color: #ffb347; margin-bottom:10px;">Hello, Guest!</h2>
                    <p>
                    To place an order, please 
                    <a href="${homeUrl}?form=login" style="color:#ff8000; font-weight:bold;">Log In</a> 
                    or 
                    <a href="${homeUrl}?form=register" style="color:#ff8000; font-weight:bold;">Register</a>.
                    </p>
                </div>
            `;
            document.body.appendChild(guestModal);
            guestModal.style.display = 'flex';

            const closeBtn = document.getElementById('closeGuestPopup');
            closeBtn.onclick = () => guestModal.remove();
            guestModal.onclick = (e) => { if(e.target == guestModal) guestModal.remove(); };
        }
    }
});

// Close order popup
closePopup.addEventListener("click", () => orderPopup.style.display = "none");
window.addEventListener("keydown", e => { if(e.key === "Escape") orderPopup.style.display = "none"; });

// Order form submission
document.getElementById("orderForm").addEventListener("submit", e => {
    e.preventDefault();
    
    // Final image validation
    if (!orderImageInput.files[0]) {
        showNotification("❌ Please upload your payment receipt image", "error");
        orderImageInput.focus();
        return;
    }
    
    const hiddenDiv = document.getElementById("hiddenInputs");
    hiddenDiv.innerHTML = "";

    quantities.forEach((q,i) => {
        const card = cards[i];
        if(q > 0 && !card.classList.contains("unavailable")) {
            const foodInput = document.createElement("input");
            foodInput.type = "hidden";
            foodInput.name = "food";
            foodInput.value = items[i];

            const qtyInput = document.createElement("input");
            qtyInput.type = "hidden";
            qtyInput.name = "quantity";
            qtyInput.value = q;

            hiddenDiv.appendChild(foodInput);
            hiddenDiv.appendChild(qtyInput);
        }
    });

    orderPopup.querySelector('.popup-content').style.transform = "scale(0.8)";
    setTimeout(() => e.target.submit(), 200);
});

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
  // Mobile menu elements
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navWrapper = document.querySelector(".nav-wrapper");
  const mobileOverlay = document.createElement("div");
  mobileOverlay.className = "mobile-menu-overlay";
  document.body.appendChild(mobileOverlay);

  // All nav dropdowns
  const navDropdowns = document.querySelectorAll(".nav-dropdown");
  // Profile dropdown
  const profileDropdown = document.querySelector(".profile-dropdown");
  const profileBtn = document.querySelector(".profile-btn");

  // Mobile menu functionality
  function toggleMobileMenu() {
    const isActive = navWrapper.classList.contains("active");
    
    mobileMenuBtn.classList.toggle("active", !isActive);
    navWrapper.classList.toggle("active", !isActive);
    mobileOverlay.classList.toggle("active", !isActive);
    document.body.classList.toggle("mobile-menu-open", !isActive);
  }

  // Close mobile menu
  function closeMobileMenu() {
    mobileMenuBtn.classList.remove("active");
    navWrapper.classList.remove("active");
    mobileOverlay.classList.remove("active");
    document.body.classList.remove("mobile-menu-open");
    
    // Close all dropdowns when mobile menu closes
    navDropdowns.forEach(d => d.classList.remove("active"));
    if (profileDropdown) profileDropdown.classList.remove("active");
  }

  // Mobile menu event listeners
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleMobileMenu();
    });
  }

  mobileOverlay.addEventListener("click", closeMobileMenu);

  // Handle nav dropdowns
  navDropdowns.forEach(dropdown => {
    const button = dropdown.querySelector(".dropdown-btn");

    button.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();

      // Close other nav dropdowns and profile dropdown
      navDropdowns.forEach(d => {
        if (d !== dropdown) d.classList.remove("active");
      });
      if (profileDropdown) profileDropdown.classList.remove("active");

      // Toggle current dropdown
      dropdown.classList.toggle("active");
    });
  });

  // Handle profile dropdown
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Close all nav dropdowns
      navDropdowns.forEach(d => d.classList.remove("active"));

      // Toggle profile dropdown
      profileDropdown.classList.toggle("active");
    });
  }

  // Close everything if clicking outside (for desktop)
  document.addEventListener("click", (e) => {
    if (window.innerWidth > 768) {
      if (!e.target.closest('.nav-dropdown') && !e.target.closest('.profile-dropdown')) {
        navDropdowns.forEach(d => d.classList.remove("active"));
        if (profileDropdown) profileDropdown.classList.remove("active");
      }
    }
  });

  // Close mobile menu when clicking on nav links
  document.querySelectorAll('.nav-center a, .profile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });

  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });

  // Initialize other functionality
  initializeQuantityControls();
  initializeFormValidation();
  initializeImageValidation();
  addNotificationStyles();
  initializeNotificationSystem();
});

// ===== PHONE NUMBER NORMALIZATION =====
const custPhone = document.getElementById("custPhone");

custPhone.addEventListener("input", function () {
  // Remove all non-numeric characters
  let cleaned = this.value.replace(/\D/g, "");

  // Limit to 11 digits (Philippine format: 09XXXXXXXXX)
  if (cleaned.length > 11) {
    cleaned = cleaned.substring(0, 11);
  }

  // Update the input field
  this.value = cleaned;
});

// ===== Phone Warning Element =====
const phoneWarning = document.createElement("p");
phoneWarning.style.fontSize = "14px";
phoneWarning.style.marginTop = "4px";
phoneWarning.style.display = "none";
phoneWarning.textContent = "Phone number must be 11 digits starting with 09.";
custPhone.insertAdjacentElement("afterend", phoneWarning);

// Validate before submitting
document.getElementById("orderForm").addEventListener("submit", function (e) {
  const phoneValue = custPhone.value.trim();

  // Check if phone number is exactly 11 digits and starts with 09
  const isValid = /^09\d{9}$/.test(phoneValue);
  if (!isValid) {
    e.preventDefault();
    phoneWarning.style.display = "block";
    custPhone.focus();
  }
});

// ===== Disable confirm button if phone number < 11 digits =====
custPhone.addEventListener("input", function () {
  if (this.value.length < 11 || !/^09\d{9}$/.test(this.value)) {
    disableConfirmButton();
    phoneWarning.style.display = this.value.length > 0 ? "block" : "none";
  } else {
    // Only enable if image is also uploaded
    if (orderImageInput && orderImageInput.files[0]) {
      enableConfirmButton();
    }
    phoneWarning.style.display = "none";
  }
});

// Run check on page load too
if (custPhone.value.length < 11) {
  disableConfirmButton();
  phoneWarning.style.display = "block";
}

// Auto-update ratings every 10s
setInterval(() => {
  fetch("/get_ratings") // you'll make this Flask route
    .then(res => res.json())
    .then(data => {
      data.forEach(food => {
        const card = [...document.querySelectorAll(".card")]
          .find(c => c.querySelector("h3").textContent === food.name);
        if (card) {
          card.querySelector(".rating").innerHTML =
            `<i class="bx bxs-star"></i> ${food.rating}/5`;
        }
      });
    });
}, 10000);

// ===== IMAGE PREVIEW FOR UPLOAD =====
if (orderImageInput) {
  orderImageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.src = "";
      imagePreview.style.display = "none";
    }
  });
}

// Notification function (if not already defined)
function showNotification(message, type = "info") {
    // Remove existing notifications
    document.querySelectorAll('.custom-notification').forEach(notification => {
        notification.remove();
    });

    // Create a styled notification
    const notification = document.createElement("div");
    notification.className = 'custom-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        font-weight: 600;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.4s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        background: linear-gradient(135deg, 
            ${type === "success" ? "#4CAF50, #45a049" : 
              type === "error" ? "#f44336, #d32f2f" : 
              "#2196F3, #1976D2"});
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        white-space: pre-line;
    `;
    
    // Add icon based on type
    const icon = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    notification.innerHTML = `
        <span style="font-size: 16px;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateX(0)";
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateX(100%)";
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 4000);
}