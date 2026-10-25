/**
 * Vel Tech Browsing Center & e-Sevai Maiyam
 * Interactive Client Logic connecting Frontend with SQLite Backend REST API
 * Includes 3D Tactile Interactions, Owner Password Security, and Public Live Service Tracker
 */

let allServices = [];
let trackerPollInterval = null;
let currentPublicStatusFilter = 'All';
let currentPublicSearch = '';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupAccordion();
    setupModalsAndDrawers();
    setupForms();
    setupOwnerAuth();
    setupPublicTracker();
    await fetchServicesList();
}

/**
 * 1. FAQ Accordion Interaction
 */
function setupAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const btn = item.querySelector('.accordion-trigger-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const wasActive = item.classList.contains('active');
            
            // Close all items
            accordionItems.forEach(i => {
                i.classList.remove('active');
                const arrow = i.querySelector('.accordion-arrow');
                if (arrow) arrow.textContent = '▼';
            });

            // If it wasn't active, open it
            if (!wasActive) {
                item.classList.add('active');
                const arrow = item.querySelector('.accordion-arrow');
                if (arrow) arrow.textContent = '▲';
            }
        });
    });
}

/**
 * 2. Fetch Services from Backend SQLite API & Populate Dropdowns (Prices Removed)
 */
async function fetchServicesList() {
    try {
        const response = await fetch('/api/services');
        const result = await response.json();

        if (result.success && result.data) {
            allServices = result.data;
            populateDropdowns(allServices);
        }
    } catch (err) {
        console.error('Error fetching services catalog:', err);
    }
}

function populateDropdowns(services) {
    const selects = [
        document.getElementById('serviceSelect'),
        document.getElementById('modalServiceSelect')
    ];

    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- Choose a Service --</option>';

        const categories = {};
        services.forEach(s => {
            if (!categories[s.category_name]) {
                categories[s.category_name] = [];
            }
            categories[s.category_name].push(s);
        });

        for (const [catName, catServices] of Object.entries(categories)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = catName;

            catServices.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                // Pure clean title without price amount as requested
                opt.textContent = s.title;
                opt.dataset.title = s.title;
                opt.dataset.docs = s.required_docs || '';
                opt.dataset.time = s.processing_time || '';
                optgroup.appendChild(opt);
            });

            select.appendChild(optgroup);
        }
    });
}

/**
 * 3. Copy Address to Clipboard
 */
window.copyStoreAddress = function() {
    const addr = "Ward No: 5, No. 82/394, Railway Station Road, Opposite Auxilium ITI, Gandhi Road, Tirupattur - 635 601.";
    navigator.clipboard.writeText(addr).then(() => {
        showToast('📍 Address copied to clipboard! Ready to paste.', 'success');
    }).catch(() => {
        showToast('Address: Opp. Auxilium ITI, Gandhi Road, Tirupattur - 635 601', 'info');
    });
};

/**
 * 4. Modal & Drawer Setup
 */
function setupModalsAndDrawers() {
    const modalOverlay = document.getElementById('bookingModalOverlay');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (closeModalBtn && modalOverlay) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('open');
        });
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove('open');
        });
    }

    // Owner Drawer
    const drawerOverlay = document.getElementById('ownerDrawerOverlay');
    const openDrawerBtn = document.getElementById('openOwnerDrawerBtn');
    const closeDrawerBtn = document.getElementById('closeOwnerDrawerBtn');

    if (openDrawerBtn) {
        openDrawerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            tryOpenOwnerPortal();
        });
    }

    if (closeDrawerBtn && drawerOverlay) {
        closeDrawerBtn.addEventListener('click', () => {
            drawerOverlay.classList.remove('open');
        });
    }

    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target === drawerOverlay) drawerOverlay.classList.remove('open');
        });
    }

    // Public Tracker Button in footer
    const openTrackerBtn = document.getElementById('openPublicTrackerBtn');
    if (openTrackerBtn) {
        openTrackerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openPublicServiceTracker();
        });
    }

    const closeTrackerBtn = document.getElementById('closePublicTrackerBtn');
    const trackerOverlay = document.getElementById('publicTrackerDrawerOverlay');
    if (closeTrackerBtn && trackerOverlay) {
        closeTrackerBtn.addEventListener('click', () => {
            closePublicServiceTracker();
        });
    }

    if (trackerOverlay) {
        trackerOverlay.addEventListener('click', (e) => {
            if (e.target === trackerOverlay) closePublicServiceTracker();
        });
    }
}

