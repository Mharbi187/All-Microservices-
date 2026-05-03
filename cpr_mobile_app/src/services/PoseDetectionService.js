/**
 * Service de Détection de Pose - CPR Vision
 * Utilise TensorFlow.js avec MoveNet pour détection multi-personnes
 * 
 * @description Détecte jusqu'à 6 personnes simultanément pour supporter
 * les scénarios 1 ou 2 secouristes
 */

import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

// Configuration du détecteur
const DETECTOR_CONFIG = {
    modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
    enableSmoothing: true,
    minPoseScore: 0.25,
    multiPoseMaxDimension: 512,
    enableTracking: true,
    trackerType: poseDetection.TrackerType.BoundingBox
};

// Points clés pour la détection CPR
const KEYPOINTS = {
    LEFT_WRIST: 9,
    RIGHT_WRIST: 10,
    LEFT_SHOULDER: 5,
    RIGHT_SHOULDER: 6,
    LEFT_HIP: 11,
    RIGHT_HIP: 12,
    NOSE: 0
};

// Seuils de détection
const THRESHOLDS = {
    HAND_SUPERPOSITION_PX: 60,      // Distance max pour mains superposées
    MIN_COMPRESSION_DEPTH_PX: 25,   // Mouvement min pour compression
    MAX_COMPRESSION_DEPTH_PX: 120,  // Mouvement max réaliste
    MIN_VISIBILITY_SCORE: 0.5       // Score min de visibilité
};

class PoseDetectionService {
    constructor() {
        this.detector = null;
        this.isInitialized = false;
        this.lastPoses = [];
        this.frameCount = 0;
    }

    /**
     * Initialise le modèle TensorFlow et le détecteur de pose
     */
    async initialize() {
        try {
            // Initialiser TensorFlow.js
            await tf.ready();
            console.log('✅ TensorFlow.js prêt');

            // Créer le détecteur MoveNet MultiPose
            this.detector = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                DETECTOR_CONFIG
            );

            this.isInitialized = true;
            console.log('✅ Détecteur de pose initialisé');
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            return false;
        }
    }

    /**
     * Détecte les poses dans une frame vidéo
     * @param {ImageData|HTMLVideoElement} input - Source vidéo
     * @returns {Promise<Object>} Résultats de détection
     */
    async detectPoses(input) {
        if (!this.isInitialized || !this.detector) {
            return { poses: [], rescuers: [] };
        }

        try {
            this.frameCount++;

            // Détecter toutes les poses (jusqu'à 6 personnes)
            const poses = await this.detector.estimatePoses(input, {
                maxPoses: 6,
                flipHorizontal: false
            });

            this.lastPoses = poses;

            // Analyser pour identifier les secouristes
            const analysis = this.analyzeCPRPositions(poses);

            return {
                poses,
                rescuers: analysis.rescuers,
                victim: analysis.victim,
                isValidCPR: analysis.isValidCPR,
                frameCount: this.frameCount
            };
        } catch (error) {
            console.warn('Erreur détection:', error);
            return { poses: [], rescuers: [] };
        }
    }

    /**
     * Analyse les poses pour identifier les secouristes effectuant la RCP
     * @param {Array} poses - Poses détectées
     * @returns {Object} Analyse des positions CPR
     */
    analyzeCPRPositions(poses) {
        const rescuers = [];
        let victim = null;

        for (const pose of poses) {
            if (pose.score < THRESHOLDS.MIN_VISIBILITY_SCORE) continue;

            const keypoints = this.extractKeypoints(pose);

            // Vérifier si cette personne fait des compressions
            if (this.isPerformingCompressions(keypoints)) {
                rescuers.push({
                    pose,
                    keypoints,
                    role: 'COMPRESSOR',
                    handsPosition: keypoints.handsCenter,
                    isValid: true
                });
            }
            // Vérifier si c'est le ventilateur (position tête)
            else if (this.isNearVictimHead(keypoints, rescuers)) {
                rescuers.push({
                    pose,
                    keypoints,
                    role: 'VENTILATOR',
                    isValid: true
                });
            }
        }

        return {
            rescuers,
            victim,
            isValidCPR: rescuers.some(r => r.role === 'COMPRESSOR'),
            rescuerCount: rescuers.length
        };
    }

    /**
     * Extrait les keypoints importants d'une pose
     */
    extractKeypoints(pose) {
        const kp = pose.keypoints;

        const leftWrist = kp[KEYPOINTS.LEFT_WRIST];
        const rightWrist = kp[KEYPOINTS.RIGHT_WRIST];

        // Calculer le centre des mains
        const handsCenter = {
            x: (leftWrist.x + rightWrist.x) / 2,
            y: (leftWrist.y + rightWrist.y) / 2
        };

        return {
            leftWrist,
            rightWrist,
            leftShoulder: kp[KEYPOINTS.LEFT_SHOULDER],
            rightShoulder: kp[KEYPOINTS.RIGHT_SHOULDER],
            leftHip: kp[KEYPOINTS.LEFT_HIP],
            rightHip: kp[KEYPOINTS.RIGHT_HIP],
            nose: kp[KEYPOINTS.NOSE],
            handsCenter,
            handsDistance: this.calculateDistance(leftWrist, rightWrist)
        };
    }

    /**
     * Vérifie si les mains sont superposées (position CPR correcte)
     */
    isPerformingCompressions(keypoints) {
        // Mains doivent être superposées
        if (keypoints.handsDistance > THRESHOLDS.HAND_SUPERPOSITION_PX) {
            return false;
        }

        // Mains doivent être plus basses que les épaules
        const shoulderY = (keypoints.leftShoulder.y + keypoints.rightShoulder.y) / 2;
        if (keypoints.handsCenter.y < shoulderY) {
            return false;
        }

        // Visibilité suffisante des mains
        if (keypoints.leftWrist.score < 0.4 || keypoints.rightWrist.score < 0.4) {
            return false;
        }

        return true;
    }

    /**
     * Vérifie si la personne est près de la tête de la victime (ventilateur)
     */
    isNearVictimHead(keypoints, existingRescuers) {
        if (existingRescuers.length === 0) return false;

        const compressor = existingRescuers.find(r => r.role === 'COMPRESSOR');
        if (!compressor) return false;

        // Le ventilateur devrait être à une certaine distance du compresseur
        const distance = this.calculateDistance(
            keypoints.handsCenter,
            compressor.handsPosition
        );

        // Distance typique entre tête et thorax
        return distance > 100 && distance < 400;
    }

    /**
     * Calcule la distance euclidienne entre deux points
     */
    calculateDistance(p1, p2) {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2)
        );
    }

    /**
     * Obtient la dernière détection
     */
    getLastPoses() {
        return this.lastPoses;
    }

    /**
     * Libère les ressources
     */
    dispose() {
        if (this.detector) {
            this.detector.dispose();
            this.detector = null;
        }
        this.isInitialized = false;
    }
}

// Singleton
export const poseService = new PoseDetectionService();
export default PoseDetectionService;
