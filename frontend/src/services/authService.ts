// ============================================================
// NEXUS-AID — Auth Service
// Login, register, profile, refresh token, logout API calls
// ============================================================

import apiClient from './api';
import type { AuthResponse, LoginCredentials, RegisterData, ProfileResponse } from '@/types';

/**
 * Login a user and return the JWT token and basic info.
 * Sends captchaToken when CAPTCHA is required.
 */
export const login = async (credentials: LoginCredentials & { captchaToken?: string }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
};

/**
 * Register a new volunteer or donor account.
 * Sends captchaToken for CAPTCHA verification.
 */
export const register = async (registerData: RegisterData & { captchaToken?: string }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', registerData);
    return data;
};

/**
 * Refresh the access token using a refresh token.
 */
export const refreshToken = async (refreshTokenStr: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
        refreshToken: refreshTokenStr,
    });
    return data;
};

/**
 * Logout — revoke all refresh tokens on server side.
 */
export const logout = async (): Promise<void> => {
    try {
        await apiClient.post('/auth/logout');
    } catch {
        // Ignore errors on logout — we'll clear local state anyway
    }
};

/**
 * Fetch the currently authenticated user's profile details.
 */
export const getProfile = async (): Promise<ProfileResponse> => {
    const { data } = await apiClient.get<ProfileResponse>('/profiles/me');
    return data;
};

/**
 * Update the user's profile picture URL in the database.
 * @param avatarUrl The Cloudinary URL.
 * @param publicId The Cloudinary public ID.
 */
export const updateAvatarUrl = async (avatarUrl: string, publicId: string): Promise<string> => {
    const { data } = await apiClient.put<string>('/profiles/me/avatar-url', { avatarUrl, publicId });
    return data;
};

// Default export as an object for backward compatibility
const authService = {
    login,
    register,
    refreshToken,
    logout,
    getProfile,
    updateAvatarUrl,
};

export default authService;
