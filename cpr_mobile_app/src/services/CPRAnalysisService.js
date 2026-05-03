/**
 * Service d'Analyse CPR
 * Calcul du BPM, profondeur de compression, et qualité de relâchement
 * 
 * Conforme aux protocoles Croissant Rouge / Croix-Rouge Internationale
 * AHA/ERC 2021 Guidelines
 */

// Protocoles médicaux par catégorie de victime
export const MEDICAL_PROTOCOLS = {
    ADULT: {
        id: 'ADULT',
        name: 'Adulte',
        nameAr: 'بالغ',
        compressionRatio: 30,
        ventilationRatio: 2,
        minBPM: 100,
        maxBPM: 120,
        optimalBPM: 110,
        minDepthCm: 5.0,
        maxDepthCm: 6.0,
        technique: 'TWO_HANDS',
        techniqueDesc: 'Deux mains, talon sur talon',
        techniqueDescAr: 'يدين، كعب فوق كعب',
        icon: '👨'
    },

    CHILD: {
        id: 'CHILD',
        name: 'Enfant (1-Puberté)',
        nameAr: 'طفل',
        compressionRatio: 15, // Pour 2 secouristes
        compressionRatioSingle: 30, // Pour 1 secouriste
        ventilationRatio: 2,
        minBPM: 100,
        maxBPM: 120,
        optimalBPM: 110,
        minDepthCm: 5.0,
        maxDepthCm: 5.5,
        technique: 'ONE_OR_TWO_HANDS',
        techniqueDesc: 'Une ou deux mains selon taille',
        techniqueDescAr: 'يد واحدة أو اثنتين حسب الحجم',
        icon: '👦'
    },

    INFANT: {
        id: 'INFANT',
        name: 'Nourrisson (<1 an)',
        nameAr: 'رضيع',
        compressionRatio: 15,
        compressionRatioSingle: 30,
        ventilationRatio: 2,
        minBPM: 100,
        maxBPM: 120,
        optimalBPM: 110,
        minDepthCm: 4.0,
        maxDepthCm: 4.5,
        technique: 'TWO_FINGERS',
        techniqueDesc: 'Deux doigts ou pouces encerclants',
        techniqueDescAr: 'إصبعان أو إبهامان محيطان',
        icon: '👶',
        initialVentilations: 5 // Toujours 5 insufflations pour nourrisson
    },

    PREGNANCY: {
        id: 'PREGNANCY',
        name: 'Femme enceinte (>20 sem.)',
        nameAr: 'امرأة حامل',
        compressionRatio: 30,
        ventilationRatio: 2,
        minBPM: 100,
        maxBPM: 120,
        optimalBPM: 110,
        minDepthCm: 5.0,
        maxDepthCm: 6.0,
        technique: 'TWO_HANDS_MODIFIED',
        techniqueDesc: 'Deux mains + déplacement utérin gauche',
        techniqueDescAr: 'يدين + إزاحة الرحم لليسار',
        icon: '🤰',
        specialWarning: 'DÉPLACER L\'UTÉRUS VERS LA GAUCHE',
        specialWarningAr: 'إزاحة الرحم نحو اليسار'
    },

    DROWNING: {
        id: 'DROWNING',
        name: 'Noyade',
        nameAr: 'غرق',
        compressionRatio: 30,
        ventilationRatio: 2,
        minBPM: 100,
        maxBPM: 120,
        optimalBPM: 110,
        minDepthCm: 5.0,
        maxDepthCm: 6.0,
        technique: 'TWO_HANDS',
        icon: '🌊',
        initialVentilations: 5, // 5 insufflations initiales AVANT compressions
        specialWarning: '5 INSUFFLATIONS INITIALES D\'ABORD',
        specialWarningAr: '5 نفخات أولية أولاً'
    },

    TRAUMA: {
        id: 'TRAUMA',
        name: 'Traumatisme rachis',
        nameAr: 'إصابة العمود الفقري',
        compressionRatio: 30,
        ventilationRatio: 2,
        minBPM: 100,
        maxBPM: 120,
        optimalBPM: 110,
        minDepthCm: 5.0,
        maxDepthCm: 6.0,
        technique: 'TWO_HANDS',
        icon: '🦴',
        specialWarning: 'NE PAS BASCULER LA TÊTE - Subluxation mandibulaire',
        specialWarningAr: 'لا تميل الرأس - رفع الفك فقط'
    }
};

