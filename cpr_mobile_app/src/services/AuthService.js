/**
 * AuthService - Simulation d'authentification (mock data)
 * En attente d'intégration avec l'API backend réelle
 * Croissant Rouge Tunisien
 */

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
        await delay(800); // Simule latence réseau
        const found = MOCK_USERS.find(
            (u) =>
                u.matricule.toLowerCase() === matricule.toLowerCase() &&
                u.password === password
        );
        if (!found) {
            return { success: false, error: 'Matricule ou mot de passe incorrect.' };
        }
        const { password: _, ...safeUser } = found;
        return { success: true, user: safeUser };
    },

    async getProfile(userId) {
        await delay(400);
        const found = MOCK_USERS.find((u) => u.id === userId);
        if (!found) return null;
        const { password: _, ...safeUser } = found;
        return safeUser;
    },
};
