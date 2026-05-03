/**
 * ML Kit Pose Detection Service
 * ==============================
 * Service de détection de pose utilisant Google ML Kit
 * Fonctionne 100% OFFLINE sur le téléphone
 * 
 * Keypoints détectés (33 points):
 * - Épaules, coudes, poignets (pour CPR)
 * - Hanches (pour position du corps)
 * - Visage (pour attention)
 */

// Configuration par défaut
const ML_KIT_CONFIG = {
    // Mode de détection
    detectorMode: 'stream', // 'stream' pour temps réel, 'single' pour photo

    // Paramètres de performance
    performanceMode: 'fast', // 'fast' ou 'accurate'

    // Keypoints importants pour CPR (indices ML Kit)
    CPR_KEYPOINTS: {
        LEFT_WRIST: 15,
        RIGHT_WRIST: 16,
        LEFT_ELBOW: 13,
        RIGHT_ELBOW: 14,
        LEFT_SHOULDER: 11,
        RIGHT_SHOULDER: 12,
        LEFT_HIP: 23,
        RIGHT_HIP: 24,
        NOSE: 0
    },

    // Seuils de détection
    MIN_CONFIDENCE: 0.5,
    HAND_PROXIMITY_THRESHOLD: 50, // pixels
};

/**
 * Classe principale pour la détection de pose ML Kit
 */
class MLKitPoseService {
    constructor() {
        this.isInitialized = false;
        this.lastPose = null;
        this.frameCount = 0;

        // État des mains
        this.handsPosition = null;
        this.handsTogether = false;

        // Historique pour lissage
        this.positionHistory = [];
        this.maxHistoryLength = 5;
    }

    /**
     * Initialise le service ML Kit
     */
    async initialize() {
        try {
            // Note: En production, importer le module ML Kit natif
            // import PoseDetection from '@react-native-ml-kit/pose-detection';
            // await PoseDetection.initialize();

            this.isInitialized = true;
            console.log('MLKitPoseService initialized');
            return { success: true };
        } catch (error) {
            console.error('ML Kit initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Traite les landmarks de pose depuis ML Kit
     * @param {Array} landmarks - Tableau de 33 keypoints ML Kit
     * @returns {Object} Données de pose analysées
     */
    processPoseLandmarks(landmarks) {
        if (!landmarks || landmarks.length < 17) {
            return this._getEmptyResult();
        }

        this.frameCount++;

        // Extraire les keypoints importants
        const leftWrist = this._getKeypoint(landmarks, ML_KIT_CONFIG.CPR_KEYPOINTS.LEFT_WRIST);
        const rightWrist = this._getKeypoint(landmarks, ML_KIT_CONFIG.CPR_KEYPOINTS.RIGHT_WRIST);
        const leftShoulder = this._getKeypoint(landmarks, ML_KIT_CONFIG.CPR_KEYPOINTS.LEFT_SHOULDER);
        const rightShoulder = this._getKeypoint(landmarks, ML_KIT_CONFIG.CPR_KEYPOINTS.RIGHT_SHOULDER);

        // Vérifier la visibilité des mains
        if (!this._isVisible(leftWrist) || !this._isVisible(rightWrist)) {
            return this._getEmptyResult();
        }

        // Calculer la position centrale des mains
        const handsCenter = {
            x: (leftWrist.x + rightWrist.x) / 2,
            y: (leftWrist.y + rightWrist.y) / 2
        };

        // Vérifier si les mains sont ensemble (position CPR)
        const handDistance = this._calculateDistance(leftWrist, rightWrist);
        const handsTogether = handDistance < ML_KIT_CONFIG.HAND_PROXIMITY_THRESHOLD;

        // Lisser la position
        this._addToHistory(handsCenter);
        const smoothedPosition = this._getSmoothPosition();

        // Calculer la largeur des épaules pour référence
        const shoulderWidth = leftShoulder && rightShoulder
            ? this._calculateDistance(leftShoulder, rightShoulder)
            : 200;

        this.handsPosition = smoothedPosition;
        this.handsTogether = handsTogether;
        this.lastPose = landmarks;

        return {
            detected: true,
            handsTogether: handsTogether,
            handsPosition: smoothedPosition,
            handsRaw: handsCenter,
            handDistance: handDistance,
            shoulderWidth: shoulderWidth,
            confidence: this._averageConfidence(landmarks),
            frameCount: this.frameCount
        };
    }

    /**
     * Convertit les données de frame VisionCamera/Expo en landmarks
     * @param {Object} frameData - Données de la frame
     * @returns {Object} Résultat de pose
     */
    processFrame(frameData) {
        // Cette méthode sera appelée par le frame processor
        // En production avec VisionCamera:
        // const result = runOnJS(detectPose)(frameData);

        if (frameData && frameData.landmarks) {
            return this.processPoseLandmarks(frameData.landmarks);
        }

        return this._getEmptyResult();
    }

    /**
     * Obtenir un keypoint par index
     */
    _getKeypoint(landmarks, index) {
        if (index >= 0 && index < landmarks.length) {
            return landmarks[index];
        }
        return null;
    }

    /**
     * Vérifier si un keypoint est visible
     */
    _isVisible(keypoint) {
        return keypoint &&
            keypoint.confidence >= ML_KIT_CONFIG.MIN_CONFIDENCE;
    }

    /**
     * Calculer la distance entre deux points
     */
    _calculateDistance(p1, p2) {
        if (!p1 || !p2) return Infinity;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Ajouter à l'historique pour lissage
     */
    _addToHistory(position) {
        this.positionHistory.push({ ...position, timestamp: Date.now() });
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }
    }

    /**
     * Obtenir la position lissée (moyenne mobile)
     */
    _getSmoothPosition() {
        if (this.positionHistory.length === 0) {
            return { x: 0, y: 0 };
        }

        const sum = this.positionHistory.reduce(
            (acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }),
            { x: 0, y: 0 }
        );

        return {
            x: sum.x / this.positionHistory.length,
            y: sum.y / this.positionHistory.length
        };
    }

    /**
     * Calculer la confiance moyenne
     */
    _averageConfidence(landmarks) {
        if (!landmarks || landmarks.length === 0) return 0;
        const sum = landmarks.reduce((acc, lm) => acc + (lm.confidence || 0), 0);
        return sum / landmarks.length;
    }

    /**
     * Résultat vide quand pas de détection
     */
    _getEmptyResult() {
        return {
            detected: false,
            handsTogether: false,
            handsPosition: null,
            handDistance: 0,
            confidence: 0,
            frameCount: this.frameCount
        };
    }

    /**
     * Obtenir la dernière position des mains (pour CPRAnalysisService)
     */
    getHandsPosition() {
        return this.handsPosition;
    }

    /**
     * Vérifier si les mains sont en position CPR
     */
    areHandsInCPRPosition() {
        return this.handsTogether;
    }

    /**
     * Réinitialiser le service
     */
    reset() {
        this.lastPose = null;
        this.handsPosition = null;
        this.handsTogether = false;
        this.positionHistory = [];
        this.frameCount = 0;
    }

    /**
     * Libérer les ressources
     */
    release() {
        this.reset();
        this.isInitialized = false;
    }
}

// Export singleton
export const mlKitPoseService = new MLKitPoseService();
export { ML_KIT_CONFIG };
export default mlKitPoseService;