// Thresholds pour l'analyse
const ANALYSIS_CONFIG = {
    // Fenêtre de temps pour calcul BPM (secondes)
    BPM_WINDOW_SEC: 10,

    // Nombre minimum de compressions pour BPM valide
    MIN_COMPRESSIONS_FOR_BPM: 3,

    // Seuils de mouvement (pixels)
    MIN_COMPRESSION_MOVEMENT: 20,
    MAX_COMPRESSION_MOVEMENT: 150,

    // Temps entre compressions (ms)
    MIN_COMPRESSION_INTERVAL_MS: 400,  // Max 150 BPM
    MAX_COMPRESSION_INTERVAL_MS: 750,  // Min 80 BPM

    // Seuil de relâchement
    RECOIL_THRESHOLD_PERCENT: 85,

    // Taille du buffer historique
    HISTORY_SIZE: 30
};

class CPRAnalysisService {
    constructor() {
        // Historique des positions Y des mains
        this.yPositionHistory = [];

        // Timestamps des compressions détectées
        this.compressionTimestamps = [];

        // État actuel
        this.currentState = 'IDLE'; // IDLE, COMPRESSING, RELEASING
        this.compressionCount = 0;
        this.ventilationCount = 0;
        this.cycleCount = 0;

        // Métriques calculées
        this.currentBPM = 0;
        this.avgDepth = 0;
        this.recoilQuality = 0;

        // Protocole actif
        this.activeProtocol = MEDICAL_PROTOCOLS.ADULT;
        this.rescuerCount = 1;

        // Position baseline
        this.baselineY = null;
        this.lowestY = null;
    }

    /**
     * Définit le protocole actif
     */
    setProtocol(protocolId) {
        this.activeProtocol = MEDICAL_PROTOCOLS[protocolId] || MEDICAL_PROTOCOLS.ADULT;
        this.reset();
    }

    /**
     * Définit le nombre de secouristes
     */
    setRescuerCount(count) {
        this.rescuerCount = count;
    }

    /**
     * Analyse une frame avec les données de position des mains
     * @param {Object} handsPosition - Position {x, y} du centre des mains
     * @param {number} timestamp - Timestamp en ms
     */
    analyzeFrame(handsPosition, timestamp = Date.now()) {
        if (!handsPosition) {
            return this.getMetrics();
        }

        const y = handsPosition.y;

        // Initialiser baseline si premier frame
        if (this.baselineY === null) {
            this.baselineY = y;
        }

        // Ajouter à l'historique
        this.yPositionHistory.push({ y, timestamp });

        // Limiter la taille de l'historique
        if (this.yPositionHistory.length > ANALYSIS_CONFIG.HISTORY_SIZE) {
            this.yPositionHistory.shift();
        }

        // Détecter les états de compression
        this.detectCompressionState(y, timestamp);

        // Calculer les métriques
        this.calculateMetrics();

        return this.getMetrics();
    }

