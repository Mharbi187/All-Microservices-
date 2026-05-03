/**
 * MockDataService - Données de simulation
 * Remplace les APIs non disponibles pour le moment
 * Croissant Rouge Tunisien
 */

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// ──────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
    {
        id: 'notif-001',
        type: 'intervention',
        priority: 'urgent',
        title: '🚨 Intervention NDRT — Séisme Nabeul',
        body: 'Mobilisation immédiate. Séisme de magnitude 5.2 enregistré à 22 km de Nabeul. Besoin de 4 équipiers NDRT. Départ depuis siège régional à 06h00.',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false,
        status: 'pending',
        location: 'Nabeul, Gouvernorat de Nabeul',
        duration: '72h',
        requiredProfiles: ['NDRT', 'Secouriste'],
        coordinator: 'Dr. Youssef Ben Salah',
    },
    {
        id: 'notif-002',
        type: 'formation',
        priority: 'high',
        title: '📋 Rappel Formation NDRT — Module Eau & Assainissement',
        body: 'La formation du 20 juin approche. Confirmez votre participation avant le 15 juin. Matériel requis : kit personnel, tenue terrain.',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        status: 'pending',
        location: 'Centre de Formation CRT, Tunis',
        duration: '3 jours',
        requiredProfiles: ['NDRT', 'RDRT'],
        coordinator: 'Mme Sonia Khlifi',
    },
    {
        id: 'notif-003',
        type: 'intervention',
        priority: 'high',
        title: '🌊 Alerte Inondations — Gouvernorat de Sfax',
        body: 'Fortes pluies en cours. Déploiement d\'équipes de secours dans les quartiers sinistrés. Besoin de renforts RDRT.',
        date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        read: true,
        status: 'accepted',
        location: 'Sfax, Gouvernorat de Sfax',
        duration: '48h',
        requiredProfiles: ['RDRT', 'NDRT'],
        coordinator: 'M. Hechmi Trabelsi',
    },
    {
        id: 'notif-004',
        type: 'reunion',
        priority: 'normal',
        title: '📣 Réunion de coordination RDRT — Mensuelle',
        body: 'Réunion mensuelle des membres RDRT actifs. Revue des procédures et mise à jour des protocoles d\'intervention.',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        status: 'accepted',
        location: 'Siège National CRT, Tunis',
        duration: '2h',
        requiredProfiles: ['RDRT'],
        coordinator: 'Président National',
    },
    {
        id: 'notif-005',
        type: 'info',
        priority: 'info',
        title: 'ℹ️ Mise à jour des cartes membres NDRT/RDRT',
        body: 'Les nouvelles cartes sont disponibles au siège. Merci de passer les récupérer avec votre matricule.',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        status: 'read',
        location: 'Siège National CRT, Tunis',
        duration: null,
        requiredProfiles: ['NDRT', 'RDRT'],
        coordinator: 'Administration',
    },
    {
        id: 'notif-006',
        type: 'intervention',
        priority: 'urgent',
        title: '🔥 Incendie Forêt — Bizerte',
        body: 'Grand incendie de forêt dans la région de Bizerte. Coordination avec la protection civile. Besoin de médecins et secouristes.',
        date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false,
        status: 'pending',
        location: 'Forêt de Bizerte',
        duration: '96h',
        requiredProfiles: ['NDRT', 'Médecin', 'Secouriste'],
        coordinator: 'M. Khaled Mansouri',
    },
];

// ──────────────────────────────────────────────────────────────────────────────
// WEATHER
// ──────────────────────────────────────────────────────────────────────────────
const WEATHER_DATA = {
    Tunis: {
        city: 'Tunis', temp: 28, feelsLike: 31, description: 'Partiellement nuageux',
        icon: '⛅', humidity: 62, wind: 18, visibility: 14,
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        alert: null,
    },
    Sfax: {
        city: 'Sfax', temp: 33, feelsLike: 36, description: 'Ensoleillé',
        icon: '☀️', humidity: 48, wind: 22, visibility: 18,
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        alert: 'Chaleur intense prévue. Hydratation recommandée pour les équipes terrain.',
    },
    Sousse: {
        city: 'Sousse', temp: 30, feelsLike: 32, description: 'Ensoleillé avec nuages',
        icon: '🌤️', humidity: 55, wind: 15, visibility: 16,
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        alert: null,
    },
    Bizerte: {
        city: 'Bizerte', temp: 25, feelsLike: 26, description: 'Nuageux',
        icon: '🌥️', humidity: 72, wind: 28, visibility: 10,
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        alert: 'Vents forts en côte — Prudence pour les opérations bord de mer.',
    },
    Monastir: {
        city: 'Monastir', temp: 29, feelsLike: 30, description: 'Beau temps',
        icon: '🌞', humidity: 52, wind: 12, visibility: 20,
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        alert: null,
    },
    Nabeul: {
        city: 'Nabeul', temp: 27, feelsLike: 28, description: 'Quelques averses',
        icon: '🌦️', humidity: 68, wind: 20, visibility: 12,
        date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        alert: 'Risque d\'averses intermittentes. Equipements imperméables conseillés.',
    },
};