/**
 * Global function to open modal and preselect service (Amount / Price Removed)
 */
window.openBookingModal = function(serviceId, serviceTitle, docs, turnaround) {
    const modalOverlay = document.getElementById('bookingModalOverlay');
    const modalHeading = document.getElementById('modalServiceHeading');
    const modalSelect = document.getElementById('modalServiceSelect');
    const banner = document.getElementById('modalDetailsBanner');
    const priceTurnaround = document.getElementById('modalPriceTurnaround');
    const docsRequired = document.getElementById('modalDocsRequired');

    if (modalHeading) {
        modalHeading.textContent = `Inquire: ${serviceTitle || 'Vel Tech Service'}`;
    }

    if (modalSelect && serviceId) {
        modalSelect.value = serviceId;
    }

    // Show estimated turnaround & documents without amount
    if (banner && (docs || turnaround)) {
        banner.style.display = 'block';
        if (priceTurnaround) {
            priceTurnaround.textContent = `⏱️ Estimated Turnaround: ${turnaround || 'Fast Processing & Verification'}`;
        }
        if (docsRequired) {
            docsRequired.textContent = docs ? `📋 Required Documents: ${docs}` : 'Bring original documents for verification.';
        }
    } else if (banner) {
        banner.style.display = 'none';
    }

    if (modalOverlay) {
        modalOverlay.classList.add('open');
    }
};

/**
 * 5. Setup Form Submissions (Connecting to POST /api/inquiries)
 */
function setupForms() {
    const mainForm = document.getElementById('mainInquiryForm');
    const modalForm = document.getElementById('modalInquiryForm');

    if (mainForm) mainForm.addEventListener('submit', handleFormSubmit);
    if (modalForm) modalForm.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    const formData = new FormData(form);
    const customer_name = formData.get('customer_name') || '';
    const phone = formData.get('phone') || '';
    const service_id = formData.get('service_id') || null;
    const message = formData.get('message') || '';

    let service_name = 'General Inquiry';
    if (service_id) {
        const found = allServices.find(s => s.id == service_id);
        if (found) service_name = found.title;
    }

    if (!customer_name.trim()) {
        showToast('Please enter your full name.', 'error');
        return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        showToast('Please enter a valid 10-digit mobile number.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting to Vel Tech...';

    try {
        const response = await fetch('/api/inquiries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name,
                phone: cleanPhone,
                service_id,
                service_name,
                message
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast(result.message, 'success');
            form.reset();

            // Auto-refresh public tracker if active
            loadPublicInquiries();

            // Close modal if open
            const modalOverlay = document.getElementById('bookingModalOverlay');
            if (modalOverlay) modalOverlay.classList.remove('open');
        } else {
            showToast(result.error || 'Failed to submit inquiry.', 'error');
        }
    } catch (err) {
        console.error('Error submitting inquiry:', err);
        showToast('Network error connecting to backend. Please call 96775 83546.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

/**
 * ============================================================================
 * 6. OWNER PORTAL WITH SECURE PASSCODE PROTECTION
 * ============================================================================
 */

function isOwnerAuthenticated() {
    return sessionStorage.getItem('veltech_owner_authenticated') === 'true';
}

window.tryOpenOwnerPortal = function() {
    if (isOwnerAuthenticated()) {
        openOwnerDrawer();
    } else {
        openOwnerAuthModal();
    }
};

function openOwnerAuthModal() {
    const modal = document.getElementById('ownerAuthModal');
    const input = document.getElementById('ownerPasswordInput');
    const errMsg = document.getElementById('ownerAuthErrorMsg');
    if (errMsg) errMsg.style.display = 'none';
    if (input) input.value = '';
    if (modal) modal.classList.add('open');
    setTimeout(() => { if (input) input.focus(); }, 100);
}

window.closeOwnerAuthModal = function() {
    const modal = document.getElementById('ownerAuthModal');
    if (modal) modal.classList.remove('open');
};

function openOwnerDrawer() {
    const drawerOverlay = document.getElementById('ownerDrawerOverlay');
    if (drawerOverlay) {
        drawerOverlay.classList.add('open');
        loadOwnerInquiries();
    }
}

function setupOwnerAuth() {
    // Login form
    const loginForm = document.getElementById('ownerLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('ownerPasswordInput').value;
            const errMsg = document.getElementById('ownerAuthErrorMsg');

            try {
                const res = await fetch('/api/owner/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    sessionStorage.setItem('veltech_owner_authenticated', 'true');
                    closeOwnerAuthModal();
                    openOwnerDrawer();
                    showToast('🔓 Welcome, T. Moorthi! Owner Portal unlocked.', 'success');
                } else {
                    if (errMsg) {
                        errMsg.textContent = data.error || 'Incorrect passcode. Try again.';
                        errMsg.style.display = 'block';
                    }
                }
            } catch (err) {
                if (errMsg) {
                    errMsg.textContent = 'Server connection error.';
                    errMsg.style.display = 'block';
                }
            }
        });
    }

    // Toggle password eye button
    const toggleBtn = document.getElementById('togglePasswordVisibilityBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const input = document.getElementById('ownerPasswordInput');
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        });
    }

    // Change Password Form
    const changeForm = document.getElementById('ownerChangePasswordForm');
    if (changeForm) {
        changeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const current_password = document.getElementById('currentPasswordInput').value;
            const new_password = document.getElementById('newPasswordInput').value;
            const confirm_password = document.getElementById('confirmPasswordInput').value;
            const errMsg = document.getElementById('changePasswordErrorMsg');

            if (new_password !== confirm_password) {
                if (errMsg) {
                    errMsg.textContent = 'New passcode and confirmation do not match.';
                    errMsg.style.display = 'block';
                }
                return;
            }

            try {
                const res = await fetch('/api/owner/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_password, new_password })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    showToast('✅ Passcode updated successfully!', 'success');
                    closeChangePasswordModal();
                } else {
                    if (errMsg) {
                        errMsg.textContent = data.error || 'Failed to update passcode.';
                        errMsg.style.display = 'block';
                    }
                }
            } catch (err) {
                if (errMsg) {
                    errMsg.textContent = 'Server error.';
                    errMsg.style.display = 'block';
                }
            }
        });
    }
}