    /**
     * Détecte l'état de compression (machine à états)
     */
    detectCompressionState(y, timestamp) {
        const movement = y - this.baselineY;

        switch (this.currentState) {
            case 'IDLE':
                // Début de compression (mouvement vers le bas)
                if (movement > ANALYSIS_CONFIG.MIN_COMPRESSION_MOVEMENT) {
                    this.currentState = 'COMPRESSING';
                    this.lowestY = y;
                }
                break;

            case 'COMPRESSING':
                // Continuer à suivre le point le plus bas
                if (y > this.lowestY) {
                    this.lowestY = y;
                }
                // Début de relâchement (mouvement vers le haut)
                if (y < this.lowestY - 10) {
                    this.currentState = 'RELEASING';
                }
                break;

            case 'RELEASING':
                // Vérifier si relâchement complet
                const recoilPercent = this.calculateRecoil(y);

                if (recoilPercent >= ANALYSIS_CONFIG.RECOIL_THRESHOLD_PERCENT) {
                    // Compression valide complète
                    this.registerCompression(timestamp);
                    this.currentState = 'IDLE';
                    this.baselineY = y;
                } else if (y > this.baselineY + 5) {
                    // Nouvelle compression sans relâchement complet
                    this.registerCompression(timestamp, false);
                    this.currentState = 'COMPRESSING';
                    this.lowestY = y;
                }
                break;
        }
    }

    /**
     * Enregistre une compression
     */
    registerCompression(timestamp, fullRecoil = true) {
        // Vérifier intervalle minimum (anti-rebond)
        const lastTimestamp = this.compressionTimestamps[this.compressionTimestamps.length - 1];
        if (lastTimestamp && timestamp - lastTimestamp < ANALYSIS_CONFIG.MIN_COMPRESSION_INTERVAL_MS) {
            return;
        }

        this.compressionTimestamps.push(timestamp);
        this.compressionCount++;

        // Calculer profondeur
        const depth = this.lowestY - this.baselineY;
        this.avgDepth = (this.avgDepth * (this.compressionCount - 1) + depth) / this.compressionCount;

        // Qualité de relâchement
        if (fullRecoil) {
            this.recoilQuality = (this.recoilQuality * (this.compressionCount - 1) + 100) / this.compressionCount;
        } else {
            this.recoilQuality = (this.recoilQuality * (this.compressionCount - 1) + 50) / this.compressionCount;
        }

        // Vérifier fin de cycle
        const ratio = this.getCompressionRatio();
        if (this.compressionCount >= ratio) {
            this.cycleCount++;
            // Pour simplifier, on reset le compteur (ventilations gérées séparément)
            this.compressionCount = 0;
        }

        // Nettoyer les vieux timestamps
        const cutoff = timestamp - (ANALYSIS_CONFIG.BPM_WINDOW_SEC * 1000);
        this.compressionTimestamps = this.compressionTimestamps.filter(t => t > cutoff);
    }

    /**
     * Calcule le pourcentage de relâchement
     */
    calculateRecoil(currentY) {
        if (!this.lowestY || !this.baselineY) return 0;

        const totalMovement = this.lowestY - this.baselineY;
        if (totalMovement <= 0) return 100;

        const returnMovement = this.lowestY - currentY;
        return Math.min(100, (returnMovement / totalMovement) * 100);
    }

    /**
     * Calcule les métriques CPR
     */
    calculateMetrics() {
        // Calculer BPM
        if (this.compressionTimestamps.length >= ANALYSIS_CONFIG.MIN_COMPRESSIONS_FOR_BPM) {
            const recentTimestamps = this.compressionTimestamps.slice(-10);
            if (recentTimestamps.length > 1) {
                const totalTime = recentTimestamps[recentTimestamps.length - 1] - recentTimestamps[0];
                const compressionCount = recentTimestamps.length - 1;
                const avgInterval = totalTime / compressionCount;
                this.currentBPM = Math.round(60000 / avgInterval);
            }
        }
    }

    /**
     * Obtient le ratio de compression selon protocole et nombre de secouristes
     */
    getCompressionRatio() {
        if (this.rescuerCount === 2 && this.activeProtocol.compressionRatio) {
            return this.activeProtocol.compressionRatio;
        }
        return this.activeProtocol.compressionRatioSingle || this.activeProtocol.compressionRatio;
    }

