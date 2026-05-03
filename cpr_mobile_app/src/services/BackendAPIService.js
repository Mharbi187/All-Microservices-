/**
 * Backend API Service
 * ===================
 * Service pour communiquer avec le serveur Python de détection CPR.
 * Envoie les frames de la caméra et reçoit les métriques en temps réel.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration API
const API_CONFIG = {
    // URL du serveur backend (à modifier selon l'environnement)
    // Pour le développement local: http://192.168.x.x:5000
    // Remplacez par l'IP de votre ordinateur
    BASE_URL: 'http://192.168.0.134:5000',

    // Endpoints
    ENDPOINTS: {
        HEALTH: '/api/health',
        CREATE_SESSION: '/api/session/create',
        PROCESS_FRAME: '/api/session/{session_id}/process',
        GET_STATUS: '/api/session/{session_id}/status',
        RESET_SESSION: '/api/session/{session_id}/reset',
        END_SESSION: '/api/session/{session_id}/end',
        GET_PROTOCOLS: '/api/protocols'
    },

    // Timeouts
    TIMEOUT_MS: 5000,
    FRAME_TIMEOUT_MS: 2000
};

class BackendAPIService {
    constructor() {
        this.sessionId = null;
        this.isConnected = false;
        this.serverUrl = API_CONFIG.BASE_URL;
    }

    /**
     * Configure l'URL du serveur backend
     * @param {string} url - URL complète du serveur (ex: http://192.168.1.10:5000)
     */
    async setServerUrl(url) {
        this.serverUrl = url;
        await AsyncStorage.setItem('cpr_server_url', url);
    }

    /**
     * Charge l'URL du serveur depuis le stockage
     */
    async loadServerUrl() {
        const savedUrl = await AsyncStorage.getItem('cpr_server_url');
        if (savedUrl) {
            this.serverUrl = savedUrl;
        }
        return this.serverUrl;
    }

    /**
     * Vérifie la connexion au serveur
     * @returns {Promise<{connected: boolean, version: string}>}
     */
    async checkHealth() {
        try {
            const response = await this._fetch(
                API_CONFIG.ENDPOINTS.HEALTH,
                { method: 'GET' },
                API_CONFIG.TIMEOUT_MS
            );

            this.isConnected = response.status === 'healthy';
            return {
                connected: this.isConnected,
                version: response.version,
                mediapipeAvailable: response.mediapipe_available
            };
        } catch (error) {
            this.isConnected = false;
            return { connected: false, error: error.message };
        }
    }

    /**
     * Crée une nouvelle session CPR
     * @param {string} victimType - Type de victime (ADULT, CHILD, INFANT)
     * @param {number} rescuerCount - Nombre de secouristes (1 ou 2)
     * @returns {Promise<{success: boolean, sessionId: string}>}
     */
    async createSession(victimType = 'ADULT', rescuerCount = 1) {
        try {
            const response = await this._fetch(
                API_CONFIG.ENDPOINTS.CREATE_SESSION,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        victim_type: victimType,
                        rescuer_count: rescuerCount
                    })
                }
            );

            if (response.success) {
                this.sessionId = response.session_id;
                await AsyncStorage.setItem('cpr_session_id', this.sessionId);
            }

            return response;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Envoie une frame pour analyse
     * @param {string} base64Frame - Image en base64 (JPEG)
     * @returns {Promise<{success: boolean, metrics: Object, guidance: Object}>}
     */
    async processFrame(base64Frame) {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const endpoint = API_CONFIG.ENDPOINTS.PROCESS_FRAME
                .replace('{session_id}', this.sessionId);

            const response = await this._fetch(
                endpoint,
                {
                    method: 'POST',
                    body: JSON.stringify({ frame: base64Frame })
                },
                API_CONFIG.FRAME_TIMEOUT_MS
            );

            return response;
        } catch (error) {
            // En cas d'erreur de connexion, ne pas bloquer l'app
            console.warn('Frame processing error:', error.message);
            return {
                success: false,
                error: error.message,
                offline: true
            };
        }
    }

    /**
     * Récupère le statut actuel de la session
     * @returns {Promise<Object>}
     */
    async getSessionStatus() {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const endpoint = API_CONFIG.ENDPOINTS.GET_STATUS
                .replace('{session_id}', this.sessionId);

            return await this._fetch(endpoint, { method: 'GET' });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Réinitialise les compteurs de la session
     * @returns {Promise<Object>}
     */
    async resetSession() {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const endpoint = API_CONFIG.ENDPOINTS.RESET_SESSION
                .replace('{session_id}', this.sessionId);

            return await this._fetch(endpoint, { method: 'POST' });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Termine la session CPR
     * @returns {Promise<{success: boolean, summary: Object}>}
     */
    async endSession() {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const endpoint = API_CONFIG.ENDPOINTS.END_SESSION
                .replace('{session_id}', this.sessionId);

            const response = await this._fetch(endpoint, { method: 'POST' });

            if (response.success) {
                this.sessionId = null;
                await AsyncStorage.removeItem('cpr_session_id');
            }

            return response;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Récupère les protocoles disponibles
     * @returns {Promise<{protocols: Array}>}
     */
    async getProtocols() {
        try {
            return await this._fetch(
                API_CONFIG.ENDPOINTS.GET_PROTOCOLS,
                { method: 'GET' }
            );
        } catch (error) {
            // Retourner les protocoles par défaut en mode offline
            return {
                protocols: [
                    { id: 'ADULT', name: 'Adulte', bpm_range: [100, 120] },
                    { id: 'CHILD', name: 'Enfant', bpm_range: [100, 120] },
                    { id: 'INFANT', name: 'Nourrisson', bpm_range: [100, 120] }
                ]
            };
        }
    }

    /**
     * Méthode fetch interne avec gestion des erreurs
     */
    async _fetch(endpoint, options = {}, timeout = API_CONFIG.TIMEOUT_MS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const url = `${this.serverUrl}${endpoint}`;

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * Vérifie si une session est active
     */
    hasActiveSession() {
        return this.sessionId !== null;
    }

    /**
     * Récupère l'ID de session actuel
     */
    getSessionId() {
        return this.sessionId;
    }
}

// Export singleton
export const backendAPI = new BackendAPIService();
export default backendAPI;
