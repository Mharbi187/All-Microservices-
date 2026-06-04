/**
 * CPR Analysis Router (Facade Pattern)
 * ===================================================
 * Dynamically routes camera frames to either the Online Python Backend
 * or the Offline TFLite Edge Models based on the user's connection status.
 */

import { poseFrameProcessor as onlineProcessor } from './PoseFrameProcessor';
import { offlineFrameProcessor } from './offline/OfflineFrameProcessor';
import AsyncStorage from '@react-native-async-storage/async-storage';

class CPRAnalysisRouter {
    constructor() {
        this.activeProcessor = onlineProcessor; // Default to online
        this.isOfflineMode = false;
    }

    /**
     * Automatically checks AsyncStorage for Core-Service Authentication.
     * If a JWT/Auth token exists, it routes to Online Mode.
     * If no token exists (Guest), it routes to Offline Edge AI Models.
     */
    async initializeRouting() {
        try {
            const userToken = await AsyncStorage.getItem('auth_user');
            // Or 'jwt_token' depending on how AuthService saves the core-service token

            if (!userToken) {
                console.log('[Router] Guest detected. Connecting to Edge AI Models (Offline Mode) -> TFLite');
                this.activeProcessor = offlineFrameProcessor;
                this.isOfflineMode = true;
            } else {
                console.log('[Router] Core-Service Authenticated User detected. Connecting to Cloud Python Backend (Online Mode)');
                this.activeProcessor = onlineProcessor;
                this.isOfflineMode = false;
            }
        } catch (error) {
            console.error('[Router] Auth check failed, defaulting to Offline Mode for safety', error);
            this.activeProcessor = offlineFrameProcessor;
            this.isOfflineMode = true;
        }
    }

    // Proxy methods to strictly use the active processor

    setCallbacks(callbacks) {
        if (this.isOfflineMode) {
            offlineFrameProcessor.setCallbacks(callbacks);
        } else {
            onlineProcessor.setCallbacks(callbacks);
        }
    }

    setCameraRef(ref) {
        this.activeProcessor.setCameraRef(ref);
    }

    start() {
        this.activeProcessor.start();
    }

    stop() {
        // Always stop both to prevent memory leaks
        onlineProcessor.stop();
        offlineFrameProcessor.stop();
    }

    getStats() {
        return this.activeProcessor.getStats();
    }

    reset() {
        onlineProcessor.reset();
        offlineFrameProcessor.reset();
    }
}

export const cprRouter = new CPRAnalysisRouter();
export default cprRouter;
