// Order Management JavaScript
document.addEventListener("DOMContentLoaded", function () {
    initializeDropdowns();
    initializeOrderTracking();
    initializeStatusDropdowns();
    initializeServeButtons();
    initializeTableAnimations();
    initializeSynchronizedHighlighting();
    initializePhoneNumberClicks();
    initializeReceiptModal();
    initializeNotificationSystem();
    fetchAndUpdateOrders();
    loadStockInfo(); // ← ADD THIS LINE
    
    // Update every 10 seconds
    setInterval(fetchAndUpdateOrders, 10000);
});

// Function to load and display stock information
async function loadStockInfo() {
    try {
        const response = await fetch('/get_food_stock');
        if (response.ok) {
            const stockData = await response.json();
            
            // Update stock information in tables
            document.querySelectorAll('.stock-info').forEach(cell => {
                const foodName = cell.dataset.food;
                const stock = stockData[foodName] || 0;
                const quantity = parseInt(cell.closest('tr').querySelector('td:nth-child(5)').textContent);
                
                cell.querySelector('.stock-value').textContent = stock;
                
                // Color code based on stock availability
                if (stock < quantity) {
                    cell.style.background = 'rgba(244, 67, 54, 0.2)';
                    cell.title = `Insufficient stock! Available: ${stock}, Needed: ${quantity}`;
                } else if (stock <= 5) {
                    cell.style.background = 'rgba(255, 193, 7, 0.2)';
                    cell.title = 'Low stock warning';
                } else {
                    cell.style.background = 'rgba(76, 175, 80, 0.2)';
                    cell.title = 'Sufficient stock available';
                }
            });
        }
    } catch (error) {
        console.error('Error loading stock info:', error);
    }
}

// Also call after order operations that affect stock
function refreshStockInfo() {
    setTimeout(loadStockInfo, 1000); // Refresh after 1 second
}

// Dropdown and Profile Menu Handling
function initializeDropdowns() {
    const navDropdowns = document.querySelectorAll(".nav-dropdown");
    const profileDropdown = document.querySelector(".profile-dropdown");
    const profileBtn = profileDropdown?.querySelector(".profile-btn");

    if (!profileBtn) return;

    navDropdowns.forEach(dropdown => {
        const button = dropdown.querySelector(".dropdown-btn");
        button?.addEventListener("click", function (e) {
            e.stopPropagation();
            navDropdowns.forEach(d => {
                if (d !== dropdown) d.classList.remove("active");
            });
            profileDropdown.classList.remove("active");
            profileBtn.classList.remove("active");
            dropdown.classList.toggle("active");
        });
    });

    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navDropdowns.forEach(d => d.classList.remove("active"));
        profileDropdown.classList.toggle("active");
        profileBtn.classList.toggle("active");
    });

    document.addEventListener("click", () => {
        navDropdowns.forEach(d => d.classList.remove("active"));
        profileDropdown.classList.remove("active");
        profileBtn.classList.remove("active");
    });
}

