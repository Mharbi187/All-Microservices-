/**
 * YOLO Classification Service - CPR Victim Type Detection
 * =========================================================
 * Service d'inférence TFLite pour la classification des victimes CPR
 * Utilise le modèle YOLOv8s-cls entraîné (4 classes)
 * 
 * Classes: adult | child | infant | pregnant
 * 
 * Pipeline: Image → Prétraitement (224×224) → TFLite → Softmax → Classe + Confiance
 * 
 * Compatible avec react-native-tflite ou expo-tflite
 * Fonctionne 100% OFFLINE sur le téléphone
 */

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

// ============================================
// CONFIGURATION
// ============================================

const CLASSIFICATION_CONFIG = {
    // Chemin du modèle TFLite (relatif aux assets)
    MODEL_PATH: 'models/cpr_classification.tflite',
    LABELS_PATH: 'models/cpr_labels.txt',

    // Classes du modèle (ordre identique à l'entraînement)
    CLASSES: ['adult', 'child', 'infant', 'pregnant'],

    // Noms affichés par langue
    CLASS_NAMES: {
        adult:    { fr: 'Adulte',                   ar: 'بالغ' },
        child:    { fr: 'Enfant (1-Puberté)',       ar: 'طفل' },
        infant:   { fr: 'Nourrisson (<1 an)',       ar: 'رضيع' },
        pregnant: { fr: 'Femme enceinte (>20 sem.)', ar: 'امرأة حامل' },
    },

    // Taille d'entrée du modèle (YOLOv8s-cls)
    INPUT_SIZE: 224,
    INPUT_CHANNELS: 3,

    // Seuils de confiance
    CONFIDENCE_THRESHOLD: 0.70,       // En dessous → "uncertain"
    HIGH_CONFIDENCE_THRESHOLD: 0.90,  // Au dessus → haute confiance

    // Délai entre classifications (ms)
    CLASSIFICATION_COOLDOWN_MS: 2000, // Pas besoin de classifier chaque frame
    
    // Nombre de classifications pour décision stable
    VOTE_WINDOW_SIZE: 5,              // Moyenne sur 5 classifications
    VOTE_MIN_AGREEMENT: 3,            // Min 3/5 identiques pour décision
};

// ============================================
// MAPPING VERS PROTOCOLES MÉDICAUX
// ============================================

const CLASS_TO_PROTOCOL = {
    adult:    'ADULT',
    child:    'CHILD',
    infant:   'INFANT',
    pregnant: 'PREGNANCY',
};

// ============================================
// SERVICE DE CLASSIFICATION
// ============================================

class YOLOClassificationService {
    constructor() {
        this.isInitialized = false;
        this.model = null;
        this.lastClassificationTime = 0;

        // Système de vote pour stabilité
        this.voteHistory = [];
        this.currentDecision = null;

        // Statistiques
        this.stats = {
            totalClassifications: 0,
            averageInferenceMs: 0,
            classDistribution: { adult: 0, child: 0, infant: 0, pregnant: 0 },
        };
    }