    /**
     * Obtient toutes les métriques actuelles
     */
    getMetrics() {
        const protocol = this.activeProtocol;

        // Évaluation qualité BPM
        let bpmStatus = 'WAITING';
        let bpmColor = '#888888';
        if (this.currentBPM > 0) {
            if (this.currentBPM >= protocol.minBPM && this.currentBPM <= protocol.maxBPM) {
                bpmStatus = 'GOOD';
                bpmColor = '#22C55E'; // Vert
            } else if (this.currentBPM < protocol.minBPM) {
                bpmStatus = 'TOO_SLOW';
                bpmColor = '#F97316'; // Orange
            } else {
                bpmStatus = 'TOO_FAST';
                bpmColor = '#EF4444'; // Rouge
            }
        }

        // Évaluation qualité relâchement
        let recoilStatus = 'WAITING';
        let recoilColor = '#888888';
        if (this.compressionCount > 0) {
            if (this.recoilQuality >= 90) {
                recoilStatus = 'GOOD';
                recoilColor = '#22C55E';
            } else if (this.recoilQuality >= 70) {
                recoilStatus = 'ACCEPTABLE';
                recoilColor = '#F59E0B';
            } else {
                recoilStatus = 'POOR';
                recoilColor = '#EF4444';
            }
        }

        return {
            // Valeurs brutes
            bpm: this.currentBPM,
            compressionCount: this.compressionCount,
            cycleCount: this.cycleCount,
            recoilQuality: Math.round(this.recoilQuality),
            avgDepth: Math.round(this.avgDepth),

            // Statuts
            bpmStatus,
            bpmColor,
            recoilStatus,
            recoilColor,

            // Progression du cycle
            cycleProgress: this.compressionCount / this.getCompressionRatio(),
            cycleTarget: this.getCompressionRatio(),

            // Protocole actif
            protocol: this.activeProtocol,

            // Guide
            guidance: this.getGuidance()
        };
    }

    /**
     * Génère les messages de guidance
     */
    getGuidance() {
        const messages = [];
        const protocol = this.activeProtocol;

        // Message de bienvenue spécial
        if (protocol.specialWarning) {
            messages.push({
                type: 'WARNING',
                text: protocol.specialWarning,
                textAr: protocol.specialWarningAr,
                priority: 1
            });
        }

        // Guidance BPM
        if (this.currentBPM > 0) {
            if (this.currentBPM < protocol.minBPM) {
                messages.push({
                    type: 'CORRECTION',
                    text: 'Plus vite! Augmentez le rythme',
                    textAr: 'أسرع! زد السرعة',
                    priority: 2
                });
            } else if (this.currentBPM > protocol.maxBPM) {
                messages.push({
                    type: 'CORRECTION',
                    text: 'Ralentissez légèrement',
                    textAr: 'أبطئ قليلاً',
                    priority: 2
                });
            } else {
                messages.push({
                    type: 'POSITIVE',
                    text: 'Excellent rythme! Continuez',
                    textAr: 'إيقاع ممتاز! استمر',
                    priority: 3
                });
            }
        }

        // Guidance relâchement
        if (this.recoilQuality > 0 && this.recoilQuality < 80) {
            messages.push({
                type: 'CORRECTION',
                text: 'Relâchez complètement le thorax',
                textAr: 'اترك الصدر يرتفع كاملاً',
                priority: 2
            });
        }

        // Tri par priorité
        messages.sort((a, b) => a.priority - b.priority);

        return messages;
    }

    /**
     * Réinitialise les compteurs
     */
    reset() {
        this.yPositionHistory = [];
        this.compressionTimestamps = [];
        this.currentState = 'IDLE';
        this.compressionCount = 0;
        this.ventilationCount = 0;
        this.cycleCount = 0;
        this.currentBPM = 0;
        this.avgDepth = 0;
        this.recoilQuality = 0;
        this.baselineY = null;
        this.lowestY = null;
    }
}

// Singleton
export const cprAnalysisService = new CPRAnalysisService();
export default CPRAnalysisService;
