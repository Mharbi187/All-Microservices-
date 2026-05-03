/**
 * AuthContext - Gestion de l'authentification et des rôles
 * Croissant Rouge Tunisien
 * 
 * Rôles: visitor | volunteer | secouriste | ndrt | rdrt | chef_equipe | responsable
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/AuthService';

const AuthContext = createContext(null);

export const ROLES = {
    VISITOR: 'visitor',
    VOLUNTEER: 'volunteer',
    SECOURISTE: 'secouriste',
    NDRT: 'ndrt',
    RDRT: 'rdrt',
    CHEF_EQUIPE: 'chef_equipe',
    RESPONSABLE: 'responsable',
};

export const ROLE_LABELS = {
    visitor: 'Visiteur',
    volunteer: 'Bénévole',
    secouriste: 'Secouriste',
    ndrt: 'Membre NDRT',
    rdrt: 'Membre RDRT',
    chef_equipe: 'Chef d\'Équipe',
    responsable: 'Responsable',
};

export const ROLE_COLORS = {
    visitor: '#6B7280',
    volunteer: '#10B981',
    secouriste: '#3B82F6',
    ndrt: '#DC2626',
    rdrt: '#7C3AED',
    chef_equipe: '#F59E0B',
    responsable: '#DC2626',
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        loadStoredUser();
    }, []);

    const loadStoredUser = async () => {
        try {
            const stored = await AsyncStorage.getItem('auth_user');
            if (stored) {
                const userData = JSON.parse(stored);
                setUser(userData);
                setIsAuthenticated(true);
            }
        } catch (e) {
            console.warn('Erreur chargement user:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (matricule, password) => {
        const result = await authService.login(matricule, password);
        if (result.success) {
            await AsyncStorage.setItem('auth_user', JSON.stringify(result.user));
            setUser(result.user);
            setIsAuthenticated(true);
        }
        return result;
    };

    const logout = async () => {
        await AsyncStorage.removeItem('auth_user');
        setUser(null);
        setIsAuthenticated(false);
    };

    const hasRole = (...roles) => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    const isNDRTorRDRT = () => hasRole(ROLES.NDRT, ROLES.RDRT, ROLES.CHEF_EQUIPE, ROLES.RESPONSABLE);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated,
            login,
            logout,
            hasRole,
            isNDRTorRDRT,
            ROLES,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
    return ctx;
};