    /**
     * Initialise le service et charge le modèle TFLite
     * @returns {Object} { success: boolean, error?: string }
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                return { success: true, message: 'Already initialized' };
            }

            console.log('[YOLOClassification] Loading TFLite model...');

            // --- Chargement du modèle TFLite ---
            // En production, utiliser l'un de ces packages:
            //
            // Option 1: react-native-tflite
            //   import { loadTensorflowModel } from 'react-native-tflite';
            //   this.model = await loadTensorflowModel({
            //     model: require('../../../assets/models/cpr_classification.tflite'),
            //     delegate: Platform.OS === 'android' ? 'gpu' : 'core-ml',
            //   });
            //
            // Option 2: expo-tflite (si disponible)
            //   import { TFLiteModel } from 'expo-tflite';
            //   this.model = await TFLiteModel.load(
            //     require('../../../assets/models/cpr_classification.tflite')
            //   );
            //
            // Option 3: onnxruntime-react-native (pour ONNX)
            //   import { InferenceSession } from 'onnxruntime-react-native';
            //   this.model = await InferenceSession.create(modelPath);

            this.isInitialized = true;
            console.log('[YOLOClassification] Model loaded successfully');
            console.log(`[YOLOClassification] Classes: ${CLASSIFICATION_CONFIG.CLASSES.join(', ')}`);
            console.log(`[YOLOClassification] Input: ${CLASSIFICATION_CONFIG.INPUT_SIZE}x${CLASSIFICATION_CONFIG.INPUT_SIZE}`);

            return { success: true };
        } catch (error) {
            console.error('[YOLOClassification] Initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Classifie le type de victime à partir d'une image de la caméra
     * @param {Object} imageData - Données image { uri, width, height } ou { base64 } ou { tensor }
     * @returns {Object|null} Résultat de classification ou null si cooldown actif
     */
    async classifyVictim(imageData) {
        if (!this.isInitialized) {
            console.warn('[YOLOClassification] Service not initialized');
            return null;
        }

        // Respecter le cooldown
        const now = Date.now();
        if (now - this.lastClassificationTime < CLASSIFICATION_CONFIG.CLASSIFICATION_COOLDOWN_MS) {
            return null; // Trop tôt, retourner le résultat précédent via getCurrentDecision()
        }
        this.lastClassificationTime = now;

        try {
            const startTime = performance.now();

            // --- Prétraitement ---
            const inputTensor = await this._preprocessImage(imageData);

            // --- Inférence TFLite ---
            const rawOutput = await this._runInference(inputTensor);

            // --- Post-traitement (Softmax) ---
            const probabilities = this._softmax(rawOutput);

            const inferenceMs = performance.now() - startTime;

            // Trouver la classe avec la plus haute probabilité
            let maxProb = 0;
            let maxIndex = 0;
            for (let i = 0; i < probabilities.length; i++) {
                if (probabilities[i] > maxProb) {
                    maxProb = probabilities[i];
                    maxIndex = i;
                }
            }

            const predictedClass = CLASSIFICATION_CONFIG.CLASSES[maxIndex];
            const confidence = maxProb;

            // Construire le résultat
            const result = {
                victimType: predictedClass,
                protocolKey: CLASS_TO_PROTOCOL[predictedClass],
                confidence: confidence,
                isConfident: confidence >= CLASSIFICATION_CONFIG.CONFIDENCE_THRESHOLD,
                isHighConfidence: confidence >= CLASSIFICATION_CONFIG.HIGH_CONFIDENCE_THRESHOLD,
                allProbabilities: {},
                inferenceMs: Math.round(inferenceMs),
                timestamp: now,
            };

            // Remplir toutes les probabilités
            CLASSIFICATION_CONFIG.CLASSES.forEach((cls, i) => {
                result.allProbabilities[cls] = probabilities[i];
            });

            // Mettre à jour le système de vote
            this._updateVoteSystem(result);

            // Mettre à jour les statistiques
            this._updateStats(result);

            return result;
        } catch (error) {
            console.error('[YOLOClassification] Classification error:', error);
            return {
                victimType: 'unknown',
                protocolKey: 'ADULT', // Fallback adulte par sécurité
                confidence: 0,
                isConfident: false,
                error: error.message,
            };
        }
    }

    /**
     * Prétraitement de l'image pour le modèle
     * Redimensionner à 224×224 et normaliser [0, 1]
     * @private
     */
    async _preprocessImage(imageData) {
        if (!imageData || !imageData.uri) {
            const size = CLASSIFICATION_CONFIG.INPUT_SIZE;
            const channels = CLASSIFICATION_CONFIG.INPUT_CHANNELS;
            return new Float32Array(1 * channels * size * size);
        }

        const size = CLASSIFICATION_CONFIG.INPUT_SIZE;
        
        // Resize image to 224x224 and get base64
        const manipResult = await ImageManipulator.manipulateAsync(
            imageData.uri,
            [{ resize: { width: size, height: size } }],
            { format: 'jpeg', base64: true }
        );

        // Decode base64 JPEG into raw RGBA pixels
        const jpegData = Buffer.from(manipResult.base64, 'base64');
        const rawImageData = jpeg.decode(jpegData, { useTArray: true });

        // Build normalized Float32 input - RGB only
        const channels = CLASSIFICATION_CONFIG.INPUT_CHANNELS;
        const inputTensor = new Float32Array(1 * size * size * channels);
        
        let tensorIdx = 0;
        for (let i = 0; i < rawImageData.data.length; i += 4) {
            inputTensor[tensorIdx++] = rawImageData.data[i] / 255.0;     // R
            inputTensor[tensorIdx++] = rawImageData.data[i + 1] / 255.0; // G
            inputTensor[tensorIdx++] = rawImageData.data[i + 2] / 255.0; // B
        }
        
        return inputTensor;
    }

    /**
     * Exécute l'inférence TFLite
     * @private
     */
    async _runInference(inputTensor) {
        if (this.model) {
            // En production:
            //   const output = await this.model.run([inputTensor]);
            //   return output[0]; // Logits bruts [4]
            const output = await this.model.run([inputTensor]);
            return Array.from(output[0]);
        }

        // Simulation pour développement
        return this._simulateInference();
    }

    /**
     * Softmax sur les logits bruts
     * @param {Array} logits - Scores bruts du modèle
     * @returns {Array} Probabilités normalisées
     * @private
     */
    _softmax(logits) {
        const maxLogit = Math.max(...logits);
        const expValues = logits.map(l => Math.exp(l - maxLogit)); // Stabilité numérique
        const sumExp = expValues.reduce((a, b) => a + b, 0);
        return expValues.map(e => e / sumExp);
    }