window.ownerLogout = function() {
    sessionStorage.removeItem('veltech_owner_authenticated');
    const drawerOverlay = document.getElementById('ownerDrawerOverlay');
    if (drawerOverlay) drawerOverlay.classList.remove('open');
    showToast('🔒 Owner Portal locked and logged out.', 'info');
};

window.openChangePasswordModal = function() {
    const modal = document.getElementById('changePasswordModal');
    const errMsg = document.getElementById('changePasswordErrorMsg');
    if (errMsg) errMsg.style.display = 'none';
    const form = document.getElementById('ownerChangePasswordForm');
    if (form) form.reset();
    if (modal) modal.classList.add('open');
};

window.closeChangePasswordModal = function() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.remove('open');
};

/**
 * 6B. Owner Inquiries Dashboard List (GET /api/inquiries)
 */
async function loadOwnerInquiries() {
    const list = document.getElementById('ownerInquiriesList');
    if (!list) return;

    list.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Fetching customer inquiries...</p>';

    try {
        const res = await fetch('/api/inquiries');
        const data = await res.json();

        if (data.success && data.data) {
            if (data.data.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding:30px; color:var(--text-muted);">No inquiries yet. Submissions from the website will appear here in real time.</p>';
                return;
            }

            list.innerHTML = data.data.map(inq => `
                <div class="inquiry-card">
                    <div class="inquiry-card-header">
                        <div>
                            <span class="tracker-token-badge">#VT-${inq.id}</span>
                            <span class="inquiry-client-name" style="margin-left:6px;">${escapeHtml(inq.customer_name)}</span>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${new Date(inq.created_at).toLocaleString('en-IN')}</div>
                        </div>
                        <span class="status-badge status-${inq.status.replace(/\s+/g, '-')}">${inq.status}</span>
                    </div>

                    <div style="font-size:0.875rem; margin-bottom:6px;">
                        <strong>Service:</strong> <span style="color:var(--teal-primary); font-weight:700;">${escapeHtml(inq.service_name)}</span>
                    </div>

                    <div style="font-size:0.825rem; color:var(--text-muted); margin-bottom:10px; display:flex; gap:12px;">
                        <span>📞 <a href="tel:${escapeHtml(inq.phone)}" style="color:var(--navy-dark); font-weight:700; text-decoration:none;">${escapeHtml(inq.phone)}</a></span>
                        <span>💬 <a href="https://wa.me/91${escapeHtml(inq.phone)}?text=Hello%20${encodeURIComponent(inq.customer_name)},%20Vel%20Tech%20e-Sevai%20regarding%20${encodeURIComponent(inq.service_name)}:" target="_blank" style="color:var(--green-dark); font-weight:700; text-decoration:none;">WhatsApp</a></span>
                    </div>

                    ${inq.message ? `
                    <div style="background:#ffffff; border:1px solid var(--border-light); border-radius:6px; padding:6px 10px; font-size:0.825rem; margin-bottom:10px;">
                        <em>"${escapeHtml(inq.message)}"</em>
                    </div>
                    ` : ''}

                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:8px; border-top:1px dashed var(--border-light);">
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Update Status (Syncs to Public Tracker):</span>
                        <select onchange="updateInquiryStatus(${inq.id}, this.value)" style="font-size:0.75rem; padding:4px 8px; border-radius:4px; border:1px solid var(--teal-primary); font-weight:700; background:#f0fdfa;">
                            <option value="Pending" ${inq.status === 'Pending' ? 'selected' : ''}>Pending (ஆய்வு)</option>
                            <option value="In Progress" ${inq.status === 'In Progress' ? 'selected' : ''}>In Progress (செயலாக்கம்)</option>
                            <option value="Completed" ${inq.status === 'Completed' ? 'selected' : ''}>Completed (தயார்)</option>
                            <option value="Cancelled" ${inq.status === 'Cancelled' ? 'selected' : ''}>Cancelled (ரத்து)</option>
                        </select>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        list.innerHTML = '<p style="color:#b91c1c; text-align:center;">Failed to load inquiries list.</p>';
    }
}

/**
 * Update Inquiry Status (Owner Action -> Auto-reflects in Public Service Dashboard)
 */
window.updateInquiryStatus = async function(inquiryId, newStatus) {
    try {
        const response = await fetch(`/api/inquiries/${inquiryId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        if (result.success) {
            showToast(`✅ Token #VT-${inquiryId} updated to "${newStatus}"!`, 'success');
            // Immediate live synchronization across both dashboards!
            loadOwnerInquiries();
            loadPublicInquiries();
        }
    } catch (e) {
        showToast('Error updating status', 'error');
    }
};

/**
 * ============================================================================
 * 7. PUBLIC SERVICE TRACKER DASHBOARD (READ-ONLY FOR CUSTOMERS)
 * ============================================================================
 */

function setupPublicTracker() {
    // Toolbar search and filters are wired directly with inline onclick/oninput
}

window.openPublicServiceTracker = function() {
    const drawer = document.getElementById('publicTrackerDrawerOverlay');
    if (drawer) {
        drawer.classList.add('open');
        loadPublicInquiries();
        
        // Auto-refresh every 8 seconds so customer screens see live changes automatically
        if (trackerPollInterval) clearInterval(trackerPollInterval);
        trackerPollInterval = setInterval(loadPublicInquiries, 8000);
    }
};

window.closePublicServiceTracker = function() {
    const drawer = document.getElementById('publicTrackerDrawerOverlay');
    if (drawer) drawer.classList.remove('open');
    if (trackerPollInterval) {
        clearInterval(trackerPollInterval);
        trackerPollInterval = null;
    }
};

window.filterPublicTracker = function(status) {
    currentPublicStatusFilter = status;
    const filterBtns = document.querySelectorAll('#publicStatusFilters .tracker-filter-btn');
    filterBtns.forEach(btn => {
        if (btn.getAttribute('data-status') === status) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    loadPublicInquiries();
};

window.handlePublicTrackerSearch = function(val) {
    currentPublicSearch = val;
    loadPublicInquiries();
};

async function loadPublicInquiries() {
    const list = document.getElementById('publicInquiriesList');
    if (!list) return;

    try {
        let url = `/api/inquiries/public?status=${encodeURIComponent(currentPublicStatusFilter)}`;
        if (currentPublicSearch && currentPublicSearch.trim() !== '') {
            url += `&search=${encodeURIComponent(currentPublicSearch.trim())}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.data) {
            if (data.data.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center; padding:36px 16px; color:var(--text-muted);">
                        <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
                        <p style="font-weight:700; margin-bottom:4px;">No matching requests found</p>
                        <p style="font-size:0.8rem;">Try searching with a different mobile digit or service name.</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = data.data.map(inq => {
                let statusTamil = '';
                if (inq.status === 'Pending') statusTamil = 'ஆய்வில் உள்ளது (Under Review)';
                else if (inq.status === 'In Progress') statusTamil = 'செயலாக்கத்தில் உள்ளது (Processing)';
                else if (inq.status === 'Completed') statusTamil = 'தயார் - நேரில் பெறலாம் (Ready for Pickup)';
                else if (inq.status === 'Cancelled') statusTamil = 'ரத்து செய்யப்பட்டது (Cancelled)';

                return `
                <div class="tracker-card">
                    <div class="tracker-card-header">
                        <div>
                            <span class="tracker-token-badge">TOKEN #VT-${inq.id}</span>
                            <span class="tracker-client-name" style="margin-left:8px;">${escapeHtml(inq.customer_name)}</span>
                        </div>
                        <span class="status-badge status-${inq.status.replace(/\s+/g, '-')}">
                            ${inq.status === 'Completed' ? '✅' : inq.status === 'In Progress' ? '⚙️' : inq.status === 'Pending' ? '⏳' : '❌'} 
                            ${inq.status}
                        </span>
                    </div>

                    <div class="tracker-service-title">
                        📌 ${escapeHtml(inq.service_name)}
                    </div>

                    <div class="tracker-meta-row">
                        <span>📱 Mobile: <strong>${escapeHtml(inq.masked_phone)}</strong></span>
                        <span>📅 Registered: ${new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>🔄 Status: <strong style="color:var(--navy-dark);">${statusTamil}</strong></span>
                    </div>

                    ${inq.admin_notes ? `
                    <div class="tracker-admin-note">
                        <strong>Vel Tech Desk Note:</strong> ${escapeHtml(inq.admin_notes)}
                    </div>
                    ` : ''}

                    <div class="tracker-readonly-strip">
                        <span>🔒 <em>Read-Only Customer View (Updated live by Owner)</em></span>
                        <a href="tel:9677583546" style="color:var(--teal-primary); font-weight:700; text-decoration:none;">📞 Call Store (96775 83546)</a>
                    </div>
                </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error fetching public tracker:', err);
    }
}

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'info') {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.className = `toast show ${type}`;
    toast.textContent = message;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Location Showcase Dual Tab Switcher (Storefront & Map)
 */
window.switchLocationTab = function(tabName) {
    const tabStorefrontBtn = document.getElementById('tabStorefrontBtn');
    const tabMapBtn = document.getElementById('tabMapBtn');
    const paneStorefront = document.getElementById('paneStorefront');
    const paneMap = document.getElementById('paneMap');

    if (tabName === 'storefront') {
        if (tabStorefrontBtn) tabStorefrontBtn.classList.add('active');
        if (tabMapBtn) tabMapBtn.classList.remove('active');
        if (paneStorefront) paneStorefront.classList.add('active');
        if (paneMap) paneMap.classList.remove('active');
    } else {
        if (tabStorefrontBtn) tabStorefrontBtn.classList.remove('active');
        if (tabMapBtn) tabMapBtn.classList.add('active');
        if (paneStorefront) paneStorefront.classList.remove('active');
        if (paneMap) paneMap.classList.add('active');
    }
};

/**
 * Storefront Full Lightbox Modal
 */
window.openStorefrontModal = function() {
    const modal = document.getElementById('storefrontModal');
    if (modal) {
        modal.classList.add('open');
    }
};

window.closeStorefrontModal = function(e) {
    const modal = document.getElementById('storefrontModal');
    if (modal) {
        modal.classList.remove('open');
    }
};
