// ============================================================
// NEXUS-AID — Auth Store (Zustand)
// Global authentication state management with refresh tokens
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RegisterData, RoleTitle } from '@/types';
import { config } from '@/config/env';
import authService from '@/services/authService';

interface AuthState {
    // State
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    profileCompleted: boolean;

    // Security state
    failedAttempts: number;
    captchaRequired: boolean;
    blockRemainingSeconds: number;

    // Actions
    login: (credentials: LoginCredentials & { captchaToken?: string }) => Promise<void>;
    register: (data: RegisterData & { captchaToken?: string }) => Promise<string>;
    logout: () => void;
    setUser: (user: User) => void;
    checkAuth: () => Promise<void>;
    fetchProfile: () => Promise<void>;
    resetSecurityState: () => void;
    setProfileCompleted: (completed: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            profileCompleted: false,
            failedAttempts: 0,
            captchaRequired: false,
            blockRemainingSeconds: 0,

            login: async (credentials: LoginCredentials & { captchaToken?: string }) => {
                set({ isLoading: true });
                try {
                    // 1. Call login API — now returns security state too
                    const authResponse = await authService.login(credentials);

                    // 2. Check if CAPTCHA is required or IP is blocked
                    if (authResponse.captchaRequired && !authResponse.token) {
                        set({
                            isLoading: false,
                            captchaRequired: true,
                            failedAttempts: authResponse.failedAttempts || 0,
                            blockRemainingSeconds: authResponse.blockRemainingSeconds || 0,
                        });
                        throw new Error(authResponse.message || 'CAPTCHA verification required');
                    }

                    // 3. Check if login failed (no token returned)
                    if (!authResponse.token) {
                        set({
                            isLoading: false,
                            failedAttempts: authResponse.failedAttempts || 0,
                            captchaRequired: authResponse.captchaRequired || false,
                            blockRemainingSeconds: authResponse.blockRemainingSeconds || 0,
                        });
                        throw new Error(authResponse.message || 'Login failed');
                    }

                    // 4. Store JWT tokens
                    localStorage.setItem(config.tokenKey, authResponse.token);
                    if (authResponse.refreshToken) {
                        localStorage.setItem(config.refreshTokenKey, authResponse.refreshToken);
                    }

                    // 5. Build initial user object
                    const nameParts = authResponse.fullName.split(' ');
                    const user: User = {
                        id: authResponse.id,
                        email: authResponse.email,
                        fullName: authResponse.fullName,
                        firstName: nameParts[0] || '',
                        lastName: nameParts.slice(1).join(' ') || '',
                        roles: [],
                    };

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        profileCompleted: authResponse.profileCompleted ?? true,
                        failedAttempts: 0,
                        captchaRequired: false,
                        blockRemainingSeconds: 0,
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            register: async (data: RegisterData & { captchaToken?: string }) => {
                set({ isLoading: true });
                try {
                    const authResponse = await authService.register(data);
                    set({ isLoading: false });
                    return authResponse.message;
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                // Call server-side logout to revoke refresh tokens
                authService.logout().catch(() => {});

                localStorage.removeItem(config.tokenKey);
                localStorage.removeItem(config.refreshTokenKey);
                localStorage.removeItem(config.userKey);
                set({
                    user: null,
                    isAuthenticated: false,
                    failedAttempts: 0,
                    captchaRequired: false,
                    blockRemainingSeconds: 0,
                });
            },

            setUser: (user: User) => {
                set({ user, isAuthenticated: true });
            },

            resetSecurityState: () => {
                set({
                    failedAttempts: 0,
                    captchaRequired: false,
                    blockRemainingSeconds: 0,
                });
            },

            fetchProfile: async () => {
                try {
                    // Backend /profiles/me returns a flat object:
                    // { id, fullName, email, userType, accountStatus, roles: [{role, committee, committeeType, committeeId}] }
                    const profile = await authService.getProfile();

                    // Extract committee roles (RoleTitle enums) from the flat roles array
                    const roles: RoleTitle[] = [];
                    let committeeId = '';
                    let committeeName = '';

                    if (profile.roles && Array.isArray(profile.roles)) {
                        for (const roleObj of profile.roles) {
                            const roleTitle = roleObj.role as RoleTitle;
                            if (roleTitle && !roles.includes(roleTitle)) {
                                roles.push(roleTitle);
                            }
                            // Use first committee as primary
                            if (!committeeId && roleObj.committeeId) {
                                committeeId = String(roleObj.committeeId);
                                committeeName = roleObj.committee || '';
                            }
                        }
                    }

                    const fullName = profile.fullName || '';
                    const nameParts = fullName.split(' ');

                    // Map backend's userType to frontend's UserType
                    const userType = profile.userType as import('@/types').UserType | undefined;

                    set((state) => ({
                        user: {
                            ...state.user,
                            id: String(profile.id || state.user?.id || ''),
                            email: profile.email || state.user?.email || '',
                            fullName,
                            firstName: nameParts[0] || '',
                            lastName: nameParts.slice(1).join(' ') || '',
                            type: userType,
                            roles,
                            committeeId,
                            committeeName,
                            status: profile.accountStatus as import('@/types').AccountStatus | undefined,
                            isActive: profile.accountStatus === 'APPROVED',
                        } as User,
                    }));
                } catch (err) {
                    // Profile fetch failed — user can still use basic info from login
                    console.warn('Could not fetch profile — using basic auth info', err);
                }
            },

            checkAuth: async () => {
                const token = localStorage.getItem(config.tokenKey);
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return;
                }

                try {
                    // Validate token by fetching profile
                    await get().fetchProfile();
                    set((state) => ({ isAuthenticated: !!state.user }));
                } catch {
                    set({ isAuthenticated: false, user: null });
                    localStorage.removeItem(config.tokenKey);
                    localStorage.removeItem(config.refreshTokenKey);
                }
            },

            setProfileCompleted: (completed: boolean) => set({ profileCompleted: completed }),
        }),
        {
            name: config.userKey,
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                profileCompleted: state.profileCompleted,
            }),

        }
    )
);
