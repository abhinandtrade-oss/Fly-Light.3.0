import { supabase, fetchContent } from './supabase-client.js';

/**
 * Checks if the current user has permission to view the current page.
 * Needs to be called BEFORE showing the body content.
 * @param {string} pageId - The ID of the page/nav item (e.g. 'nav-accounts')
 * @returns {Promise<boolean>} - True if allowed, False if denied (and redirects/shows error)
 */
export async function checkPageAuth(pageId) {
    if (!pageId) return true;

    // 1. Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    const user = session.user;

    // 2. Fetch Roles & Registry
    // Try cache first to avoid slow loading
    const CACHE_KEY_META = 'fltt_sidebar_metadata';
    const CachedMeta = sessionStorage.getItem(CACHE_KEY_META);

    let userRole = null;
    let rolesConfig = null;

    if (CachedMeta) {
        try {
            const meta = JSON.parse(CachedMeta);
            // We assume cache is valid for the session
            // We could verify user email matches cache but if session matches, storage should match
            userRole = meta.userRole;
            rolesConfig = meta.rolesConfig;
        } catch (e) {
            console.warn('Invalid auth cache, refetching...');
        }
    }

    // If no cache or invalid, fetch fresh
    if (!userRole || !rolesConfig) {
        try {
            const [dRoles, dRegistry] = await Promise.all([
                fetchContent('admin_roles_config'),
                fetchContent('admin_users_registry')
            ]);

            rolesConfig = dRoles ? JSON.parse(dRoles) : {};

            // Set defaults if empty
            if (!rolesConfig || Object.keys(rolesConfig).length === 0) {
                rolesConfig = {
                    'super_admin': { permissions: ['nav-dashboard', 'nav-enquiries', 'nav-bookings', 'nav-insurance', 'nav-sales', 'nav-accounts', 'nav-email-config', 'nav-manage-images', 'nav-manage-booking-site', 'nav-manage-fleet', 'nav-manage-destinations', 'nav-announcements', 'nav-public-announcements', 'nav-careers', 'nav-hr', 'nav-taxi-portal'] },
                    'admin': { permissions: ['nav-dashboard', 'nav-enquiries', 'nav-bookings', 'nav-insurance', 'nav-sales', 'nav-accounts', 'nav-email-config', 'nav-manage-images', 'nav-manage-booking-site', 'nav-manage-fleet', 'nav-manage-destinations', 'nav-announcements', 'nav-public-announcements', 'nav-careers', 'nav-taxi-portal'] },
                    'taxi_driver': { permissions: ['nav-dashboard', 'nav-taxi-portal'] },
                    'viewer': { permissions: ['nav-dashboard'] }
                };
            }

            const registry = dRegistry ? JSON.parse(dRegistry) : [];
            const userEntry = registry.find(u => u.email.toLowerCase() === user.email.toLowerCase());
            userRole = userEntry?.role || user.user_metadata?.role || (registry.length === 0 ? 'super_admin' : 'admin');

            // Find display name for cache
            let name = user.user_metadata?.full_name || user.email.split('@')[0];
            if (name.toLowerCase() === 'admin') name = 'Admin';

            // Update Cache so sidebar doesn't re-fetch
            const userInfo = {
                displayName: name.toUpperCase(),
                roleDisplay: userRole.replace('_', ' ').toUpperCase(),
                initial: name.charAt(0).toUpperCase()
            };

            sessionStorage.setItem(CACHE_KEY_META, JSON.stringify({ userRole, rolesConfig, userInfo }));

        } catch (error) {
            console.error('Auth Guard Error:', error);
            // If we can't verify permissions, we must block access for security
            // unless we want to fail-open (dangerous). Fail-closed is better.
            showAccessDenied();
            return false;
        }
    }

    // 3. RBAC Check
    const isSuperAdmin = userRole === 'super_admin';
    const allowedNavs = rolesConfig[userRole]?.permissions || [];

    // Check if allowed
    if (!isSuperAdmin && !allowedNavs.includes(pageId)) {
        showAccessDenied();
        return false;
    }

    return true;
}

function showAccessDenied() {
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
    document.body.style.display = 'block';
}
