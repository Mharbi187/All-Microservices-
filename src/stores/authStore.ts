// ============================================================
// NEXUS-AID — Auth Store (Zustand)
// Global authentication state management
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

    // Actions
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<string>;
    logout: () => void;
    setUser: (user: User) => void;
    checkAuth: () => Promise<void>;
    fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (credentials: LoginCredentials) => {
                set({ isLoading: true });
                try {
                    // 1. Call login API — returns { token, id, email, fullName, message }
                    const authResponse = await authService.login(credentials);

                    // 2. Store JWT token
                    localStorage.setItem(config.tokenKey, authResponse.token);

                    // 3. Build initial user object
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
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            register: async (data: RegisterData) => {
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
                localStorage.removeItem(config.tokenKey);
                localStorage.removeItem(config.userKey);
                set({
                    user: null,
                    isAuthenticated: false,
                });
            },

            setUser: (user: User) => {
                set({ user, isAuthenticated: true });
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
                            rawRoles: profile.roles || [],
                            committeeId: committeeId || profile.committeeId || '',
                            committeeName,
                            status: profile.accountStatus as import('@/types').AccountStatus | undefined,
                            isActive: profile.accountStatus === 'APPROVED',
                            // Extended fields
                            matricule: profile.matricule,
                            cin: profile.cin,
                            skills: profile.skills,
                            hoursVolunteered: profile.hoursVolunteered,
                            dateAdhesion: profile.dateAdhesion,
                            phone: profile.phone,
                            avatar: profile.avatar || state.user?.avatar,
                            firstLoginCompleted: profile.firstLoginCompleted ?? state.user?.firstLoginCompleted,
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
                }
            },
        }),
        {
            name: config.userKey,
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
