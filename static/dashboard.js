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

  // In your DOMContentLoaded function, update the profile dropdown click handler:
    if (profileBtn && profileDropdown) {
    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Close all nav dropdowns
        navDropdowns.forEach(d => d.classList.remove("active"));

        // Toggle profile dropdown
        profileDropdown.classList.toggle("active");

        // For mobile: close other dropdowns when opening profile
        if (window.innerWidth <= 768) {
        navDropdowns.forEach(d => {
            if (d.classList.contains('active')) {
            d.classList.remove('active');
            }
        });
        }
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
  initializeMenuToggles();
  addNotificationStyles();
  initializeNotificationSystem();
});

/* ===== Show Message Box ===== */
function showMessage(msg, type = "success") {
    // Remove existing message boxes
    const existingMessages = document.querySelectorAll('.message-box');
    existingMessages.forEach(msg => msg.remove());
    
    const box = document.createElement('div');
    box.textContent = msg;
    box.className = `message-box ${type}`;
    
    // Add styles if not exists
    if (!document.querySelector('#message-box-styles')) {
        const style = document.createElement('style');
        style.id = 'message-box-styles';
        style.textContent = `
            .message-box {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideDown 0.3s ease;
            }
            
            .message-box.success {
                background: #4CAF50;
                border-left: 4px solid #2E7D32;
            }
            
            .message-box.error {
                background: #f44336;
                border-left: 4px solid #c62828;
            }
            
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(box);
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => box.remove(), 300);
    }, 3000);
}

/* ===== Toggle Availability ===== */
function initializeMenuToggles() {
    const toggleSwitches = document.querySelectorAll('.dashboard-container input[type="checkbox"]');
    
    toggleSwitches.forEach(switchBtn => {
        const label = switchBtn.closest('.switch-container').querySelector('.status-label');

        // Initialize label text
        label.textContent = switchBtn.checked ? "Available" : "Not Available";

        switchBtn.addEventListener('change', function() {
            const status = this.checked ? "Available" : "Not Available";
            label.textContent = status;

            const food = this.dataset.food;
            if (!food) return showMessage("Food item missing", "error");

            // Show loading state
            const originalState = this.checked;
            this.disabled = true;
            label.textContent = "Updating...";

            fetch('/update_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ food: food, status: status })
            })
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (data.message) {
                    showMessage(data.message, "success");
                    label.textContent = status;
                } else {
                    throw new Error(data.error || 'Failed to update status');
                }
            })
            .catch(err => {
                console.error(err);
                // Revert the toggle
                this.checked = !this.checked;
                label.textContent = this.checked ? "Available" : "Not Available";
                showMessage("Failed to update status", "error");
            })
            .finally(() => {
                this.disabled = false;
            });
        });
    });
}

// ===== NOTIFICATION SYSTEM ===== 
function initializeNotificationSystem() {
    // Only show for customers (not admin/staff)
    const isAdminOrStaff = document.body.classList.contains('admin') || 
                          document.querySelector('.dashboard-container input[type="checkbox"]') ||
                          document.querySelector('header').textContent.includes('Admin') ||
                          document.querySelector('header').textContent.includes('Staff');
    
    if (isAdminOrStaff) {
        return;
    }
    
    // Check if user is logged in
    if (!document.querySelector('.profile-btn') || document.querySelector('.profile-btn').textContent.includes('Login')) {
        return;
    }
    
    createNotificationBell();
    checkForNotifications();
    setInterval(checkForNotifications, 30000); // Check every 30 seconds
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
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        // Mark all as read when opening
        if (!isVisible) {
            setTimeout(() => {
                document.querySelectorAll('.notification-item').forEach(item => {
                    markNotificationAsRead(item.dataset.id);
                });
            }, 1000);
        }
    });
    
    clearBtn.addEventListener('click', clearAllNotifications);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-bell')) {
            dropdown.style.display = 'none';
        }
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
            
            // Determine notification type and styling
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
        // For rejected orders
        else if (notif.message.includes('rejected')) {
            new Notification("Leshley's Eatery - Order Rejected", {
                body: notif.message,
                icon: "/static/logo.png",
                tag: `order-rejected-${notif.order_id}`,
                requireInteraction: true
            });
        }
        // For served orders
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
            margin: 5px;
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

        /* Mobile responsive */
        @media screen and (max-width: 768px) {
            .notification-dropdown {
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                width: 90%;
                max-width: 300px;
            }
            
            .notification-bell {
                margin-right: 5px;
            }
        }
    `;
    document.head.appendChild(style);
}
// ===== END NOTIFICATION SYSTEM =====