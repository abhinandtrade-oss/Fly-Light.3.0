/**
 * Admin Sidebar Loader
 * Fetches and injects the sidebar into the page.
 * Caches content in sessionStorage to prevent reloading delay.
 */

const CACHE_KEYS = {
    HTML: 'fltt_sidebar_html',
    METADATA: 'fltt_sidebar_metadata' // { userRole, rolesConfig, userInfo }
};

async function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    let sidebarHtml = null;
    let metadata = null;

    // 1. Try Loading from Cache
    try {
        const cachedHtml = sessionStorage.getItem(CACHE_KEYS.HTML);
        const cachedMeta = sessionStorage.getItem(CACHE_KEYS.METADATA);
        if (cachedHtml && cachedMeta) {
            sidebarHtml = cachedHtml;
            metadata = JSON.parse(cachedMeta);
        }
    } catch (e) {
        console.warn('Sidebar cache error:', e);
    }

    // 2. If Cache Miss, Fetch Data
    if (!sidebarHtml || !metadata) {
        try {
            // Import Supabase
            let supabaseClient = window.supabaseClient;
            if (!supabaseClient) {
                try {
                    const mod = await import('/assets/js/supabase-client.js');
                    supabaseClient = mod.supabase;
                } catch (e) {
                    const mod = await import('./supabase-client.js');
                    supabaseClient = mod.supabase;
                }
            }

            // Auth Check
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return; // Main page will handle redirect

            // Fetch Configuration
            const ROLES_KEY = 'admin_roles_config';
            const REGISTRY_KEY = 'admin_users_registry';

            const { data: dRoles, error: eRoles } = await supabaseClient.from('site_content').select('value').eq('key', ROLES_KEY).maybeSingle();
            const { data: dRegistry, error: eRegistry } = await supabaseClient.from('site_content').select('value').eq('key', REGISTRY_KEY).maybeSingle();

            if (eRoles?.status === 406 || eRegistry?.status === 406) {
                window.showAlert("Supabase Project Paused. Please go to Supabase dashboard to unpause it.", "error");
                return;
            }

            // Parse Roles
            let rolesConfig = {};
            try { rolesConfig = dRoles ? JSON.parse(dRoles.value) : {}; } catch (e) { }

            if (!rolesConfig || Object.keys(rolesConfig).length === 0) {
                rolesConfig = {
                    'super_admin': { permissions: ['nav-dashboard', 'nav-enquiries', 'nav-bookings', 'nav-insurance', 'nav-sales', 'nav-accounts', 'nav-email-config', 'nav-manage-images', 'nav-manage-booking-site', 'nav-manage-fleet', 'nav-manage-destinations', 'nav-announcements', 'nav-public-announcements', 'nav-careers', 'nav-hr', 'nav-taxi-portal'] },
                    'admin': { permissions: ['nav-dashboard', 'nav-enquiries', 'nav-bookings', 'nav-insurance', 'nav-sales', 'nav-accounts', 'nav-email-config', 'nav-manage-images', 'nav-manage-booking-site', 'nav-manage-fleet', 'nav-manage-destinations', 'nav-announcements', 'nav-public-announcements', 'nav-careers', 'nav-taxi-portal'] },
                    'taxi_driver': { permissions: ['nav-dashboard', 'nav-taxi-portal'] },
                    'viewer': { permissions: ['nav-dashboard'] }
                };
            }

            // Determine User Role
            let userRegistry = [];
            try { userRegistry = dRegistry ? JSON.parse(dRegistry.value) : []; } catch (e) { }

            const userEntry = userRegistry.find(u => u.email.toLowerCase() === user.email.toLowerCase());
            const userRole = userEntry?.role || user.user_metadata?.role || (userRegistry.length === 0 ? 'super_admin' : 'admin');

            // Prepare User Info for Display
            let name = user.user_metadata?.full_name || user.email.split('@')[0];
            if (name.toLowerCase() === 'admin') name = 'Admin';

            const userInfo = {
                displayName: name.toUpperCase(),
                roleDisplay: userRole.replace('_', ' ').toUpperCase(),
                initial: name.charAt(0).toUpperCase()
            };

            // Fetch Sidebar HTML
            const response = await fetch('components/sidebar.html');
            if (!response.ok) throw new Error('Failed to fetch sidebar');
            sidebarHtml = await response.text();

            metadata = { userRole, rolesConfig, userInfo };

            // Save to Cache
            sessionStorage.setItem(CACHE_KEYS.HTML, sidebarHtml);
            sessionStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));

        } catch (error) {
            console.error('Error loading sidebar data:', error);
            return;
        }
    }

    // 3. Render Sidebar (Instant if cached)
    sidebarContainer.innerHTML = sidebarHtml;

    // 4. Common Logic (Active State, RBAC, etc.)
    const { userRole, rolesConfig, userInfo } = metadata;

    const path = window.location.pathname;
    const page = path.split("/").pop();
    const pageMap = {
        'dashboard.html': 'nav-dashboard',
        'bookings.html': 'nav-bookings',
        'insurance.html': 'nav-insurance',
        'enquiries.html': 'nav-enquiries',
        'sales.html': 'nav-sales',
        'accounts.html': 'nav-accounts',
        'email-config.html': 'nav-email-config',
        'manage-images.html': 'nav-manage-images',
        'manage-booking-site.html': 'nav-manage-booking-site',
        'manage-fleet.html': 'nav-manage-fleet',
        'manage-destinations.html': 'nav-manage-destinations',
        'taxi-portal.html': 'nav-taxi-portal',
        'announcements.html': 'nav-announcements',
        'public-announcements.html': 'nav-public-announcements',
        'careers.html': 'nav-careers',
        'hr.html': 'nav-hr'
    };

    // RBAC Check
    const isSuperAdmin = userRole === 'super_admin';
    const allowedNavs = rolesConfig[userRole]?.permissions || [];
    const showAll = !rolesConfig || Object.keys(rolesConfig).length === 0;

    const currentNavId = pageMap[page];
    if (currentNavId && !isSuperAdmin && !showAll && !allowedNavs.includes(currentNavId)) {
        document.body.innerHTML = `
            <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; font-family: 'Outfit', sans-serif;">
                <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%;">
                    <div style="width: 80px; height: 80px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px;">
                        <i class="fas fa-lock"></i>
                    </div>
                    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 10px; font-weight: 700;">Access Denied</h1>
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                        You do not have permission to view this page.
                    </p>
                    <a href="dashboard.html" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.2s;">
                        Return to Dashboard
                    </a>
                </div>
            </div>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        `;
        return;
    }

    // Filter Nav Links
    document.querySelectorAll('.nav-link[id]').forEach(link => {
        const navId = link.id;
        if (!showAll && !isSuperAdmin && !allowedNavs.includes(navId)) {
            const navItem = link.closest('.nav-item');
            if (navItem) {
                navItem.style.display = 'none';
            } else {
                // Fallback for malformed HTML (link not in li)
                link.style.display = 'none';
            }
        }
    });

    // Inject Footer
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !document.querySelector('.admin-footer')) {
        const footer = document.createElement('footer');
        footer.className = 'admin-footer';
        footer.innerHTML = `Powered by <a href="https://www.gridify.in" target="_blank" style="text-decoration: none;"><span>GRIDIFY</span></a>`;
        mainContent.appendChild(footer);
    }

    // Set Active State
    const activeId = pageMap[page] || 'nav-dashboard';
    const activeLink = document.getElementById(activeId);
    if (activeLink) {
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        activeLink.classList.add('active');
    }

    // Update Topbar Info
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');
    const avatarEl = document.querySelector('.avatar');

    if (nameEl && roleEl && avatarEl) {
        nameEl.innerText = userInfo.displayName;
        roleEl.innerText = userInfo.roleDisplay;
        avatarEl.innerText = userInfo.initial;

        // Profile Click
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.querySelectorAll('.user-info, .avatar').forEach(el => {
                el.style.cursor = 'pointer';
            });
            userProfile.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    window.location.href = 'profile.html';
                }
            });
        }

        initMobileSidebar();
    }
}

