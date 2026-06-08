/**
 * Backend API Service
 * ===================
 * Service pour communiquer avec le serveur Python de détection CPR.
 * Envoie les frames de la caméra et reçoit les métriques en temps réel.
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const MODEL_VERSION = '1.0.0';

const debuggerHost = Constants.expoConfig?.hostUri;
const hostIp = debuggerHost ? debuggerHost.split(':')[0] : '10.0.2.2';

// Configuration API
const API_CONFIG = {
    // CPR server always runs on Oracle VM (proxied via Caddy over HTTPS)
    // Change to `http://${hostIp}:8000` only if running the uvicorn server locally on your PC
    BASE_URL: `https://nexus-aid.me`,

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
        this.resolversQueue = [];
    }

    async setServerUrl(url) {
        this.serverUrl = API_CONFIG.BASE_URL;
    }

    async loadServerUrl() {
        this.serverUrl = API_CONFIG.BASE_URL;
        return this.serverUrl;
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.serverUrl}${API_CONFIG.ENDPOINTS.HEALTH}`);
            const data = await response.json();
            this.isConnected = data.status === 'ok';
            return { connected: this.isConnected, version: data.version };
        } catch (error) {
            this.isConnected = false;
            return { connected: false, error: error.message };
        }
    }

    /**
     * Set up the WebSocket session and pass along context from the UI.
     */
    async createSession(victimType = 'ADULT', rescuerCount = 1) {
        this.sessionId = `session_${Date.now()}`;
        this.victimType = victimType;
        this.rescuerCount = rescuerCount;
        // SecureStore for keychain-level JWT protection
        try {
            this.token = await SecureStore.getItemAsync('jwt_token');
        } catch {
            this.token = null;
        }

        return this._connect();
    }

    async _connect() {
        return new Promise((resolve, reject) => {
            const wsUrl = this.serverUrl.replace('http://', 'ws://').replace('https://', 'wss://')
                + `/ws/session/${this.sessionId}`;

            console.log("Connecting WebSocket to", wsUrl);
            this.ws = new WebSocket(wsUrl);
            this.ws.binaryType = 'blob';

            this.ws.onopen = () => {
                console.log("WebSocket connected!");
                this.isConnected = true;
                this.resolversQueue = [];
                resolve({ success: true, sessionId: this.sessionId });
            };

            this.ws.onmessage = (e) => {
                if (this.resolversQueue.length > 0) {
                    const reqResolve = this.resolversQueue.shift();
                    try {
                        const data = JSON.parse(e.data);
                        const success = data.status !== "ERROR";
                        reqResolve({ success, ...data });
                    } catch (err) {
                        reqResolve({ success: false, error: 'Malformed JSON from server' });
                    }
                }
            };

            this.ws.onerror = (e) => {
                console.log("WebSocket error on setup", e.message);
                this.isConnected = false;
                reject({ success: false, error: e.message });
            };

            this.ws.onclose = () => {
                console.log("WebSocket closed — will reconnect on next frame.");
                this.isConnected = false;
                this.ws = null;
            };
        });
    }

    /**
     * Send a frame to the backend via WebSocket using Option A protocol:
     * 1. Send JSON metadata frame
     * 2. Send Binary JPEG frame
     */
    async processFrame(photoUri, base64Frame) {
        // Guard: ensure we have actual data to send
        if (!base64Frame || typeof base64Frame !== 'string') {
            return { success: false, error: 'Invalid frame data' };
        }

        // Auto-reconnect if WebSocket dropped
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (this.sessionId) {
                try {
                    console.log("[BackendAPI] WebSocket lost — reconnecting...");
                    await this._connect();
                } catch {
                    return { success: false, error: 'WebSocket reconnection failed' };
                }
            } else {
                return { success: false, error: 'WebSocket not connected' };
            }
        }

        return new Promise(async (resolve, reject) => {
            const resWrapper = (data) => {
                clearTimeout(timeout);
                resolve(data);
            };

            const timeout = setTimeout(() => {
                const idx = this.resolversQueue.indexOf(resWrapper);
                if (idx !== -1) {
                    this.resolversQueue.splice(idx, 1);
                }
                reject(new Error('Backend timeout'));
            }, API_CONFIG.FRAME_TIMEOUT_MS);

            this.resolversQueue.push(resWrapper);

            try {
                // Option A: Message 1 (JSON Metadata) — includes JWT + session context
                const meta = {
                    ts: Date.now(),
                    victim_type: this.victimType || 'ADULT',
                    rescuer_count: this.rescuerCount || 1,
                    mode: 'online',
                    app_version: APP_VERSION,
                    model_version: MODEL_VERSION,
                };
                // Attach JWT token for server-side authentication on every frame
                if (this.token) {
                    meta.token = this.token;
                }
                this.ws.send(JSON.stringify(meta));

                // Option A: Message 2 (Base64 JPEG Text Frame)
                this.ws.send(base64Frame);
            } catch (err) {
                const idx = this.resolversQueue.indexOf(resWrapper);
                if (idx !== -1) {
                    this.resolversQueue.splice(idx, 1);
                }
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
