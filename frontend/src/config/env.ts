// ============================================================
// NEXUS-AID — Environment Configuration
// Centralized config from environment variables
// ============================================================

export const config = {
    // API
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,

    // Auth
    tokenKey: 'nexus_aid_token',
    refreshTokenKey: 'nexus_aid_refresh_token',
    userKey: 'nexus_aid_user',

    // App
    appName: 'Nexus-AID',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    defaultLanguage: (import.meta.env.VITE_DEFAULT_LANGUAGE as string) || 'fr',

    // Features
    enableAI: import.meta.env.VITE_ENABLE_AI !== 'false',
    enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE !== 'false',

    // Security
    recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Leh78ssAAAAACgk1A_-8aPHU_2m58o4dtrlad3U',
} as const;
