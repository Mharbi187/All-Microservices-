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
    FRAME_TIMEOUT_MS: 6000
};

class BackendAPIService {
    constructor() {
        this.sessionId = null;
        this.isConnected = false;
        this.serverUrl = API_CONFIG.BASE_URL;
        this.ws = null;
    }

    async setServerUrl(url) {
        this.serverUrl = url;
        await AsyncStorage.setItem('cpr_server_url', url);
    }

    async loadServerUrl() {
        const savedUrl = await AsyncStorage.getItem('cpr_server_url');
        if (savedUrl) this.serverUrl = savedUrl;
        return this.serverUrl;
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.serverUrl}/health`);
            const data = await response.json();
            this.isConnected = data.status === 'ok';
            return { connected: this.isConnected, version: data.version };
        } catch (error) {
            this.isConnected = false;
            return { connected: false, error: error.message };
        }
    }

    /**
     * Set up the WebSocket session
     */
    async createSession(victimType = 'ADULT', rescuerCount = 1) {
        // Our new backend automatically creates the pipeline when WS connects!
        // So we just generate a session ID and connect the WS.
        this.sessionId = `session_${Date.now()}`;

        return new Promise((resolve, reject) => {
            const wsUrl = this.serverUrl.replace('http://', 'ws://').replace('https://', 'wss://')
                + `/ws/session/${this.sessionId}`;

            console.log("Connecting WebSocket to", wsUrl);
            this.ws = new WebSocket(wsUrl);
            this.ws.binaryType = 'blob'; // Prepare to send/receive binary

            this.ws.onopen = () => {
                console.log("WebSocket connected!");
                this.isConnected = true;
                resolve({ success: true, sessionId: this.sessionId });
            };

            this.ws.onerror = (e) => {
                console.log("WebSocket error on setup", e.message);
                reject({ success: false, error: e.message });
            };

            this.ws.onclose = () => {
                this.isConnected = false;
            };
        });
    }

    /**
     * Send a frame to the backend via WebSocket using Option A protocol:
     * 1. Send JSON metadata frame
     * 2. Send Binary JPEG frame
     */
    async processFrame(photoUri, base64Frame) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return { success: false, error: 'WebSocket not connected' };
        }

        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Backend timeout')), API_CONFIG.FRAME_TIMEOUT_MS);

            // Wait for response text frame
            this.ws.onmessage = (e) => {
                clearTimeout(timeout);
                try {
                    const data = JSON.parse(e.data);
                    // Standardize status format to what mobile expects (success = true if active)
                    const success = data.status !== "ERROR";
                    resolve({ success, ...data });
                } catch (err) {
                    resolve({ success: false, error: 'Malformed JSON from server' });
                }
            };

            this.ws.onerror = (e) => {
                clearTimeout(timeout);
                resolve({ success: false, error: 'WebSocket transport error' });
            };

            try {
                // Option A: Message 1 (JSON Metadata)
                this.ws.send(JSON.stringify({ ts: Date.now() }));

                // Option A: Message 2 (Base64 JPEG Text Frame)
                // Sending direct Base64 string to avoid React Native Blob WebSocket bugs
                this.ws.send(base64Frame);
            } catch (err) {
                clearTimeout(timeout);
                resolve({ success: false, error: err.message });
            }
        });
    }

    async endSession() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.sessionId = null;
        this.isConnected = false;
        return { success: true };
    }

    hasActiveSession() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export singleton
export const backendAPI = new BackendAPIService();
export default backendAPI;