const FORECAST_TEMPLATES = [
    { day: 'Lun', icon: '☀️', max: 30, min: 20 },
    { day: 'Mar', icon: '⛅', max: 28, min: 19 },
    { day: 'Mer', icon: '🌧️', max: 24, min: 17 },
    { day: 'Jeu', icon: '🌦️', max: 26, min: 18 },
    { day: 'Ven', icon: '🌤️', max: 29, min: 20 },
    { day: 'Sam', icon: '☀️', max: 32, min: 21 },
    { day: 'Dim', icon: '☀️', max: 33, min: 22 },
];

// ──────────────────────────────────────────────────────────────────────────────
// CALENDAR EVENTS
// ──────────────────────────────────────────────────────────────────────────────
function buildCalendarEvents() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    return [
        {
            id: 'ev-001',
            title: 'Formation PSE1/PSE2 — Mise à Niveau',
            type: 'formation',
            date: new Date(y, m, 5).toISOString(),
            time: '09h00 – 17h00',
            location: 'Centre CRT Tunis',
            organizer: 'Dr. Ben Ali',
            participants: 24,
            description: 'Session de mise à niveau pour tous les secouristes. Révision des gestes de premiers secours, mannequins disponibles. Tenue adéquate requise.',
        },
        {
            id: 'ev-002',
            title: 'Réunion Mensuelle Équipes',
            type: 'reunion',
            date: new Date(y, m, 8).toISOString(),
            time: '14h00 – 16h00',
            location: 'Salle de conférence, Siège National',
            organizer: 'Chef d\'Équipe Hachmi',
            participants: 15,
            description: 'Revue des activités du mois passé. Présentation du calendrier NDRT/RDRT. Questions diverses.',
        },
        {
            id: 'ev-003',
            title: 'Exercice Terrain — Simulation Séisme',
            type: 'exercice',
            date: new Date(y, m, 12).toISOString(),
            time: '08h00 – 13h00',
            location: 'Parc Ennahli, Tunis',
            organizer: 'Coordinateur NDRT',
            participants: 40,
            description: 'Exercice de simulation grandeur réelle. Scénario séisme urbain. Équipement complet obligatoire. Repas pris en charge.',
        },
        {
            id: 'ev-004',
            title: 'Collecte de Sang — Campagne Nationale',
            type: 'intervention',
            date: new Date(y, m, 15).toISOString(),
            time: '10h00 – 18h00',
            location: 'Centre Commercial La Marsa',
            organizer: 'Service Transfusion CRT',
            participants: 200,
            description: 'Campagne nationale de collecte de sang. Bénévoles requis pour accueil, enregistrement et suivi des donneurs.',
        },
        {
            id: 'ev-005',
            title: 'Formation DEA — Défibrillateur',
            type: 'formation',
            date: new Date(y, m, 18).toISOString(),
            time: '09h00 – 12h00',
            location: 'Hôpital Charles Nicolle — Salle A',
            organizer: 'Dr. Sana Ben Yedder',
            participants: 12,
            description: 'Formation pratique sur l\'utilisation du défibrillateur automatisé externe. Places limitées à 12 participants.',
        },
        {
            id: 'ev-006',
            title: 'Intervention Communautaire — Cité Ettadhamen',
            type: 'intervention',
            date: new Date(y, m, 20).toISOString(),
            time: '08h30 – 17h00',
            location: 'Cité Ettadhamen, Tunis',
            organizer: 'Responsable Délégation Tunis',
            participants: 30,
            description: 'Journée d\'action communautaire : sensibilisation aux premiers secours, distribution kits hygiène, visites familles vulnérables.',
        },
        {
            id: 'ev-007',
            title: 'Réunion RDRT — Coordination Régionale',
            type: 'reunion',
            date: new Date(y, m, 22).toISOString(),
            time: '15h00 – 17h30',
            location: 'Visioconférence (lien envoyé par email)',
            organizer: 'Coordinateur Régional RDRT',
            participants: 8,
            description: 'Zoom RDRT mensuel. Mise à jour des bases de données membres, revue des procédures d\'alerte.',
        },
        {
            id: 'ev-008',
            title: 'Exercice Plan Rouge — Grand Tunis',
            type: 'exercice',
            date: new Date(y, m, 25).toISOString(),
            time: '07h00 – 14h00',
            location: 'Avenue Habib Bourguiba, Tunis',
            organizer: 'Protection Civile + CRT',
            participants: 120,
            description: 'Exercice interagences plan rouge. Coordination PC, CRT, SAMU. Tous les membres NDRT sont mobilisés.',
        },
        {
            id: 'ev-009',
            title: 'Formation NDRT Avancée — Module 3',
            type: 'formation',
            date: new Date(y, m + 1, 3).toISOString(),
            time: '09h00 – 18h00',
            location: 'Centre de Formation CRT, Tunis',
            organizer: 'Formateur IFRC',
            participants: 20,
            description: 'Module 3 de la formation NDRT avancée. Gestion de camp, eau-assainissement-hygiène, coordination logistique.',
        },
        {
            id: 'ev-010',
            title: 'Briefing Équipes — Saison Estivale',
            type: 'reunion',
            date: new Date(y, m + 1, 6).toISOString(),
            time: '10h00 – 12h00',
            location: 'Siège National CRT',
            organizer: 'Direction Nationale',
            participants: 60,
            description: 'Présentation du dispositif balnéaire estival. Attribution des postes de secours. Distribution des tenues d\'été.',
        },
    ];
}

