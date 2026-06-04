// ============================================================
// NEXUS-AID — Auth Service
// Login, register, profile API calls
// ============================================================

import apiClient from './api';
import type { AuthResponse, LoginCredentials, RegisterData, ProfileResponse } from '@/types';

/**
 * Login a user and return the JWT token and basic info.
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
};

/**
 * Register a new volunteer or donor account.
 */
export const register = async (registerData: RegisterData): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', registerData);
    return data;
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

/**
 * Update general profile information.
 */
export const updateProfile = async (updates: Record<string, unknown>): Promise<void> => {
    await apiClient.put('/profiles/me', updates);
};

/**
 * Downloads the volunteer's QR badge as a blob URL.
 */
export const getMyBadgeQr = async (volunteerId: string): Promise<string> => {
    const { data } = await apiClient.get(`/profiles/${volunteerId}/badge-qr`, { responseType: 'blob' });
    return URL.createObjectURL(data);
};

/**
 * Request a password-reset link to be sent to the given email address.
 * Always resolves — the backend always responds 200 (anti-enumeration).
 */
export const forgotPassword = async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
};

/**
 * Submit a new password using the reset token received by email.
 * Throws on validation failure (token expired, already used, weak password…).
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    const { data } = await apiClient.post<{ error?: string }>('/auth/reset-password', { token, newPassword });
    if (data?.error) throw new Error(data.error);
};

// Default export as an object for backward compatibility
const authService = {
    login,
    register,
    getProfile,
    updateAvatarUrl,
    updateProfile,
    getMyBadgeQr,
    forgotPassword,
    resetPassword,
};

export default authService;
