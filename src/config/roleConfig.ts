// ============================================================
// NEXUS-AID — Role Configuration
// Maps each RoleTitle AND UserType to allowed routes + sidebar
// ============================================================

import type { RoleTitle, UserType } from '@/types';

export interface RolePermission {
    allowedRoutes: string[];
    sidebarKeys: string[];
    label: string;
    dashboardType: 'admin' | 'trainer' | 'donor' | 'volunteer';
}

// Shared routes available to all authenticated users
const SHARED_ROUTES = [
    '/dashboard',
    '/settings',
    '/volunteer/profile',
    '/volunteer/committee',
    '/volunteer/complaints',
    '/volunteer/resources',
    '/volunteer/quiz',
    '/volunteer/reception',
    '/notifications',
];
const SHARED_SIDEBAR = [
    '/dashboard',
    '/settings',
    '/volunteer/profile',
    '/volunteer/committee',
    '/volunteer/complaints',
    '/volunteer/resources',
    '/volunteer/quiz',
    '/volunteer/reception',
    '/notifications',
];

// Full access routes (President, VP, Admin)
const ALL_ROUTES = [
    ...SHARED_ROUTES,
    '/volunteers', '/committees', '/stocks', '/donations',
    '/reports', '/admin-reports', '/templates',
    '/catastrophes', '/radar', '/crisis-room',
    '/secourisme', '/diffusion', '/jeunesse', '/sante', '/social', '/immigration', '/vff',
    '/distribution-medicale',
    '/validation-queue', '/audit-logs'
];
const ALL_SIDEBAR = [
    ...SHARED_SIDEBAR,
    'management', '/volunteers', '/committees', '/validation-queue',
    '/stocks', '/donations',
    '/reports', '/admin-reports', '/templates',
    '/catastrophes', '/radar', '/audit-logs',
    'domains', '/secourisme', '/diffusion', '/jeunesse', '/sante', '/social', '/immigration', '/vff',
    '/distribution-medicale',
];