// Global Logout function (shared across pages)
window.handleLogout = async () => {
    // Clear Sidebar Cache
    sessionStorage.removeItem(CACHE_KEYS.HTML);
    sessionStorage.removeItem(CACHE_KEYS.METADATA);

    if (window.supabaseClient) {
        const { error } = await window.supabaseClient.auth.signOut();
        if (!error) window.location.href = 'login.html';
    } else {
        try {
            const mod = await import('/assets/js/supabase-client.js');
            const { error } = await mod.supabase.auth.signOut();
            if (!error) window.location.href = 'login.html';
        } catch (e) {
            const mod = await import('./supabase-client.js');
            const { error } = await mod.supabase.auth.signOut();
            if (!error) window.location.href = 'login.html';
        }
    }
};

/**
 * Inactivity Auto-Logout (30 Minutes)
 */
function setupInactivityTimer() {
    const INACTIVITY_LIMIT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    let timeoutId;

    const resetTimer = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            console.log("Inactivity limit reached. Logging out...");
            window.handleLogout();
        }, INACTIVITY_LIMIT);
    };

    // Events to track user activity
    const activityEvents = [
        'mousedown', 'mousemove', 'keypress',
        'scroll', 'touchstart', 'click'
    ];

    // Throttle event listener to improve performance
    let lastActivity = Date.now();
    const handleActivity = () => {
        const now = Date.now();
        if (now - lastActivity > 1000) { // Only reset if 1 second has passed
            lastActivity = now;
            resetTimer();
        }
    };

    activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, true);
    });

    // Initial start
    resetTimer();
}

