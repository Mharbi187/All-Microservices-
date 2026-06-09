// ============================================================
// NEXUS-AID — Axios API Client
// Centralized HTTP client with interceptors for auth & refresh
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

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
    refreshSubscribers.push(cb);
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

// ---- Response Interceptor: Auto-refresh on 401 ----
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized — attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't retry refresh/login/register endpoints
            const url = originalRequest.url || '';
            if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;
                const storedRefreshToken = localStorage.getItem(config.refreshTokenKey);

                if (!storedRefreshToken) {
                    // No refresh token — logout
                    clearAuthAndRedirect();
                    return Promise.reject(error);
                }

                try {
                    const response = await axios.post(`${config.apiBaseUrl}/v1/auth/refresh`, {
                        refreshToken: storedRefreshToken,
                    });

                    const { token: newToken, refreshToken: newRefreshToken } = response.data;

                    // Store new tokens
                    localStorage.setItem(config.tokenKey, newToken);
                    if (newRefreshToken) {
                        localStorage.setItem(config.refreshTokenKey, newRefreshToken);
                    }

                    isRefreshing = false;
                    onRefreshed(newToken);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return apiClient(originalRequest);
                } catch (refreshError) {
                    isRefreshing = false;
                    refreshSubscribers = [];
                    clearAuthAndRedirect();
                    return Promise.reject(refreshError);
                }
            } else {
                // Wait for the ongoing refresh to complete
                return new Promise((resolve) => {
                    addRefreshSubscriber((newToken: string) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(apiClient(originalRequest));
                    });
                });
            }
        }

        return Promise.reject(error);
    }
);

function clearAuthAndRedirect() {
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.refreshTokenKey);
    localStorage.removeItem(config.userKey);
    // Only redirect if not already on login/register pages
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
    }
}

export default apiClient;