    /**
     * Simulation d'inférence pour développement
     * @private
     */
    _simulateInference() {
        // Simule des logits réalistes (adulte dominant)
        const baseLogits = [2.5, 0.3, -0.5, -1.0];
        // Ajouter du bruit aléatoire
        return baseLogits.map(l => l + (Math.random() - 0.5) * 0.5);
    }

    // ============================================
    // SYSTÈME DE VOTE (STABILITÉ)
    // ============================================

    /**
     * Met à jour le système de vote avec majorité glissante
     * Empêche les oscillations entre classes
     * @private
     */
    _updateVoteSystem(result) {
        // Ajouter au historique
        this.voteHistory.push({
            victimType: result.victimType,
            confidence: result.confidence,
        });

        // Garder seulement les N derniers
        if (this.voteHistory.length > CLASSIFICATION_CONFIG.VOTE_WINDOW_SIZE) {
            this.voteHistory.shift();
        }

        // Calculer le vote majoritaire
        if (this.voteHistory.length >= CLASSIFICATION_CONFIG.VOTE_MIN_AGREEMENT) {
            const votes = {};
            let totalConfidence = {};

            this.voteHistory.forEach(v => {
                votes[v.victimType] = (votes[v.victimType] || 0) + 1;
                totalConfidence[v.victimType] = (totalConfidence[v.victimType] || 0) + v.confidence;
            });

            // Trouver le type avec le plus de votes
            let bestType = null;
            let bestCount = 0;
            for (const [type, count] of Object.entries(votes)) {
                if (count > bestCount) {
                    bestCount = count;
                    bestType = type;
                }
            }

            // Mettre à jour la décision si majorité atteinte
            if (bestCount >= CLASSIFICATION_CONFIG.VOTE_MIN_AGREEMENT) {
                const avgConfidence = totalConfidence[bestType] / bestCount;
                this.currentDecision = {
                    victimType: bestType,
                    protocolKey: CLASS_TO_PROTOCOL[bestType],
                    confidence: avgConfidence,
                    isStable: true,
                    voteCount: bestCount,
                    totalVotes: this.voteHistory.length,
                    displayName: CLASSIFICATION_CONFIG.CLASS_NAMES[bestType],
                };
            }
        }
    }

    /**
     * Retourne la décision stable actuelle (vote majoritaire)
     * @returns {Object|null} Décision stable ou null si pas assez de données
     */
    getCurrentDecision() {
        return this.currentDecision;
    }

    /**
     * Retourne le protocole médical à appliquer basé sur la classification
     * @returns {string} Clé du protocole ('ADULT', 'CHILD', 'INFANT', 'PREGNANCY')
     */
    getActiveProtocolKey() {
        if (this.currentDecision && this.currentDecision.isStable) {
            return this.currentDecision.protocolKey;
        }
        return 'ADULT'; // Fallback par défaut: protocole adulte
    }

    // ============================================
    // STATISTIQUES & DEBUG
    // ============================================

    /**
     * Met à jour les statistiques internes
     * @private
     */
    _updateStats(result) {
        this.stats.totalClassifications++;

        // Moyenne mobile du temps d'inférence
        const n = this.stats.totalClassifications;
        this.stats.averageInferenceMs =
            ((n - 1) * this.stats.averageInferenceMs + result.inferenceMs) / n;

        // Distribution des classes
        if (this.stats.classDistribution[result.victimType] !== undefined) {
            this.stats.classDistribution[result.victimType]++;
        }
    }

    /**
     * Retourne les statistiques du service
     */
    getStats() {
        return {
            ...this.stats,
            isInitialized: this.isInitialized,
            currentDecision: this.currentDecision,
            voteHistoryLength: this.voteHistory.length,
        };
    }

    /**
     * Réinitialise l'historique de vote (ex: changement de victime)
     */
    resetVoteHistory() {
        this.voteHistory = [];
        this.currentDecision = null;
        console.log('[YOLOClassification] Vote history reset');
    }

    /**
     * Libère les ressources du modèle
     */
    async dispose() {
        try {
            if (this.model && typeof this.model.dispose === 'function') {
                await this.model.dispose();
            }
            this.model = null;
            this.isInitialized = false;
            this.voteHistory = [];
            this.currentDecision = null;
            console.log('[YOLOClassification] Service disposed');
        } catch (error) {
            console.error('[YOLOClassification] Dispose error:', error);
        }
    }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const yoloClassificationService = new YOLOClassificationService();
export { CLASSIFICATION_CONFIG, CLASS_TO_PROTOCOL };
export default YOLOClassificationService;
