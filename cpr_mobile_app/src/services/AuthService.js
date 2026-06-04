/**
 * AuthService - Real Backend Authentication with Fallback
 * Uses api-gateway to connect to core-service database
 * Croissant Rouge Tunisien
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Automatically gets the Laptop's Wi-Fi IP address from Expo (e.g., 192.168.1.53)
const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
const hostIp = debuggerHost ? debuggerHost.split(':')[0] : '10.0.2.2';

const API_GATEWAY_URL = `http://${hostIp}:8060`;

const MOCK_USERS = [
    {
        id: '001',
        email: 'president.national@crt.tn',
        password: 'pass',
        matricule: 'CRT-NAT-01',
        nom: 'Ben Ali',
        prenom: 'Ahmed',
        role: 'responsable',
        delegation: 'National',
        phone: '+216 71 000 000',
        avatar: null,
        dateAdhesion: '2015-01-01',
        certifications: ['PSE1', 'PSE2', 'Formateur', 'Chef Équipe'],
        unreadNotifications: 5,
    },
    {
        id: '002',
        email: 'president.tunis@crt.tn',
        password: 'pass',
        matricule: 'CRT-TUN-01',
        nom: 'Trabelsi',
        prenom: 'Fatma',
        role: 'chef_equipe',
        delegation: 'Tunis',
        phone: '+216 71 000 001',
        avatar: null,
        dateAdhesion: '2016-05-12',
        certifications: ['PSE1', 'PSE2', 'Chef Équipe'],
        unreadNotifications: 2,
    },
    {
        id: '003',
        email: 'president.ariana@crt.tn',
        password: 'pass',
        matricule: 'CRT-ARI-01',
        nom: 'Jelassi',
        prenom: 'Mohamed',
        role: 'ndrt',
        delegation: 'Ariana',
        phone: '+216 71 000 002',
        avatar: null,
        dateAdhesion: '2018-09-01',
        certifications: ['PSE1', 'PSE2', 'NDRT'],
        unreadNotifications: 0,
    },
    {
        id: '004',
        email: 'sec.ariana@crt.tn',
        password: 'pass',
        matricule: 'CRT-ARI-02',
        nom: 'Mansouri',
        prenom: 'Sami',
        role: 'secouriste',
        delegation: 'Ariana',
        phone: '+216 71 000 003',
        avatar: null,
        dateAdhesion: '2020-02-15',
        certifications: ['PSE1', 'PSE2'],
        unreadNotifications: 1,
    },
    {
        id: '005',
        email: 'test.mobile@crt.tn',
        password: 'pass',
        matricule: 'MAT-999',
        nom: 'Mobile',
        prenom: 'Test',
        role: 'volunteer',
        delegation: 'Tunis',
        phone: '+216 20 000 000',
        avatar: null,
        dateAdhesion: '2024-05-28',
        certifications: [],
        unreadNotifications: 0,
    }
];

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
                    await AsyncStorage.setItem('jwt_token', data.token);
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
            console.log('[AuthService] Falling back to MOCK_USERS...');

            // --- FALLBACK TO MOCK ---
            const found = MOCK_USERS.find(
                (u) =>
                    u.email.toLowerCase() === email.toLowerCase() &&
                    u.password === password
            );

            if (found) {
                console.log('[AuthService] Fallback Mock Login Success!');
                const { password: _, ...safeUser } = found;

                // CRITICAL: We must save the mock token and profile to local storage so the UI can read it
                await AsyncStorage.setItem('jwt_token', 'mock-offline-token');
                await AsyncStorage.setItem('auth_user', JSON.stringify(safeUser));
                await AsyncStorage.setItem('user_profile', JSON.stringify(safeUser));

                return { success: true, user: safeUser };
            }

            return { success: false, error: 'Connexion échouée. Serveur indisponible et Mock invalide.' };
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

        // Mock Fallback
        const found = MOCK_USERS.find((u) => u.id === userId);
        if (found) {
            const { password: _, ...safeUser } = found;
            return safeUser;
        }

        return null;
    },
};
