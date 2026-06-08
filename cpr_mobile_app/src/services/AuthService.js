/**
 * AuthService - Real Backend Authentication with Fallback
 * Uses api-gateway to connect to core-service database
 * Croissant Rouge Tunisien
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Automatically gets the Laptop's Wi-Fi IP address from Expo (e.g., 192.168.1.53)
const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
const hostIp = debuggerHost ? debuggerHost.split(':')[0] : '10.0.2.2';

// Use Production server domain unconditionally for API Gateway
const API_GATEWAY_URL = 'https://nexus-aid.me';

export const authService = {
    async login(email, password) {
        try {
            console.log(`[AuthService] Attempting real login via ${API_GATEWAY_URL}/api/v1/auth/login`);

            const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                const rawUser = data.user || data;

                if (data.token) {
                    await SecureStore.setItemAsync('jwt_token', data.token);
                    await AsyncStorage.setItem('auth_user', JSON.stringify(rawUser));
                }

                await AsyncStorage.setItem('user_profile', JSON.stringify(rawUser));

                console.log('[AuthService] Real Login Success with Normalized User from Backend!');
                return { success: true, user: rawUser };
            }

            // Server responded with 4xx/5xx (e.g. wrong password)
            console.log('[AuthService] Real Login failed (Wrong credentials or server error)');
            return { success: false, error: 'Identifiants invalides.' };

        } catch (error) {
            console.error('[AuthService] Network Error against API Gateway:', error);
            return { success: false, error: 'Connexion échouée. Serveur indisponible.' };
        }
    },

    async getProfile(userId) {
        try {
            const profileString = await AsyncStorage.getItem('user_profile');
            if (profileString) {
                const profile = JSON.parse(profileString);
                if (profile.id === userId || profile.matricule === userId || profile.email === userId) {
                    return profile;
                }
            }
        } catch (e) {
            console.error('[AuthService] GetProfile Error:', e);
        }

        return null;
    },
};
