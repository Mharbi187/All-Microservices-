/**
 * Écran CPR Principal - Assistance en temps réel
 * ===============================================
 * Architecture Hybride:
 * - ML Kit Pose Detection (OFFLINE - principal)
 * - Backend Python (OPTIONNEL - analyse avancée si WiFi)
 * 
 * Fonctionnalités:
 * - Détection de pose temps réel sur le téléphone
 * - Calcul BPM et profondeur des compressions
 * - Feedback vocal et haptique
 * - Fonctionne 100% hors ligne
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Alert,
    Vibration,
    Platform,
    Switch
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

// Services
import { MEDICAL_PROTOCOLS, cprAnalysisService } from '../services/CPRAnalysisService';
import { backendAPI } from '../services/BackendAPIService';
import { poseFrameProcessor } from '../services/PoseFrameProcessor';
import { mlKitPoseService } from '../services/MLKitPoseService';

// Components
import VictimTypeSelector from '../components/VictimTypeSelector';
import MetricsDisplay from '../components/MetricsDisplay';
import GuidanceOverlay from '../components/GuidanceOverlay';
import CompressionProgress from '../components/CompressionProgress';

const { width, height } = Dimensions.get('window');

// Modes de détection
const DETECTION_MODES = {
    OFFLINE: 'offline',      // ML Kit sur téléphone
    BACKEND: 'backend',      // Serveur Python
    SIMULATION: 'simulation' // Simulation pour dev
};

export default function CPRScreen({ route, navigation }) {
    const { rescuerCount = 1 } = route.params || {};

    // État caméra - SDK 52 hook
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const cameraRef = useRef(null);

    // État CPR
    const [isActive, setIsActive] = useState(false);
    const [selectedProtocol, setSelectedProtocol] = useState('ADULT');
    const [metrics, setMetrics] = useState(null);
    const [showSelector, setShowSelector] = useState(false);

    // État détection
    const [detectionMode, setDetectionMode] = useState(DETECTION_MODES.OFFLINE);
    const [poseDetected, setPoseDetected] = useState(false);
    const [handsPosition, setHandsPosition] = useState(null);

    // État Backend (optionnel)
    const [useBackendAnalysis, setUseBackendAnalysis] = useState(false);
    const [backendConnected, setBackendConnected] = useState(false);
    const [backendGuidance, setBackendGuidance] = useState(null);

    // Timer
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef(null);
    const analysisIntervalRef = useRef(null);

    // ========================================
    // INITIALISATION
    // ========================================

    useEffect(() => {
        initializeServices();

        return () => {
            cleanup();
        };
    }, []);

    const initializeServices = async () => {
        // Initialiser ML Kit Pose Service
        await mlKitPoseService.initialize();

        // Configurer CPR Analysis
        cprAnalysisService.setRescuerCount(rescuerCount);
        cprAnalysisService.setProtocol(selectedProtocol);

        // Configurer les callbacks du frame processor
        poseFrameProcessor.setCallbacks({
            onPoseDetected: handlePoseDetected,
            onMetricsUpdate: handleMetricsUpdate
        });

        // Vérifier connexion backend (optionnel)
        checkBackendConnection();
    };

    // Vérifier si le backend Python est disponible
    const checkBackendConnection = async () => {
        try {
            await backendAPI.loadServerUrl();
            const health = await backendAPI.checkHealth();
            setBackendConnected(health.connected);

            if (health.connected) {
                console.log('Backend Python disponible:', health.version);
            } else {
                console.log('Mode offline activé (pas de backend)');
            }
        } catch (error) {
            console.log('Backend non disponible, mode offline');
            setBackendConnected(false);
        }
    };

    const cleanup = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);

        poseFrameProcessor.stopSimulation();
        poseFrameProcessor.reset();
        Speech.stop();

        // Fermer session backend si active
        if (backendAPI.hasActiveSession()) {
            await backendAPI.endSession();
        }
    };

    // ========================================
    // GESTION DE LA POSE
    // ========================================

    const handlePoseDetected = (poseResult) => {
        setPoseDetected(poseResult.detected);

        if (poseResult.handsPosition) {
            setHandsPosition(poseResult.handsPosition);
        }
    };

    const handleMetricsUpdate = (newMetrics) => {
        setMetrics(newMetrics);

        // Feedback pour compression
        if (newMetrics.compressionCount !== metrics?.compressionCount) {
            provideFeedback(newMetrics);
        }
    };

    // ========================================
    // CONTRÔLE CPR
    // ========================================

    const toggleActive = () => {
        if (isActive) {
            stopAssistance();
        } else {
            startAssistance();
        }
    };

    const startAssistance = async () => {
        setIsActive(true);
        cprAnalysisService.reset();
        poseFrameProcessor.reset();
        setElapsedTime(0);
        setMetrics(null);

        // Annonce vocale
        speakGuidance('Assistance RCP démarrée. Placez vos mains et commencez les compressions.');

        // Créer session backend si connecté et activé
        if (useBackendAnalysis && backendConnected) {
            const result = await backendAPI.createSession(selectedProtocol, rescuerCount);
            if (!result.success) {
                console.log('Session backend échouée, mode offline');
                setUseBackendAnalysis(false);
            }
        }

        // Démarrer le timer
        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        // Démarrer le traitement des frames
        startFrameProcessing();
    };

    const stopAssistance = async () => {
        setIsActive(false);
        await cleanup();

        speakGuidance('Assistance arrêtée.');

        // Afficher résumé
        if (metrics) {
            Alert.alert(
                'Session terminée',
                `Durée: ${formatTime(elapsedTime)}\n` +
                `Compressions: ${metrics.compressionCount || 0}\n` +
                `BPM moyen: ${metrics.bpm ? metrics.bpm.toFixed(0) : '-'}\n` +
                `Mode: ${detectionMode === DETECTION_MODES.OFFLINE ? 'Offline' : 'Backend'}`,
                [{ text: 'OK' }]
            );
        }
    };

    // ========================================
    // TRAITEMENT DES FRAMES
    // ========================================

    const startFrameProcessing = () => {
        // Mode de détection selon configuration
        if (detectionMode === DETECTION_MODES.SIMULATION) {
            // Mode simulation pour développement
            poseFrameProcessor.enableSimulation();
            poseFrameProcessor.startSimulation();
        } else {
            // Mode ML Kit offline
            poseFrameProcessor.enableMLKitNative();
        }

        // Intervalle de traitement des frames
        analysisIntervalRef.current = setInterval(async () => {
            if (detectionMode === DETECTION_MODES.SIMULATION) {
                // Traitement en simulation
                await poseFrameProcessor.processFrame({});
            } else if (detectionMode === DETECTION_MODES.BACKEND && useBackendAnalysis && cameraRef.current) {
                // Traitement via backend Python
                await processFrameWithBackend();
            } else {
                // Traitement ML Kit local
                await processFrameLocally();
            }
        }, 100); // 10 FPS
    };

    // Traitement local (ML Kit)
    const processFrameLocally = async () => {
        try {
            if (!cameraRef.current) return;

            // En production avec ML Kit natif, les landmarks viennent du frame processor
            // Pour l'instant, on simule
            const result = await poseFrameProcessor.processFrame({});

            if (result && result.cpr) {
                setMetrics(result.cpr);
            }
        } catch (error) {
            console.warn('Erreur traitement local:', error);
        }
    };

    // Traitement via Backend Python (optionnel)
    const processFrameWithBackend = async () => {
        try {
            if (!cameraRef.current) return;

            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.5,
                skipProcessing: true
            });

            if (photo && photo.base64) {
                const result = await backendAPI.processFrame(photo.base64);

                if (result.success) {
                    const newMetrics = {
                        bpm: result.metrics.bpm,
                        compressionCount: result.metrics.compression_count,
                        depthCm: result.metrics.depth_cm,
                        recoilQuality: result.metrics.recoil_quality,
                        cycleCount: Math.floor(result.metrics.compression_count / 30),
                        cycleTarget: 30,
                        guidance: result.guidance ? [result.guidance] : []
                    };

                    setMetrics(newMetrics);
                    setBackendGuidance(result.guidance);

                    if (newMetrics.compressionCount !== metrics?.compressionCount) {
                        provideFeedback(newMetrics);
                    }
                } else if (result.offline) {
                    // Basculer en mode offline
                    setDetectionMode(DETECTION_MODES.OFFLINE);
                    setUseBackendAnalysis(false);
                }
            }
        } catch (error) {
            console.warn('Erreur backend:', error);
        }
    };

    // ========================================
    // FEEDBACK
    // ========================================

    const provideFeedback = (newMetrics) => {
        // Haptic
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Guidance vocale périodique
        const guidance = newMetrics.guidance?.[0];
        if (guidance && newMetrics.compressionCount % 10 === 0) {
            const text = typeof guidance === 'string' ? guidance : guidance.text_fr || guidance.text;
            if (text) speakGuidance(text);
        }

        // Guidance BPM
        if (newMetrics.compressionCount % 15 === 0 && newMetrics.bpm > 0) {
            if (newMetrics.bpm < 100) {
                speakGuidance('Plus vite');
            } else if (newMetrics.bpm > 120) {
                speakGuidance('Ralentissez');
            }
        }
    };

    const speakGuidance = (text) => {
        Speech.speak(text, {
            language: 'fr-FR',
            pitch: 1.0,
            rate: 1.1
        });
    };

    // ========================================
    // UTILITIES
    // ========================================

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleProtocolChange = (protocol) => {
        setSelectedProtocol(protocol);
        cprAnalysisService.setProtocol(protocol);
        setShowSelector(false);
    };

    // Toggle mode simulation/offline
    const toggleDetectionMode = () => {
        if (detectionMode === DETECTION_MODES.SIMULATION) {
            setDetectionMode(DETECTION_MODES.OFFLINE);
            poseFrameProcessor.stopSimulation();
        } else {
            setDetectionMode(DETECTION_MODES.SIMULATION);
            if (isActive) {
                poseFrameProcessor.startSimulation();
            }
        }
    };

    // ========================================
    // RENDER
    // ========================================

    // Vérification permissions caméra
    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Chargement...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Permission caméra requise</Text>
                <Text style={styles.subText}>
                    L'accès à la caméra est nécessaire pour la détection de pose CPR
                </Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Autoriser la caméra</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Caméra */}
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onCameraReady={() => setCameraReady(true)}
            >
                {/* Overlay de statut */}
                <View style={styles.statusBar}>
                    <View style={styles.statusItem}>
                        <View style={[
                            styles.statusDot,
                            {
                                backgroundColor: detectionMode === DETECTION_MODES.SIMULATION ? '#FFD700' :
                                    poseDetected ? '#00FF00' : '#FF0000'
                            }
                        ]} />
                        <Text style={styles.statusText}>
                            {detectionMode === DETECTION_MODES.SIMULATION ? 'SIMULATION' :
                                poseDetected ? 'POSE DÉTECTÉE' : 'RECHERCHE...'}
                        </Text>
                    </View>

                    <View style={styles.statusItem}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: backendConnected ? '#00FF00' : '#888' }
                        ]} />
                        <Text style={styles.statusText}>
                            {detectionMode === DETECTION_MODES.OFFLINE ? 'OFFLINE' :
                                backendConnected ? 'BACKEND' : 'LOCAL'}
                        </Text>
                    </View>
                </View>

                {/* Indicateur de position des mains */}
                {handsPosition && isActive && (
                    <View style={[
                        styles.handsIndicator,
                        {
                            left: handsPosition.x - 25,
                            top: handsPosition.y - 25
                        }
                    ]}>
                        <View style={styles.handsCircle} />
                    </View>
                )}

                {/* Métriques */}
                {isActive && metrics && (
                    <View style={styles.metricsOverlay}>
                        <MetricsDisplay metrics={metrics} />
                    </View>
                )}

                {/* Timer */}
                {isActive && (
                    <View style={styles.timerContainer}>
                        <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
                    </View>
                )}

                {/* Guidance */}
                {isActive && backendGuidance && (
                    <GuidanceOverlay guidance={backendGuidance} />
                )}

                {/* Progress */}
                {isActive && metrics && (
                    <View style={styles.progressContainer}>
                        <CompressionProgress
                            count={metrics.compressionCount || 0}
                            target={metrics.cycleTarget || 30}
                            cycle={metrics.cycleCount || 0}
                        />
                    </View>
                )}

            </CameraView>

            {/* Contrôles en bas */}
            <View style={styles.controlsContainer}>
                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                    <Text style={styles.modeLabel}>
                        Mode: {detectionMode === DETECTION_MODES.SIMULATION ? '🧪 Simulation' : '📱 Offline'}
                    </Text>
                    <Switch
                        value={detectionMode === DETECTION_MODES.SIMULATION}
                        onValueChange={toggleDetectionMode}
                        trackColor={{ false: '#767577', true: '#FFD700' }}
                        thumbColor={detectionMode === DETECTION_MODES.SIMULATION ? '#FFA500' : '#f4f3f4'}
                    />
                </View>

                {/* Sélecteur de protocole */}
                <TouchableOpacity
                    style={styles.protocolButton}
                    onPress={() => setShowSelector(true)}
                    disabled={isActive}
                >
                    <Text style={styles.protocolButtonText}>
                        {MEDICAL_PROTOCOLS[selectedProtocol]?.icon} {MEDICAL_PROTOCOLS[selectedProtocol]?.name}
                    </Text>
                </TouchableOpacity>

                {/* Bouton principal */}
                <TouchableOpacity
                    style={[
                        styles.mainButton,
                        isActive ? styles.stopButton : styles.startButton
                    ]}
                    onPress={toggleActive}
                >
                    <Text style={styles.mainButtonText}>
                        {isActive ? '⏹ ARRÊTER' : '▶️ DÉMARRER CPR'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal sélecteur */}
            {showSelector && (
                <VictimTypeSelector
                    visible={showSelector}
                    onSelect={handleProtocolChange}
                    onClose={() => setShowSelector(false)}
                    currentProtocol={selectedProtocol}
                />
            )}
        </View>
    );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },

    // Status Bar
    statusBar: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Hands Indicator
    handsIndicator: {
        position: 'absolute',
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    handsCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 255, 255, 0.4)',
        borderWidth: 3,
        borderColor: '#00FFFF',
    },

    // Metrics Overlay
    metricsOverlay: {
        position: 'absolute',
        top: 100,
        left: 10,
        right: 10,
    },

    // Timer
    timerContainer: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
    },
    timer: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },

    // Progress
    progressContainer: {
        position: 'absolute',
        bottom: 180,
        left: 20,
        right: 20,
    },

    // Controls
    controlsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 20,
        paddingBottom: 40,
    },
    modeToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    modeLabel: {
        color: '#FFF',
        fontSize: 14,
    },
    protocolButton: {
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    protocolButtonText: {
        color: '#FFF',
        fontSize: 16,
    },
    mainButton: {
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: '#DC2626',
    },
    stopButton: {
        backgroundColor: '#666',
    },
    mainButtonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },

    // Permission screens
    text: {
        color: '#FFF',
        fontSize: 20,
        textAlign: 'center',
        marginTop: 100,
    },
    subText: {
        color: '#AAA',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 40,
    },
    button: {
        backgroundColor: '#DC2626',
        padding: 15,
        borderRadius: 10,
        marginTop: 30,
        marginHorizontal: 50,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: 'bold',
    },
});
