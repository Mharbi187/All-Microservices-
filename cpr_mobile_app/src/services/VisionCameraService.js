/**
 * VisionCamera Service
 * =====================
 * Service de caméra haute performance pour la détection de pose
 * Utilise react-native-vision-camera avec frame processors
 * 
 * Note: Requiert un development build (pas Expo Go)
 */

import { useCallback, useRef, useState } from 'react';

// Configuration VisionCamera
export const VISION_CONFIG = {
    // Qualité de capture
    PHOTO_QUALITY: 0.5,
    VIDEO_STABILIZATION: true,

    // Frame processing
    FPS: 10, // Frames par seconde à traiter
    PROCESS_INTERVAL_MS: 100,

    // Résolution
    RESOLUTION: {
        width: 640,
        height: 480
    }
};

/**
 * Hook personnalisé pour gérer VisionCamera
 */
export function useVisionCamera() {
    const cameraRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const lastProcessTime = useRef(0);

    /**
     * Demander les permissions caméra
     */
    const requestPermissions = useCallback(async () => {
        try {
            // En production avec VisionCamera natif:
            // const cameraPermission = await Camera.requestCameraPermission();
            // setHasPermission(cameraPermission === 'granted');

            // Pour l'instant, on simule
            setHasPermission(true);
            return true;
        } catch (error) {
            console.error('Permission error:', error);
            return false;
        }
    }, []);

    /**
     * Callback quand la caméra est prête
     */
    const onCameraReady = useCallback(() => {
        setIsReady(true);
        console.log('VisionCamera ready');
    }, []);

    /**
     * Frame processor callback
     * Appelé pour chaque frame de la caméra
     */
    const onFrame = useCallback((frame) => {
        'worklet';

        const now = Date.now();

        // Limiter le taux de traitement
        if (now - lastProcessTime.current < VISION_CONFIG.PROCESS_INTERVAL_MS) {
            return null;
        }

        lastProcessTime.current = now;

        // En production, traiter la frame ici
        // Pour ML Kit natif ou autre détection de pose

        return {
            timestamp: now,
            width: frame?.width || 0,
            height: frame?.height || 0
        };
    }, []);

    /**
     * Capturer une photo pour analyse
     */
    const capturePhoto = useCallback(async () => {
        if (!cameraRef.current || !isReady) {
            return null;
        }

        try {
            // En production avec VisionCamera natif:
            // const photo = await cameraRef.current.takePhoto({
            //     qualityPrioritization: 'speed',
            //     enableShutterSound: false
            // });
            // return photo;

            return null;
        } catch (error) {
            console.error('Capture error:', error);
            return null;
        }
    }, [isReady]);

    return {
        cameraRef,
        isReady,
        hasPermission,
        requestPermissions,
        onCameraReady,
        onFrame,
        capturePhoto
    };
}

/**
 * Configuration du device caméra
 */
export function getCameraDevice(devices, position = 'back') {
    if (!devices || devices.length === 0) {
        return null;
    }

    // Préférer la caméra arrière pour CPR
    const preferredDevice = devices.find(d => d.position === position);

    if (preferredDevice) {
        return preferredDevice;
    }

    // Fallback sur la première caméra disponible
    return devices[0];
}

/**
 * Vérifie si VisionCamera est disponible
 * (false en Expo Go, true en development build)
 */
export function isVisionCameraAvailable() {
    try {
        // Essayer d'importer VisionCamera
        // En Expo Go, cela échouera
        require('react-native-vision-camera');
        return true;
    } catch {
        return false;
    }
}

export default {
    VISION_CONFIG,
    useVisionCamera,
    getCameraDevice,
    isVisionCameraAvailable
};