// ---- Committee RoleTitle permissions ----
export const ROLE_PERMISSIONS: Record<RoleTitle, RolePermission> = {
    PRESIDENT: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Président',
        dashboardType: 'volunteer',
    },
    PRESIDENT_LOCAL: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Président Local',
        dashboardType: 'volunteer',
    },
    PRESIDENT_REGIONAL: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Président Régional',
        dashboardType: 'volunteer',
    },
    PRESIDENT_NATIONAL: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Président National',
        dashboardType: 'volunteer',
    },
    VICE_PRESIDENT: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Vice-Président',
        dashboardType: 'volunteer',
    },
    VICE_PRESIDENT_LOCAL: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Vice-Président Local',
        dashboardType: 'volunteer',
    },
    VICE_PRESIDENT_REGIONAL: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Vice-Président Régional',
        dashboardType: 'volunteer',
    },
    VICE_PRESIDENT_NATIONAL: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Vice-Président National',
        dashboardType: 'volunteer',
    },
    SECRETAIRE_GENERAL: {
        allowedRoutes: [...SHARED_ROUTES, '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        sidebarKeys: [...SHARED_SIDEBAR, 'management', '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        label: 'Secrétaire Général',
        dashboardType: 'volunteer',
    },
    SECRETAIRE_GENERAL_LOCAL: {
        allowedRoutes: [...SHARED_ROUTES, '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        sidebarKeys: [...SHARED_SIDEBAR, 'management', '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        label: 'Secrétaire Général Local',
        dashboardType: 'volunteer',
    },
    SECRETAIRE_GENERAL_REGIONAL: {
        allowedRoutes: [...SHARED_ROUTES, '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        sidebarKeys: [...SHARED_SIDEBAR, 'management', '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        label: 'Secrétaire Général Régional',
        dashboardType: 'volunteer',
    },
    SECRETAIRE_GENERAL_NATIONAL: {
        allowedRoutes: [...SHARED_ROUTES, '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        sidebarKeys: [...SHARED_SIDEBAR, 'management', '/volunteers', '/committees', '/reports', '/admin-reports', '/templates', '/stocks'],
        label: 'Secrétaire Général National',
        dashboardType: 'volunteer',
    },
    RESP_SECOURISME: {
        allowedRoutes: [...SHARED_ROUTES, '/secourisme', '/stocks', '/reports', '/admin-reports', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/secourisme', '/stocks', '/reports', '/admin-reports', 'domains', '/validation-center'],
        label: 'Resp. Secourisme',
        dashboardType: 'volunteer',
    },
    RESP_DIFFUSION: {
        allowedRoutes: [...SHARED_ROUTES, '/diffusion', '/reports', '/admin-reports', '/volunteer/quiz', '/volunteer/news', '/volunteer/calendar', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/diffusion', '/reports', '/admin-reports', 'domains', '/volunteer/quiz', '/validation-center'],
        label: 'Resp. Diffusion',
        dashboardType: 'volunteer',
    },
    RESP_DIFFUSION_NATIONAL: {
        allowedRoutes: [...SHARED_ROUTES, '/diffusion', '/reports', '/admin-reports', '/volunteer/quiz', '/volunteer/news', '/volunteer/calendar', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/diffusion', '/reports', '/admin-reports', 'domains', '/volunteer/quiz', '/validation-center'],
        label: 'Resp. Diffusion National',
        dashboardType: 'volunteer',
    },
    RESP_JEUNESSE: {
        allowedRoutes: [...SHARED_ROUTES, '/jeunesse', '/reports', '/admin-reports', '/volunteers', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/jeunesse', '/reports', '/admin-reports', 'domains', 'management', '/volunteers', '/validation-center'],
        label: 'Resp. Jeunesse',
        dashboardType: 'volunteer',
    },
    RESP_SANTE: {
        allowedRoutes: [...SHARED_ROUTES, '/sante', '/distribution-medicale', '/stocks', '/reports', '/admin-reports', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/sante', '/distribution-medicale', '/stocks', '/reports', '/admin-reports', 'domains', '/validation-center'],
        label: 'Resp. Santé',
        dashboardType: 'volunteer',
    },
    RESP_CATASTROPHES: {
        allowedRoutes: [...SHARED_ROUTES, '/catastrophes', '/stocks', '/reports', '/admin-reports', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/catastrophes', '/stocks', '/reports', '/admin-reports', 'domains', '/validation-center'],
        label: 'Resp. Catastrophes',
        dashboardType: 'volunteer',
    },
    RESP_ACTION_SOCIALE: {
        allowedRoutes: [...SHARED_ROUTES, '/social', '/stocks', '/reports', '/admin-reports', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/social', '/stocks', '/reports', '/admin-reports', 'domains', '/validation-center'],
        label: 'Resp. Action Sociale',
        dashboardType: 'volunteer',
    },
    RESP_IMMIGRATION: {
        allowedRoutes: [...SHARED_ROUTES, '/immigration', '/reports', '/admin-reports', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/immigration', '/reports', '/admin-reports', 'domains', '/validation-center'],
        label: 'Resp. Immigration',
        dashboardType: 'volunteer',
    },
    RESP_VFF: {
        allowedRoutes: [...SHARED_ROUTES, '/vff', '/reports', '/admin-reports', '/validation-center'],
        sidebarKeys: [...SHARED_SIDEBAR, '/vff', '/reports', '/admin-reports', 'domains', '/validation-center'],
        label: 'Resp. VFF',
        dashboardType: 'volunteer',
    },
};

// ---- UserType-based permissions ----
export const USER_TYPE_PERMISSIONS: Record<UserType, RolePermission> = {
    ADMIN: {
        allowedRoutes: ALL_ROUTES,
        sidebarKeys: ALL_SIDEBAR,
        label: 'Web Master / Support',
        dashboardType: 'admin',
    },
    TRAINER: {
        allowedRoutes: [...SHARED_ROUTES, '/secourisme', '/secourisme/rcp-evaluation'],
        sidebarKeys: [...SHARED_SIDEBAR, '/secourisme', 'domains'],
        label: 'Formateur',
        dashboardType: 'trainer',
    },
    DONOR: {
        allowedRoutes: [
            '/donor',
            '/donor/dashboard',
            '/donor/map',
            '/donor/donate',
            '/donor/receipts',
            '/donor/notifications',
            '/donor/news',
            '/donor/profile',
            '/donor/complaints',
            '/settings',
        ],
        sidebarKeys: [
            '/donor/dashboard',
            '/donor/map',
            '/donor/donate',
            '/donor/receipts',
            '/donor/notifications',
            '/donor/news',
            '/donor/profile',
            '/donor/complaints',
            '/settings',
        ],
        label: 'Donateur',
        dashboardType: 'donor',
    },
    VOLUNTEER: {
        allowedRoutes: SHARED_ROUTES,
        sidebarKeys: SHARED_SIDEBAR,
        label: 'Volontaire',
        dashboardType: 'volunteer',
    },
};

/**
 * Get merged permissions for a user based on their UserType + committee roles.
 * UserType takes priority for ADMIN/TRAINER/DONOR.
 * VOLUNTEER merges committee role permissions.
 */
export function getUserPermissions(roles: RoleTitle[], userType?: UserType): RolePermission {
    // ADMIN: full access, always
    if (userType === 'ADMIN') {
        return USER_TYPE_PERMISSIONS.ADMIN;
    }

    // TRAINER: trainer base + any committee roles merged in
    if (userType === 'TRAINER') {
        const base = USER_TYPE_PERMISSIONS.TRAINER;
        if (!roles || roles.length === 0) return base;

        const mergedRoutes = new Set(base.allowedRoutes);
        const mergedSidebar = new Set(base.sidebarKeys);

        for (const role of roles) {
            const perm = ROLE_PERMISSIONS[role];
            if (perm) {
                perm.allowedRoutes.forEach(r => mergedRoutes.add(r));
                perm.sidebarKeys.forEach(s => mergedSidebar.add(s));
            }
        }

        return {
            allowedRoutes: Array.from(mergedRoutes),
            sidebarKeys: Array.from(mergedSidebar),
            label: base.label,
            dashboardType: 'trainer',
        };
    }

    // DONOR: limited access
    if (userType === 'DONOR') {
        return USER_TYPE_PERMISSIONS.DONOR;
    }

    // VOLUNTEER: merge committee role permissions
    if (!roles || roles.length === 0) {
        return {
            allowedRoutes: [...SHARED_ROUTES, '/volunteer/youth'],
            sidebarKeys: [...SHARED_SIDEBAR, '/volunteer/youth'],
            label: 'Volontaire',
            dashboardType: 'volunteer',
        };
    }

    const mergedRoutes = new Set<string>();
    const mergedSidebar = new Set<string>();
    let label = '';

    for (const role of roles) {
        const perm = ROLE_PERMISSIONS[role];
        if (perm) {
            perm.allowedRoutes.forEach(r => mergedRoutes.add(r));
            perm.sidebarKeys.forEach(s => mergedSidebar.add(s));
            if (!label) label = perm.label;
        }
    }

    return {
        allowedRoutes: Array.from(mergedRoutes),
        sidebarKeys: Array.from(mergedSidebar),
        label: label || 'Volontaire',
        dashboardType: 'volunteer',
    };
}
