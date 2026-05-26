/**
 * AuthService - Hybrid Authentication
 * Uses real API backend integration with fallback to Mock data for presentation
 * Croissant Rouge Tunisien
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_GATEWAY_URL = 'http://10.0.2.2:8060'; // 10.0.2.2 points to localhost specifically for Android EMULATOR. Replace with true local IP for physical devices (e.g., http://192.168.1.x:8060).


const MOCK_USERS = [
    {
        id: '001',
        matricule: 'CRT001',
        password: '1234',
        nom: 'Ahmed',
        prenom: 'Ben Ali',
        role: 'ndrt',
        delegation: 'Tunis',
        phone: '+216 71 000 001',
        avatar: null,
        dateAdhesion: '2019-03-15',
        certifications: ['PSE1', 'PSE2', 'IVV'],
        unreadNotifications: 3,
    },
    {
        id: '002',
        matricule: 'CRT002',
        password: '1234',
        nom: 'Fatma',
        prenom: 'Trabelsi',
        role: 'rdrt',
        delegation: 'Sfax',
        phone: '+216 74 000 002',
        avatar: null,
        dateAdhesion: '2020-06-22',
        certifications: ['PSE1', 'PSE2', 'RDRT Formation'],
        unreadNotifications: 1,
    },
    {
        id: '003',
        matricule: 'CRT003',
        password: '1234',
        nom: 'Mohamed',
        prenom: 'Khelifi',
        role: 'secouriste',
        delegation: 'Sousse',
        phone: '+216 73 000 003',
        avatar: null,
        dateAdhesion: '2022-01-10',
        certifications: ['PSE1'],
        unreadNotifications: 0,
    },
    {
        id: '004',
        matricule: 'CRT004',
        password: '1234',
        nom: 'Leila',
        prenom: 'Mansour',
        role: 'chef_equipe',
        delegation: 'Bizerte',
        phone: '+216 72 000 004',
        avatar: null,
        dateAdhesion: '2017-09-05',
        certifications: ['PSE1', 'PSE2', 'Chef Équipe', 'IVV'],
        unreadNotifications: 5,
    },
    {
        id: '005',
        matricule: 'CRT005',
        password: '1234',
        nom: 'Khalil',
        prenom: 'Ezzine',
        role: 'volunteer',
        delegation: 'Monastir',
        phone: '+216 73 000 005',
        avatar: null,
        dateAdhesion: '2023-05-18',
        certifications: [],
        unreadNotifications: 0,
    },
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const authService = {
    async login(matricule, password) {
        await delay(800); // Simule latence réseau / UX

        // 1. Presentation Fallback: Check hardcoded MOCK_USERS first
        const found = MOCK_USERS.find(
            (u) =>
                u.matricule.toLowerCase() === matricule.toLowerCase() &&
                u.password === password
        );

        if (found) {
            const { password: _, ...safeUser } = found;
            return { success: true, user: safeUser };
        }

        // 2. Real Integration: Call the Core Service via API Gateway
        try {
            const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricule, password })
            });

            if (!response.ok) {
                return { success: false, error: 'Matricule ou mot de passe incorrect.' };
            }

            const data = await response.json();

            // Save token and profile to local storage for subsequent app bootups
            if (data.token) {
                await AsyncStorage.setItem('jwt_token', data.token);
            }

            const userParams = data.user || data;
            await AsyncStorage.setItem('user_profile', JSON.stringify(userParams));

            return { success: true, user: userParams };

        } catch (error) {
            console.error('[AuthService] Login Error:', error);
            return { success: false, error: 'Connexion au serveur échouée.' };
        }
    },

    async getProfile(userId) {
        await delay(400);

        // 1. Presentation Fallback
        const found = MOCK_USERS.find((u) => u.id === userId);
        if (found) {
            const { password: _, ...safeUser } = found;
            return safeUser;
        }

        // 2. Real Integration: Retrieve cached user profile
        try {
            const profileString = await AsyncStorage.getItem('user_profile');
            if (profileString) {
                const profile = JSON.parse(profileString);
                // Return if it matches or if backend just uses one universal profile logic
                if (profile.id === userId || profile.matricule === userId) {
                    return profile;
                }
            }
        } catch (e) {
            console.error('[AuthService] GetProfile Error:', e);
        }

        return null;
    },
};
