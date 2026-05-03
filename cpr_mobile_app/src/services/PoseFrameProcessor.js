/**
 * Pose Frame Processor
 * =====================
 * Processeur de frames pour la détection de pose en temps réel
 * Compatible avec expo-camera et react-native-vision-camera
 * 
 * Ce module gère:
 * - Capture des frames à intervalle régulier
 * - Simulation ML Kit (pour dev sans module natif)
 * - Interface unifiée pour la détection de pose
 */

import { mlKitPoseService } from './MLKitPoseService';
import { cprAnalysisService } from './CPRAnalysisService';

// Configuration du frame processor
const FRAME_CONFIG = {
    // Intervalle entre analyses (ms) - 10 FPS optimal pour CPR
    PROCESS_INTERVAL_MS: 100,

    // Mode de détection
    USE_ML_KIT_NATIVE: false, // true quand ML Kit natif disponible
    USE_SIMULATION: true, // Simulation pour développement

    // Dimensions attendues
    FRAME_WIDTH: 640,
    FRAME_HEIGHT: 480,
};

/**
 * Classe pour traiter les frames de la caméra
 */
class PoseFrameProcessor {
    constructor() {
        this.isProcessing = false;
        this.lastProcessTime = 0;
        this.onPoseDetected = null;
        this.onMetricsUpdate = null;

        // Simulation de mouvement CPR
        this.simulationPhase = 0;
        this.simulationActive = false;
    }

    /**
     * Configure les callbacks
     */
    setCallbacks({ onPoseDetected, onMetricsUpdate }) {
        this.onPoseDetected = onPoseDetected;
        this.onMetricsUpdate = onMetricsUpdate;
    }

    /**
     * Traite une frame de la caméra
     * @param {Object} frame - Données de la frame (photo base64 ou tensor)
     * @returns {Object} Résultats de détection et métriques CPR
     */
    async processFrame(frame) {
        const now = Date.now();

        // Limiter le taux de traitement
        if (now - this.lastProcessTime < FRAME_CONFIG.PROCESS_INTERVAL_MS) {
            return null;
        }

        this.lastProcessTime = now;
        this.isProcessing = true;

        try {
            let poseResult;

            if (FRAME_CONFIG.USE_ML_KIT_NATIVE && frame.landmarks) {
                // Mode ML Kit natif
                poseResult = mlKitPoseService.processPoseLandmarks(frame.landmarks);
            } else if (FRAME_CONFIG.USE_SIMULATION) {
                // Mode simulation pour développement
                poseResult = this._simulatePoseDetection();
            } else {
                // Fallback: pas de détection
                poseResult = { detected: false };
            }

            // Notifier la détection de pose
            if (this.onPoseDetected && poseResult.detected) {
                this.onPoseDetected(poseResult);
            }

            // Analyser les métriques CPR si mains détectées en position
            let cprMetrics = null;
            if (poseResult.detected && poseResult.handsTogether && poseResult.handsPosition) {
                cprMetrics = cprAnalysisService.analyzeFrame(
                    poseResult.handsPosition,
                    now
                );

                if (this.onMetricsUpdate) {
                    this.onMetricsUpdate(cprMetrics);
                }
            }

            return {
                pose: poseResult,
                cpr: cprMetrics,
                timestamp: now
            };

        } catch (error) {
            console.warn('Frame processing error:', error);
            return null;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Simulation de détection de pose (pour développement)
     * Simule un mouvement de compression CPR
     */
    _simulatePoseDetection() {
        if (!this.simulationActive) {
            return { detected: false };
        }

        // Avancer la phase de simulation
        this.simulationPhase += 0.15; // ~100-120 BPM

        // Simuler le mouvement vertical des mains (compression)
        const baseY = FRAME_CONFIG.FRAME_HEIGHT / 2;
        const amplitude = 40; // pixels de mouvement
        const wristY = baseY + Math.sin(this.simulationPhase) * amplitude;

        // Position centrale des mains
        const handsPosition = {
            x: FRAME_CONFIG.FRAME_WIDTH / 2,
            y: wristY
        };

        // Simuler également les landmarks
        const simulatedLandmarks = this._createSimulatedLandmarks(handsPosition);

        return {
            detected: true,
            handsTogether: true,
            handsPosition: handsPosition,
            handDistance: 20,
            confidence: 0.95,
            landmarks: simulatedLandmarks,
            isSimulation: true
        };
    }

    /**
     * Créer des landmarks simulés pour tests
     */
    _createSimulatedLandmarks(handsCenter) {
        const cx = FRAME_CONFIG.FRAME_WIDTH / 2;
        const cy = FRAME_CONFIG.FRAME_HEIGHT / 2;

        return {
            leftWrist: { x: handsCenter.x - 10, y: handsCenter.y, confidence: 0.95 },
            rightWrist: { x: handsCenter.x + 10, y: handsCenter.y, confidence: 0.95 },
            leftElbow: { x: cx - 80, y: cy - 50, confidence: 0.9 },
            rightElbow: { x: cx + 80, y: cy - 50, confidence: 0.9 },
            leftShoulder: { x: cx - 100, y: cy - 100, confidence: 0.9 },
            rightShoulder: { x: cx + 100, y: cy - 100, confidence: 0.9 }
        };
    }

    /**
     * Démarrer la simulation (pour développement)
     */
    startSimulation() {
        this.simulationActive = true;
        this.simulationPhase = 0;
        console.log('Pose simulation started');
    }

    /**
     * Arrêter la simulation
     */
    stopSimulation() {
        this.simulationActive = false;
        console.log('Pose simulation stopped');
    }

    /**
     * Activer le mode ML Kit natif
     */
    enableMLKitNative() {
        FRAME_CONFIG.USE_ML_KIT_NATIVE = true;
        FRAME_CONFIG.USE_SIMULATION = false;
    }

    /**
     * Activer le mode simulation
     */
    enableSimulation() {
        FRAME_CONFIG.USE_ML_KIT_NATIVE = false;
        FRAME_CONFIG.USE_SIMULATION = true;
    }

    /**
     * Réinitialiser le processeur
     */
    reset() {
        this.isProcessing = false;
        this.lastProcessTime = 0;
        this.simulationPhase = 0;
        mlKitPoseService.reset();
        cprAnalysisService.reset();
    }
}

// Export singleton
export const poseFrameProcessor = new PoseFrameProcessor();
export { FRAME_CONFIG };
export default poseFrameProcessor;