// Order Tracker Click Event (for staff only - admin cannot click)
function initializeOrderTracking() {
    document.querySelectorAll(".order-tracker .step").forEach(step => {
        // Skip if this is an admin step (disabled for admin)
        if (step.classList.contains('admin-step')) {
            return;
        }
        
        step.addEventListener("click", async function () {
            const trackerDiv = this.closest(".order-tracker");
            const orderId = trackerDiv.dataset.orderId;
            const newStatus = this.dataset.status;

            trackerDiv.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
            this.classList.add("active");

            updateAllOrdersTracker();

            try {
                const res = await fetch(`/update_order_status/${orderId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus })
                });

                const data = await res.json();
                if (!data.success) {
                    showNotification(data.message || "Failed to update status", "error");
                    fetchAndUpdateOrders();
                } else {
                    updateAllOrdersTracker();
                    showNotification(`Order status updated to ${newStatus}`, "success");
                    
                    // If status is Ready, remove from All Customer Orders
                    if (newStatus === 'Ready') {
                        removeOrderFromAllCustomerOrders(orderId);
                        setTimeout(() => {
                            location.reload();
                        }, 1500);
                    }
                }
            } catch (error) {
                console.error("Failed to update order:", error);
                showNotification("Network error while updating order", "error");
                fetchAndUpdateOrders();
            }
        });
    });
}

// Handle Approve and Reject Buttons in Pending Orders (staff only)
document.addEventListener("click", async function (e) {
    // Handle Approve Button
    if (e.target.classList.contains("approve-btn") || 
        (e.target.closest && e.target.closest(".approve-btn"))) {
        
        const button = e.target.classList.contains("approve-btn") ? 
                      e.target : e.target.closest(".approve-btn");
        
        // Check if button is disabled (admin view)
        if (button.disabled) {
            showNotification("Admin cannot approve orders. Please contact staff.", "info");
            return;
        }
        
        const orderId = button.dataset.orderId;
        if (!orderId) return;

        try {
            // Show loading state with animation
            button.innerHTML = '<i class="bx bx-loader bx-spin"></i> Processing...';
            button.disabled = true;
            button.classList.add('loading-btn');

            const response = await fetch(`/approve_order/${orderId}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                // Remove loading animation
                button.classList.remove('loading-btn');
                
                // Show success message with stock information
                let successMessage = data.message;
                if (data.stock_update) {
                    successMessage += `\n📦 Stock Update: ${data.stock_update.quantity_deducted} ${data.stock_update.food_name} deducted. Remaining: ${data.stock_update.new_stock}`;
                    
                    // Add low stock warning if applicable
                    if (data.stock_update.new_stock <= 5) {
                        successMessage += `\n⚠️ LOW STOCK WARNING: ${data.stock_update.food_name} is running low!`;
                    }
                }
                
                showNotification(successMessage, "success");
                
                // Auto-reload the page after a short delay to reflect stock changes
                setTimeout(() => {
                    location.reload();
                }, 2000); // 2 second delay to read the message
                
            } else {
                // Remove loading state
                button.classList.remove('loading-btn');
                button.innerHTML = '<i class="bx bx-check"></i> Approve';
                button.disabled = false;
                
                // Enhanced error message display
                let errorMessage = data.message || "Failed to approve order";
                if (data.details) {
                    errorMessage += `\nDetails: ${data.details}`;
                }
                showNotification(errorMessage, "error");
            }

        } catch (error) {
            console.error("Error approving order:", error);
            // Remove loading state
            button.classList.remove('loading-btn');
            button.innerHTML = '<i class="bx bx-check"></i> Approve';
            button.disabled = false;
            showNotification("Network error while approving order", "error");
        }
    }
    
    // Handle Reject Button
    if (e.target.classList.contains("reject-btn") || 
        (e.target.closest && e.target.closest(".reject-btn"))) {
        
        const button = e.target.classList.contains("reject-btn") ? 
                      e.target : e.target.closest(".reject-btn");
        
        // Check if button is disabled (admin view)
        if (button.disabled) {
            showNotification("Admin cannot reject orders. Please contact staff.", "info");
            return;
        }
        
        const orderId = button.dataset.orderId;
        if (!orderId) return;

        // Enhanced confirmation with order details
        const orderRow = document.querySelector(`#pending-order-${orderId}`);
        let orderDetails = "";
        
        if (orderRow) {
            const food = orderRow.querySelector('td:nth-child(4)')?.textContent || 'Unknown';
            const quantity = orderRow.querySelector('td:nth-child(5)')?.textContent || 'Unknown';
            orderDetails = `\n\nOrder Details:\n• Food: ${food}\n• Quantity: ${quantity}`;
        }

        if (!confirm(`Are you sure you want to reject and delete this order? This action cannot be undone.${orderDetails}`)) {
            return;
        }

        try {
            // Show loading state with animation
            button.innerHTML = '<i class="bx bx-loader bx-spin"></i> Deleting...';
            button.disabled = true;
            button.classList.add('loading-btn');

            const response = await fetch(`/reject_order/${orderId}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                // Remove loading animation
                button.classList.remove('loading-btn');
                
                // Show success message
                showNotification(data.message || "Order rejected successfully!", "success");
                
                // Remove the order row with animation instead of full page reload
                const orderRow = document.querySelector(`#pending-order-${orderId}`);
                if (orderRow) {
                    orderRow.classList.add('removing');
                    setTimeout(() => {
                        orderRow.remove();
                        // Also remove from receipts table if it exists
                        removeOrderFromReceiptsTable(orderId);
                        checkPendingOrdersEmpty();
                        checkReceiptsTableEmpty();
                    }, 500);
                } else {
                    // Fallback to reload if animation fails
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
                
            } else {
                // Remove loading state
                button.classList.remove('loading-btn');
                button.innerHTML = '<i class="bx bx-x"></i> Reject';
                button.disabled = false;
                showNotification(data.message || "Failed to reject order", "error");
            }

        } catch (error) {
            console.error("Error rejecting order:", error);
            // Remove loading state
            button.classList.remove('loading-btn');
            button.innerHTML = '<i class="bx bx-x"></i> Reject';
            button.disabled = false;
            showNotification("Network error while rejecting order", "error");
        }
    }
});

// Initialize status dropdown event listeners (staff only)
function initializeStatusDropdowns() {
    document.querySelectorAll('.status-select').forEach(select => {
        // Skip disabled dropdowns (admin view)
        if (select.disabled) {
            return;
        }
        
        select.addEventListener('change', handleStatusChange);
    });
}

// Function to add order to All Customer Orders table
function addOrderToAllOrdersTable(order) {
    const allOrdersTableBody = document.getElementById("allOrdersTableBody");
    if (!allOrdersTableBody) return;

    // Remove empty message if it exists
    const emptyRow = allOrdersTableBody.querySelector("tr td[colspan]");
    if (emptyRow) {
        emptyRow.parentElement.remove();
    }

    // Create progress tracker row
    const progressRow = document.createElement("tr");
    progressRow.className = "progress-row";
    progressRow.innerHTML = `
        <td colspan="7">
            <div class="order-tracker" data-order-id="${order.id}">
                <div class="progress"></div>
                <div class="step active" data-status="Preparing">Preparing</div>
                <div class="step" data-status="Cooking">Cooking</div>
                <div class="step" data-status="Ready">Ready to Pick Up</div>
            </div>
        </td>
    `;

    // Create order details row
    const orderRow = document.createElement("tr");
    orderRow.setAttribute("data-order-id", order.id);
    orderRow.innerHTML = `
        <td>${order.order_date}</td>
        <td>${order.cust_name}</td>
        <td>${order.cust_contact}</td>
        <td>${order.food}</td>
        <td>${order.quantity}</td>
        <td>₱${order.price}</td>
        <td>
            ${order.payment_status}
            <select class="status-select" data-order-id="${order.id}" style="margin-left: 10px; padding: 5px;">
                <option value="Preparing" selected>Preparing</option>
                <option value="Cooking">Cooking</option>
                <option value="Ready">Ready</option>
            </select>
        </td>
    `;

    // Add both rows to the table with animation
    allOrdersTableBody.appendChild(progressRow);
    allOrdersTableBody.appendChild(orderRow);
    
    // Add entrance animation
    setTimeout(() => {
        progressRow.style.animation = "slideInUp 0.6s ease-out";
        orderRow.style.animation = "slideInUp 0.6s ease-out 0.1s both";
    }, 100);
    
    // Initialize the progress tracker
    updateOrderTracker(order.id, 'Preparing');
    
    // Add event listener for the status dropdown
    const statusSelect = orderRow.querySelector('.status-select');
    statusSelect.addEventListener('change', handleStatusChange);
}

// Function to update order tracker visually
function updateOrderTracker(orderId, status) {
    const trackerDiv = document.querySelector(`.order-tracker[data-order-id="${orderId}"]`);
    if (!trackerDiv) return;

    const steps = trackerDiv.querySelectorAll('.step');
    const progressBar = trackerDiv.querySelector('.progress');
    
    // Reset all steps
    steps.forEach(step => step.classList.remove('active'));
    
    // Activate steps based on status - FIXED LOGIC
    if (status === 'Approved' || status === 'Preparing') {
        steps[0].classList.add('active'); // Preparing step
    } else if (status === 'Cooking') {
        steps[0].classList.add('active'); // Preparing
        steps[1].classList.add('active'); // Cooking
    } else if (status === 'Ready') {
        steps.forEach(step => step.classList.add('active')); // All steps
    }

    // Update progress bar
    if (progressBar) {
        const activeSteps = trackerDiv.querySelectorAll('.step.active').length;
        const totalSteps = steps.length;
        
        if (activeSteps > 0) {
            const progressPercent = ((activeSteps - 1) / (totalSteps - 1)) * 100;
            progressBar.style.width = `${progressPercent}%`;
            progressBar.classList.add('active');
        } else {
            progressBar.style.width = '0%';
            progressBar.classList.remove('active');
        }
    }
}

// Handle status changes from dropdown
async function handleStatusChange(e) {
    const orderId = e.target.dataset.orderId;
    const newStatus = e.target.value;
    const previousStatus = e.target.previousValue || getCurrentStatus(orderId);

    // Store current value in case we need to revert
    e.target.previousValue = newStatus;

    try {
        // Add loading state to dropdown
        e.target.disabled = true;
        const originalColor = e.target.style.color;
        e.target.style.color = '#888';

        const response = await fetch(`/update_order_status/${orderId}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();
        
        // Re-enable dropdown
        e.target.disabled = false;
        e.target.style.color = originalColor;

        if (data.success) {
            updateOrderTracker(orderId, newStatus);
            showNotification(`Order status updated to ${newStatus}`, "success");
            
            // If order is marked as Ready, remove it from All Customer Orders
            if (newStatus === 'Ready') {
                removeOrderFromAllCustomerOrders(orderId);
                // Reload page to refresh Ready to Pick Up section
                setTimeout(() => {
                    location.reload();
                }, 1500);
            }
        } else {
            showNotification(data.message || "Failed to update status", "error");
            // Revert dropdown to previous value
            e.target.value = previousStatus;
        }
    } catch (error) {
        console.error("Error updating status:", error);
        // Re-enable dropdown on error
        e.target.disabled = false;
        e.target.style.color = originalColor;
        showNotification("Network error while updating status", "error");
        e.target.value = previousStatus;
    }
}

// Function to remove order from All Customer Orders table
function removeOrderFromAllCustomerOrders(orderId) {
    // Find and remove the progress row with animation
    const progressRow = document.querySelector(`.progress-row:has(.order-tracker[data-order-id="${orderId}"])`);
    if (progressRow) {
        progressRow.classList.add('removing');
        setTimeout(() => {
            progressRow.remove();
        }, 500);
    }
    
    // Find and remove the order details row with animation
    const orderRow = document.querySelector(`tr[data-order-id="${orderId}"]`);
    if (orderRow) {
        orderRow.classList.add('removing');
        setTimeout(() => {
            orderRow.remove();
        }, 500);
    }
    
    // Check if All Customer Orders table is now empty
    setTimeout(() => {
        checkAllCustomerOrdersEmpty();
    }, 600);
}

// Check if All Customer Orders table is empty and show message
function checkAllCustomerOrdersEmpty() {
    const allOrdersTableBody = document.getElementById("allOrdersTableBody");
    if (allOrdersTableBody && allOrdersTableBody.children.length === 0) {
        allOrdersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders found.</td></tr>';
    }
}

// Helper function to get current status
function getCurrentStatus(orderId) {
    const statusSelect = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
    return statusSelect ? statusSelect.value : 'Preparing';
}

// Check if tables are empty and show appropriate messages
function checkEmptyTables() {
    const pendingTableBody = document.getElementById("pendingOrdersTableBody");
    const allOrdersTableBody = document.getElementById("allOrdersTableBody");
    
    // Check pending orders
    if (pendingTableBody && pendingTableBody.children.length === 0) {
        pendingTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No pending orders.</td></tr>';
    }
    
    // Check all orders
    if (allOrdersTableBody && allOrdersTableBody.children.length === 0) {
        allOrdersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders found.</td></tr>';
    }
}

// Handle serve order button click in Ready to Pick Up table
async function handleServeOrder(e) {
    const button = e.target.closest('.check-btn');
    const orderId = button.dataset.orderId;

    if (!orderId) return;

    try {
        // Show loading state with animation
        button.innerHTML = '<i class="bx bx-loader bx-spin"></i> Processing...';
        button.disabled = true;
        button.classList.add('loading-btn');

        const response = await fetch(`/mark_order_served/${orderId}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        if (data.success) {
            // Remove loading animation
            button.classList.remove('loading-btn');
            
            // Show success message
            showNotification("Order marked as served!", "success");
            
            // Animate removal from Ready to Pick Up table
            const row = button.closest('tr');
            if (row) {
                row.classList.add('removing');
                setTimeout(() => {
                    row.remove();
                    
                    // Add to Served Orders table with animation
                    addOrderToServedOrdersTable(data.order);
                    
                    // Trigger notification check for the user
                    setTimeout(() => {
                        checkForNotifications();
                    }, 1000);
                    
                    // Check if Ready to Pick Up table is empty and show message
                    checkReadyPickupEmpty();
                }, 500);
            }
        } else {
            // Remove loading state
            button.classList.remove('loading-btn');
            button.innerHTML = '<i class="bx bx-check"></i> Serve';
            button.disabled = false;
            showNotification(data.message || "Failed to mark order as served", "error");
        }
    } catch (error) {
        console.error("Error serving order:", error);
        // Remove loading state
        button.classList.remove('loading-btn');
        button.innerHTML = '<i class="bx bx-check"></i> Serve';
        button.disabled = false;
        showNotification("Network error while serving order", "error");
    }
}

// Function to add order to Served Orders table
function addOrderToServedOrdersTable(order) {
    const servedTable = document.getElementById("servedOrdersTableBody");
    if (!servedTable) return;

    // Remove empty message if it exists
    const emptyRow = servedTable.querySelector("tr td[colspan]");
    if (emptyRow) {
        emptyRow.parentElement.remove();
    }

    // Create new row for served order
    const newRow = document.createElement("tr");
    newRow.setAttribute("data-order-id", order.id);
    newRow.innerHTML = `
        <td>${order.order_date}</td>
        <td>${order.cust_name}</td>
        <td>${order.cust_contact}</td>
        <td>${order.food}</td>
        <td>${order.quantity}</td>
        <td>₱${order.price}</td>
        <td>${order.payment_status}</td>
        <td>${order.served_date || 'Just now'}</td>
    `;

    servedTable.appendChild(newRow);
    
    // Add entrance animation
    setTimeout(() => {
        newRow.style.animation = "slideInUp 0.6s ease-out";
    }, 100);
}

// Check if Ready to Pick Up table is empty
function checkReadyPickupEmpty() {
    const readyPickupTable = document.querySelector(".ready-pickup-table tbody");
    if (readyPickupTable && readyPickupTable.children.length === 0) {
        readyPickupTable.innerHTML = '<tr><td colspan="8" style="text-align:center;">No ready to pick up orders.</td></tr>';
    }
}

// ===== NEW: Receipts Table Management =====
function removeOrderFromReceiptsTable(orderId) {
    const receiptsTable = document.querySelector('.receipts-table tbody');
    if (!receiptsTable) return;
    
    // Find the row with matching order data (we'll use order date as identifier)
    const rows = receiptsTable.querySelectorAll('tr');
    const pendingRow = document.querySelector(`#pending-order-${orderId}`);
    
    if (!pendingRow) return;
    
    // Get the order date from the pending orders row
    const orderDate = pendingRow.querySelector('td:first-child').textContent;
    
    rows.forEach(row => {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell && firstCell.textContent === orderDate) {
            row.classList.add('removing');
            setTimeout(() => {
                row.remove();
                checkReceiptsTableEmpty();
            }, 500);
        }
    });
}

function checkReceiptsTableEmpty() {
    const receiptsTableBody = document.querySelector('.receipts-table tbody');
    if (receiptsTableBody && receiptsTableBody.children.length === 0) {
        receiptsTableBody.innerHTML = '<tr><td colspan="4" class="no-orders">No receipts uploaded.</td></tr>';
    }
}

// Initialize serve button event listeners
function initializeServeButtons() {
    document.querySelectorAll('.ready-pickup-table .check-btn').forEach(button => {
        button.addEventListener('click', handleServeOrder);
    });
}

// Notification function
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

// --- Periodically fetch user's orders and update tracker UI ---
async function fetchAndUpdateOrders() {
    try {
        const response = await fetch('/api/user_orders');
        if (!response.ok) throw new Error('Network response was not ok');
        const orders = await response.json();

        orders.forEach(order => {
            const trackerDiv = document.querySelector(`.order-tracker[data-order-id="${order.id}"]`);
            if (trackerDiv) {
                const steps = trackerDiv.querySelectorAll('.step');
                const progressBar = trackerDiv.querySelector('.progress');
                
                // Reset all steps first
                steps.forEach(step => step.classList.remove('active'));
                
                // Determine which steps should be active based on tracker status
                if (order.tracker === 'Approved' || order.tracker === 'Preparing') {
                    // Only Preparing step should be active
                    steps[0].classList.add('active'); // Preparing step
                } else if (order.tracker === 'Cooking') {
                    // Preparing and Cooking steps should be active
                    steps[0].classList.add('active'); // Preparing
                    steps[1].classList.add('active'); // Cooking
                } else if (order.tracker === 'Ready') {
                    // All steps should be active
                    steps.forEach(step => step.classList.add('active')); // Preparing, Cooking, Ready
                }
                
                // Update progress bar width
                if (progressBar) {
                    const activeSteps = trackerDiv.querySelectorAll('.step.active').length;
                    const totalSteps = steps.length;
                    
                    if (activeSteps > 0) {
                        const percent = ((activeSteps - 1) / (totalSteps - 1)) * 100;
                        progressBar.style.width = percent + "%";
                        progressBar.classList.add("active");
                    } else {
                        progressBar.style.width = "0%";
                        progressBar.classList.remove("active");
                    }
                }
            }
        });

        updateAllOrdersTracker();
    } catch (error) {
        console.error('Failed to fetch orders:', error);
    }
}

// Helper to update progress line for ALL orders (admin/staff)
function updateAllOrdersTracker() {
    document.querySelectorAll(".order-tracker").forEach(trackerDiv => {
        const steps = trackerDiv.querySelectorAll('.step');
        const progressBar = trackerDiv.querySelector('.progress');
        let activeIndex = -1;

        steps.forEach((step, index) => {
            if (step.classList.contains('active')) {
                activeIndex = index;
            }
        });

        if (progressBar) {
            const totalSteps = steps.length - 1;
            if (activeIndex >= 0) {
                const percent = (activeIndex / totalSteps) * 100;
                progressBar.style.width = percent + "%";
                progressBar.classList.add("active");
            } else {
                progressBar.style.width = "0%";
                progressBar.classList.remove("active");
            }
        }
    });
}

// Initialize table animations
function initializeTableAnimations() {
    // Add animation classes to existing rows
    document.querySelectorAll('.pending-orders-table tbody tr').forEach((row, index) => {
        if (!row.querySelector('td[colspan]')) { // Skip empty message rows
            row.style.animationDelay = `${(index + 1) * 0.1}s`;
        }
    });
    
    document.querySelectorAll('.receipts-table tbody tr').forEach((row, index) => {
        if (!row.querySelector('td[colspan]')) { // Skip empty message rows
            row.style.animationDelay = `${(index + 1) * 0.15}s`;
        }
    });
}

// Animate new order appearance
function animateNewOrder(orderId) {
    const row = document.getElementById(`pending-order-${orderId}`);
    if (row) {
        row.classList.add('new-order');
        // Reset animation
        void row.offsetWidth; // Trigger reflow
        row.style.animation = 'slideInUp 0.6s ease-out, highlightRow 2s ease-out';
    }
}

// Animate order removal
function animateOrderRemoval(orderId, callback) {
    const row = document.getElementById(`pending-order-${orderId}`);
    if (row) {
        row.classList.add('removing');
        setTimeout(() => {
            if (callback) callback();
        }, 500); // Match animation duration
    } else {
        if (callback) callback();
    }
}

// Add synchronized row highlighting between Pending Orders and Receipts tables
function initializeSynchronizedHighlighting() {
    const pendingTable = document.querySelector('.pending-orders-table');
    const receiptsTable = document.querySelector('.receipts-table');
    
    if (pendingTable && receiptsTable) {
        const pendingRows = pendingTable.querySelectorAll('tbody tr:not(:has(td[colspan]))');
        const receiptRows = receiptsTable.querySelectorAll('tbody tr:not(:has(td[colspan]))');
        
        pendingRows.forEach((row, index) => {
            row.addEventListener('mouseenter', () => {
                if (receiptRows[index]) {
                    receiptRows[index].style.background = 'rgba(255, 179, 71, 0.15)';
                    receiptRows[index].style.transform = 'translateX(5px)';
                    receiptRows[index].style.borderLeft = '3px solid #ffb347';
                }
            });
            
            row.addEventListener('mouseleave', () => {
                if (receiptRows[index]) {
                    receiptRows[index].style.background = '';
                    receiptRows[index].style.transform = '';
                    receiptRows[index].style.borderLeft = '';
                }
            });
        });
        
        receiptRows.forEach((row, index) => {
            row.addEventListener('mouseenter', () => {
                if (pendingRows[index]) {
                    pendingRows[index].style.background = 'rgba(255, 179, 71, 0.15)';
                    pendingRows[index].style.transform = 'translateX(5px)';
                    pendingRows[index].style.borderLeft = '3px solid #ffb347';
                }
            });
            
            row.addEventListener('mouseleave', () => {
                if (pendingRows[index]) {
                    pendingRows[index].style.background = '';
                    pendingRows[index].style.transform = '';
                    pendingRows[index].style.borderLeft = '';
                }
            });
        });
    }
}

// Enhanced receipt image modal functionality
function initializeReceiptModal() {
    const receiptImages = document.querySelectorAll('.receipt-img');
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="" alt="Enlarged Receipt" style="max-width: 100%; max-height: 100%; border-radius: 8px; cursor: default;">
            <button style="position: absolute; top: 10px; right: 10px; background: #f44336; color: white; border: none; padding: 8px 12px; border-radius: 50%; cursor: pointer; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">×</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const modalImg = modal.querySelector('img');
    const closeBtn = modal.querySelector('button');
    const modalContent = modal.querySelector('div');
    
    receiptImages.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            modalImg.src = img.src;
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.style.opacity = '1';
            }, 10);
        });
    });
    
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });
    
    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Also close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });
    
    function closeModal() {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Initialize phone number click functionality
function initializePhoneNumberClicks() {
    const phoneCells = document.querySelectorAll('.receipts-table td:nth-child(3)');
    
    phoneCells.forEach(cell => {
        // Only make clickable if it contains a phone number (not "No Image" text)
        if (cell.textContent && cell.textContent.trim() !== 'No Image' && 
            cell.textContent.trim().match(/[\d\+\(\)\- ]/)) {
            
            cell.style.cursor = 'pointer';
            cell.title = 'Click to call ' + cell.textContent.trim();
            
            cell.addEventListener('click', function() {
                const phoneNumber = this.textContent.trim().replace(/\D/g, ''); // Remove non-digits
                if (phoneNumber) {
                    if (confirm(`Call ${this.textContent.trim()}?`)) {
                        window.open(`tel:${phoneNumber}`, '_self');
                    }
                }
            });
            
            // Add hover effects
            cell.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(255, 179, 71, 0.1)';
                this.style.color = '#ff8000';
            });
            
            cell.addEventListener('mouseleave', function() {
                this.style.background = '';
                this.style.color = '#ffb347';
            });
        }
    });
}

