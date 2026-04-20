// ============================================================
// NEXUS-AID - Axios API Client
// Centralized HTTP client with interceptors for auth
// ============================================================

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from '@/config/env';
import type { ApiError } from '@/types';

const apiClient = axios.create({
    baseURL: `${config.apiBaseUrl}/v1`,
    timeout: config.apiTimeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

const SESSION_VALIDATION_PATHS = ['/profiles/me', '/auth/refresh'];

function shouldForceRelogin(requestUrl?: string): boolean {
    if (!requestUrl) return false;
    return SESSION_VALIDATION_PATHS.some((path) => requestUrl.includes(path));
}

// ---- Request Interceptor: Attach JWT token ----
apiClient.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem(config.tokenKey);
        if (token && requestConfig.headers) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
        }
        return requestConfig;
    },
    (error) => Promise.reject(error)
);

// ---- Response Interceptor: Handle 401 ----
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url;

            // Avoid hard logout on crisis/radar endpoint auth mismatches.
            // Force relogin only for explicit auth/session validation calls.
            if (shouldForceRelogin(requestUrl)) {
                localStorage.removeItem(config.tokenKey);
                localStorage.removeItem(config.userKey);
                if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