// ──────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ──────────────────────────────────────────────────────────────────────────────
const MOCK_STATS = {
    totalInterventions: 1284,
    activeVolunteers: 5200,
    delegations: 24,
    ndrtMembers: 186,
    rdrtMembers: 42,
    incidentsThisMonth: 7,
};

// ──────────────────────────────────────────────────────────────────────────────
// ALERT COUNTER
// ──────────────────────────────────────────────────────────────────────────────
let alertCounter = 100;

// ──────────────────────────────────────────────────────────────────────────────
// SERVICE EXPORT
// ──────────────────────────────────────────────────────────────────────────────
export const mockDataService = {
    /** Récupère les notifications pour un utilisateur */
    async getNotifications(userId) {
        await delay(300);
        return MOCK_NOTIFICATIONS.map((n) => ({ ...n }));
    },

    /** Récupère les données météo d'une ville */
    async getWeather(city = 'Tunis') {
        await delay(400);
        const data = WEATHER_DATA[city] || WEATHER_DATA['Tunis'];
        return {
            ...data,
            updatedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        };
    },

    /** Prévisions 7 jours pour une ville */
    async getForecast(city = 'Tunis') {
        await delay(300);
        const cityData = WEATHER_DATA[city] || WEATHER_DATA['Tunis'];
        const variation = (cityData.temp - 28);
        return FORECAST_TEMPLATES.map((f) => ({
            ...f,
            max: f.max + variation,
            min: f.min + variation,
        }));
    },

    /** Récupère les événements du calendrier */
    async getCalendarEvents() {
        await delay(350);
        return buildCalendarEvents();
    },

    /** Récupère les statistiques globales */
    async getStats() {
        await delay(200);
        return { ...MOCK_STATS };
    },

    /** Marque une notification comme lue */
    async markNotificationRead(notifId) {
        await delay(200);
        const notif = MOCK_NOTIFICATIONS.find((n) => n.id === notifId);
        if (notif) notif.read = true;
        return { success: true };
    },

    /** Répondre à une notification d'intervention */
    async respondToNotification(notifId, response) {
        await delay(500);
        const notif = MOCK_NOTIFICATIONS.find((n) => n.id === notifId);
        if (notif) {
            notif.status = response; // 'accepted' ou 'declined'
            notif.read = true;
        }
        return { success: true, notifId, response };
    },

    /** Envoyer une alerte au chef d'équipe */
    async sendAlert({ type, priority, subject, message, location, sender }) {
        await delay(800);
        alertCounter++;
        const ref = `CRT${new Date().getFullYear()}${String(alertCounter).padStart(4, '0')}`;
        return {
            ref,
            type,
            priority,
            subject,
            sentAt: new Date().toISOString(),
            status: 'transmitted',
        };
    },

    /** Compte non lus */
    async getUnreadCount(userId) {
        await delay(100);
        return MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
    },
};