/**
 * In-Portal Alert System (Toast)
 * Replaces native browser alert()
 */
window.showAlert = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-alert ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    toast.innerHTML = `
        <i class="toast-icon ${icons[type] || icons.info}"></i>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

// Override native alert if possible (optional but helpful)
// window.alert = (msg) => window.showAlert(msg);

/**
 * Custom Confirmation Component
 * Replaces native confirm()
 */
window.showConfirm = (title, message) => {
    return new Promise((resolve) => {
        let overlay = document.querySelector('.confirm-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'confirm-modal-overlay';
            overlay.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-title"></div>
                    <div class="confirm-message"></div>
                    <div class="confirm-actions">
                        <button class="confirm-btn confirm-btn-cancel">Cancel</button>
                        <button class="confirm-btn confirm-btn-confirm">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const titleEl = overlay.querySelector('.confirm-title');
        const msgEl = overlay.querySelector('.confirm-message');
        const cancelBtn = overlay.querySelector('.confirm-btn-cancel');
        const confirmBtn = overlay.querySelector('.confirm-btn-confirm');

        titleEl.innerText = title;
        msgEl.innerText = message;

        const handleAction = (result) => {
            overlay.classList.remove('show');
            // Remove listeners to prevent memory leaks and multiple triggers
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            setTimeout(() => resolve(result), 300);
        };

        confirmBtn.onclick = () => handleAction(true);
        cancelBtn.onclick = () => handleAction(false);

        overlay.classList.add('show');
    });
};

/**
 * Mobile Sidebar Logic
 */
function initMobileSidebar() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    // Check Duplicate
    if (document.querySelector('.mobile-nav-toggle')) return;

    // Create Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-nav-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
    toggleBtn.setAttribute('aria-label', 'Toggle Sidebar');

    // Prepend to Topbar
    topbar.insertBefore(toggleBtn, topbar.firstChild);

    // Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay.addEventListener('click', closeSidebar);

    // Close on link click (only on mobile)
    sidebar.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 991) {
                closeSidebar();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSidebar();
    setupInactivityTimer();
});