// Notification bell and polling system
function initializeNotificationSystem() {
    createNotificationBell();
    checkForNotifications();
    // Check for new notifications every 30 seconds
    setInterval(checkForNotifications, 30000);
}

// Create notification bell in the header
function createNotificationBell() {
    // Check if we're on a customer view (not admin/staff)
    if (document.body.classList.contains('admin') || 
        document.querySelector('.pending-orders-table')) {
        return; // Don't show bell for admin/staff
    }

    const header = document.querySelector('header');
    const navWrapper = document.querySelector('.nav-wrapper');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    if (!header || !navWrapper || !profileDropdown) return;

    // Create notification bell element
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

    // Insert before profile dropdown (to the left of it)
    navWrapper.insertBefore(notificationBell, profileDropdown);
    
    // Add event listeners
    const bellBtn = notificationBell.querySelector('.notification-btn');
    const dropdown = notificationBell.querySelector('.notification-dropdown');
    const clearBtn = notificationBell.querySelector('.clear-notifications');
    
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    clearBtn.addEventListener('click', clearAllNotifications);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.style.display = 'none';
    });
    
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Check for new notifications
async function checkForNotifications() {
    try {
        const response = await fetch('/api/check_notifications');
        if (!response.ok) return;
        
        const notifications = await response.json();
        updateNotificationUI(notifications);
        
        // Show browser notification for new rejected orders AND ready orders
        showBrowserNotifications(notifications);
        
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// Update the browser notification function to handle all order types
function showBrowserNotifications(notifications) {
    // Check if browser supports notifications
    if (!("Notification" in window)) return;
    
    // Request permission if not granted
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
    
    // Show notification for each new notification
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
                requireInteraction: true // Keep notification until user dismisses it
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

// Update notification UI with different styling for all order types
function updateNotificationUI(notifications) {
    const notificationBell = document.querySelector('.notification-bell');
    if (!notificationBell) return;
    
    const countElement = notificationBell.querySelector('.notification-count');
    const dropdown = notificationBell.querySelector('.notification-dropdown');
    const listElement = notificationBell.querySelector('.notification-list');
    const emptyElement = notificationBell.querySelector('.notification-empty');
    
    const unreadCount = notifications.length;
    
    // Update count badge
    if (unreadCount > 0) {
        countElement.textContent = unreadCount > 9 ? '9+' : unreadCount;
        countElement.style.display = 'flex';
        countElement.classList.add('pulse');
    } else {
        countElement.style.display = 'none';
        countElement.classList.remove('pulse');
    }
    
    // Update dropdown content
    if (unreadCount > 0) {
        emptyElement.style.display = 'none';
        listElement.style.display = 'block';
        listElement.innerHTML = notifications.map(notif => {
            let icon, bgColor, borderColor;
            
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
        
        // Add event listeners to mark as read buttons
        listElement.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const notifId = btn.dataset.id;
                await markNotificationAsRead(notifId);
                btn.closest('.notification-item').remove();
                checkForNotifications(); // Refresh count
            });
        });
        
        // Add click event to mark as read when clicking notification
        listElement.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (!e.target.classList.contains('mark-read-btn')) {
                    const notifId = item.dataset.id;
                    await markNotificationAsRead(notifId);
                    item.remove();
                    checkForNotifications(); // Refresh count
                }
            });
        });
        
    } else {
        listElement.style.display = 'none';
        emptyElement.style.display = 'block';
    }
}

// Mark notification as read
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

// Clear all notifications
async function clearAllNotifications() {
    try {
        const notifications = document.querySelectorAll('.notification-item');
        for (const notif of notifications) {
            const notifId = notif.dataset.id;
            await markNotificationAsRead(notifId);
        }
        checkForNotifications(); // Refresh
    } catch (error) {
        console.error('Error clearing notifications:', error);
    }
}

// Add this helper function to check if pending orders table is empty
function checkPendingOrdersEmpty() {
    const pendingTableBody = document.getElementById("pendingOrdersTableBody");
    if (pendingTableBody && pendingTableBody.children.length === 0) {
        pendingTableBody.innerHTML = '<tr><td colspan="8" class="no-orders">No pending orders.</td></tr>';
    }
}