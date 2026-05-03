/**
 * Service de Numéros d'Urgence - Géolocalisation
 * Détecte automatiquement le pays et affiche le numéro d'urgence approprié
 * 
 * Optimisé pour fonctionnement OFFLINE
 * Priorité: Tunisie (Croissant Rouge Tunisien)
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base de données des numéros d'urgence par pays
const EMERGENCY_NUMBERS = {
    // Tunisie (Prioritaire)
    'TN': {
        country: 'تونس - Tunisie',
        countryAr: 'تونس',
        countryFr: 'Tunisie',
        numbers: {
            samu: '190',
            protection_civile: '198',
            police: '197',
            garde_nationale: '193'
        },
        primary: '190',
        primaryName: 'SAMU',
        primaryNameAr: 'الإسعاف'
    },

    // Maghreb
    'DZ': {
        country: 'الجزائر - Algérie',
        primary: '115',
        primaryName: 'Protection Civile',
        numbers: { protection_civile: '115', samu: '14' }
    },
    'MA': {
        country: 'المغرب - Maroc',
        primary: '150',
        primaryName: 'SAMU',
        numbers: { samu: '150', pompiers: '15' }
    },
    'LY': {
        country: 'ليبيا - Libye',
        primary: '193',
        primaryName: 'Urgences',
        numbers: { urgences: '193' }
    },
    'EG': {
        country: 'مصر - Égypte',
        primary: '123',
        primaryName: 'Ambulance',
        numbers: { ambulance: '123' }
    },

    // Moyen-Orient
    'SA': {
        country: 'السعودية - Arabie Saoudite',
        primary: '997',
        primaryName: 'Ambulance',
        numbers: { ambulance: '997', urgences: '911' }
    },
    'AE': {
        country: 'الإمارات - EAU',
        primary: '998',
        primaryName: 'Ambulance',
        numbers: { ambulance: '998' }
    },
    'QA': {
        country: 'قطر - Qatar',
        primary: '999',
        primaryName: 'Urgences',
        numbers: { urgences: '999' }
    },
    'JO': {
        country: 'الأردن - Jordanie',
        primary: '199',
        primaryName: 'Ambulance',
        numbers: { ambulance: '199' }
    },
    'LB': {
        country: 'لبنان - Liban',
        primary: '140',
        primaryName: 'Croix-Rouge',
        numbers: { croix_rouge: '140' }
    },

    // Europe
    'FR': {
        country: 'France',
        primary: '15',
        primaryName: 'SAMU',
        numbers: { samu: '15', pompiers: '18', urgences: '112' }
    },
    'DE': {
        country: 'Allemagne',
        primary: '112',
        primaryName: 'Urgences',
        numbers: { urgences: '112' }
    },
    'IT': {
        country: 'Italie',
        primary: '118',
        primaryName: 'Ambulance',
        numbers: { ambulance: '118', urgences: '112' }
    },
    'ES': {
        country: 'Espagne',
        primary: '112',
        primaryName: 'Urgences',
        numbers: { urgences: '112' }
    },
    'GB': {
        country: 'Royaume-Uni',
        primary: '999',
        primaryName: 'Urgences',
        numbers: { urgences: '999' }
    },

    // Amérique
    'US': {
        country: 'États-Unis',
        primary: '911',
        primaryName: 'Emergency',
        numbers: { emergency: '911' }
    },
    'CA': {
        country: 'Canada',
        primary: '911',
        primaryName: 'Emergency',
        numbers: { emergency: '911' }
    },

    // Afrique
    'SN': {
        country: 'Sénégal',
        primary: '1515',
        primaryName: 'SAMU',
        numbers: { samu: '1515' }
    },
    'CI': {
        country: "Côte d'Ivoire",
        primary: '185',
        primaryName: 'SAMU',
        numbers: { samu: '185' }
    },

    // Par défaut (International)
    'DEFAULT': {
        country: 'International',
        primary: '112',
        primaryName: 'Urgences',
        numbers: { urgences: '112' }
    }
};

// Limites géographiques pour reverse geocoding offline
const COUNTRY_BOUNDS = {
    'TN': { minLat: 30.2, maxLat: 37.5, minLon: 7.5, maxLon: 11.6 },
    'DZ': { minLat: 19.0, maxLat: 37.1, minLon: -9.0, maxLon: 12.0 },
    'MA': { minLat: 27.7, maxLat: 35.9, minLon: -13.2, maxLon: -1.0 },
    'LY': { minLat: 19.5, maxLat: 33.2, minLon: 9.4, maxLon: 25.2 },
    'FR': { minLat: 41.3, maxLat: 51.1, minLon: -5.1, maxLon: 9.6 }
};

class EmergencyNumberService {
    constructor() {
        this.cachedCountry = null;
        this.CACHE_KEY = 'emergency_country_cache';
        this.CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 heures
    }

    /**
     * Détecte le pays de l'utilisateur
     * Priorité: Cache → GPS → IP → Défaut (Tunisie)
     */
    async detectCountry() {
        // 1. Vérifier le cache
        const cached = await this.getFromCache();
        if (cached) {
            console.log('📍 Pays depuis cache:', cached);
            return cached;
        }

        // 2. Essayer GPS (fonctionne offline si activé)
        try {
            const gpsCountry = await this.detectByGPS();
            if (gpsCountry) {
                await this.saveToCache(gpsCountry);
                console.log('📍 Pays par GPS:', gpsCountry);
                return gpsCountry;
            }
        } catch (e) {
            console.warn('GPS non disponible');
        }

        // 3. Essayer IP (nécessite connexion)
        try {
            const ipCountry = await this.detectByIP();
            if (ipCountry) {
                await this.saveToCache(ipCountry);
                console.log('📍 Pays par IP:', ipCountry);
                return ipCountry;
            }
        } catch (e) {
            console.warn('IP géolocation non disponible');
        }

        // 4. Défaut: Tunisie (application Croissant Rouge Tunisien)
        console.log('📍 Pays par défaut: Tunisie');
        return 'TN';
    }

    /**
     * Détection par GPS avec reverse geocoding simplifié (offline)
     */
    async detectByGPS() {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 5000
        });

        const { latitude, longitude } = location.coords;

        // Reverse geocoding offline simplifié
        return this.reverseGeocodeOffline(latitude, longitude);
    }

    /**
     * Reverse geocoding offline basé sur les limites géographiques
     */
    reverseGeocodeOffline(lat, lon) {
        for (const [code, bounds] of Object.entries(COUNTRY_BOUNDS)) {
            if (lat >= bounds.minLat && lat <= bounds.maxLat &&
                lon >= bounds.minLon && lon <= bounds.maxLon) {
                return code;
            }
        }
        return null;
    }

    /**
     * Détection par IP (online uniquement)
     */
    async detectByIP() {
        const services = [
            'https://ipapi.co/json/',
            'https://ip-api.com/json/'
        ];

        for (const url of services) {
            try {
                const response = await fetch(url, { timeout: 3000 });
                const data = await response.json();
                return data.country_code || data.countryCode;
            } catch {
                continue;
            }
        }
        return null;
    }

    /**
     * Obtient les informations d'urgence pour le pays détecté
     */
    async getEmergencyInfo() {
        const countryCode = await this.detectCountry();
        const info = EMERGENCY_NUMBERS[countryCode] || EMERGENCY_NUMBERS['DEFAULT'];

        return {
            countryCode,
            ...info,
            displayText: `📞 ${info.primary}`,
            displayFull: `${info.primaryName}: ${info.primary}`
        };
    }

    /**
     * Obtient le numéro d'urgence principal
     */
    async getPrimaryNumber() {
        const info = await this.getEmergencyInfo();
        return info.primary;
    }

    /**
     * Sauvegarde dans le cache
     */
    async saveToCache(countryCode) {
        try {
            await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify({
                code: countryCode,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Erreur sauvegarde cache:', e);
        }
    }

    /**
     * Récupère depuis le cache
     */
    async getFromCache() {
        try {
            const cached = await AsyncStorage.getItem(this.CACHE_KEY);
            if (cached) {
                const { code, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < this.CACHE_DURATION_MS) {
                    return code;
                }
            }
        } catch { }
        return null;
    }

    /**
     * Force la mise à jour du cache
     */
    async refreshCache() {
        await AsyncStorage.removeItem(this.CACHE_KEY);
        return await this.detectCountry();
    }
}

// Singleton
export const emergencyService = new EmergencyNumberService();
export { EMERGENCY_NUMBERS };
export default EmergencyNumberService;
