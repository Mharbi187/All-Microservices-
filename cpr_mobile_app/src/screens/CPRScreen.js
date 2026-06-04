/**
 * CPR Screen — Real-time CPR Assistance
 * =======================================
 * Full pipeline: Camera → Backend (MediaPipe+YOLO) → RulesEngine → Feedback
 * No simulation stubs. All data is real.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Alert,
    Platform,
    TextInput,
    ActivityIndicator,
    ScrollView,
    Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

// Services
import { backendAPI } from '../services/BackendAPIService';
import { cprRouter } from '../services/CPRAnalysisRouter';
import { rulesEngine } from '../services/RulesEngine';
import { useAuth } from '../contexts/AuthContext';

// Components
import MetricsDisplay from '../components/MetricsDisplay';
import GuidanceOverlay from '../components/GuidanceOverlay';
import CompressionProgress from '../components/CompressionProgress';

const { width, height } = Dimensions.get('window');

// Severity colors from rcp_rules.json
const SEVERITY_COLORS = {
    CRITICAL: '#EF4444',
    HIGH: '#F97316',
    MEDIUM: '#EAB308',
    POSITIVE: '#22C55E',
};

const SEVERITY_ICONS = {
    CRITICAL: 'alert-octagon',
    HIGH: 'alert-triangle',
    MEDIUM: 'info',
};

const VICTIM_ICONS = {
    adult: 'user',
    child: 'user-minus',
    infant: 'smile', // using an available feather icon for baby
    pregnant: 'user-plus'
};

const VICTIM_LABELS = {
    adult: 'Adulte',
    child: 'Enfant',
    infant: 'Nourrisson',
    pregnant: 'Enceinte'
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CPRScreen({ route, navigation }) {
    const { rescuerCount = 1 } = route.params || {};
    const { user } = useAuth(); // null = guest/offline, object = logged-in user
    const isOffline = !user;   // ← THE KEY FLAG

    // Camera
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const cameraRef = useRef(null);

    // Connection
    const [phase, setPhase] = useState('SETUP'); // SETUP | CONNECTING | READY | ACTIVE
    const [serverIP, setServerIP] = useState('');
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [serverVersion, setServerVersion] = useState('');

    // CPR session
    const [isActive, setIsActive] = useState(false);
    const [victimType, setVictimType] = useState('adult');
    const [metrics, setMetrics] = useState(null);

    // Timer
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef(null);

    // Voice guidance cooldown
    const lastSpeechRef = useRef(0);
    const lastSpokenMsgRef = useRef('');

    // ──────────────────────────────────────────────────────────────────────────
    //  INITIALIZATION
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        // Initialize the router so it knows which processor to use
        cprRouter.initializeRouting().then(() => {
            if (isOffline) {
                // Skip server connection entirely for guests — go straight to READY
                setPhase('READY');
                setConnectionStatus({ connected: true, mode: 'offline' });
            } else {
                connectToServer();
            }
        });
        return () => cleanup();
    }, [isOffline]);

    const cleanup = () => {
        cprRouter.stop();
        cprRouter.reset();
        if (timerRef.current) clearInterval(timerRef.current);
        Speech.stop();
        if (!isOffline && backendAPI.hasActiveSession()) {
            backendAPI.endSession();
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    //  SERVER CONNECTION
    // ──────────────────────────────────────────────────────────────────────────

    const connectToServer = async () => {
        setPhase('CONNECTING');
        try {
            // Server URL is now automatically managed by BackendAPIService
            const health = await backendAPI.checkHealth();
            if (health.connected) {
                setServerVersion(health.version || '');
                setConnectionStatus({ connected: true });
                setPhase('READY');
            } else {
                Alert.alert('Connexion échouée',
                    'Serveur non trouvé. Assurez-vous que la commande Python uvicorn est bien lancée sur le port 8000.');
                setPhase('SETUP');
            }
        } catch (error) {
            Alert.alert('Erreur', error.message);
            setPhase('SETUP');
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    //  CPR SESSION CONTROL
    // ──────────────────────────────────────────────────────────────────────────

    const startCPR = async () => {
        // Only create a backend session when Online
        if (!isOffline) {
            const result = await backendAPI.createSession(victimType.toUpperCase(), rescuerCount);
            if (!result.success) {
                Alert.alert('Erreur', 'Impossible de créer la session: ' + (result.error || ''));
                return;
            }
        }

        setMetrics(null);
        setElapsedTime(0);
        setIsActive(true);
        setPhase('ACTIVE');

        // Configure router (it internally routes to the right processor)
        cprRouter.setCameraRef(cameraRef);
        cprRouter.setCallbacks({
            onMetricsUpdate: handleMetricsUpdate,
            onConnectionStatus: handleConnectionUpdate,
            onError: handlePipelineError,
        });

        // Start the correct processor via router
        cprRouter.start();

        // Start timer
        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        speak(rulesEngine.language === 'ar'
            ? 'بدأت المساعدة. ضع يديك وابدأ الضغط'
            : isOffline ? 'Mode hors-ligne activé. Démarrez les compressions.'
                : 'Assistance démarrée. Placez vos mains et commencez');
    };

    const stopCPR = async () => {
        cprRouter.stop();
        if (timerRef.current) clearInterval(timerRef.current);
        Speech.stop();

        await new Promise(r => setTimeout(r, 300));

        const stats = cprRouter.getStats();
        setIsActive(false);
        setPhase('READY');

        if (!isOffline && backendAPI.hasActiveSession()) {
            await backendAPI.endSession();
        }

        // Show summary
        Alert.alert(
            'Session terminée',
            `Durée: ${formatTime(elapsedTime)}\n` +
            `Compressions: ${metrics?.metrics?.compression_count || 0}\n` +
            `BPM: ${metrics?.metrics?.bpm || '-'}\n` +
            `Images traitées: ${stats.framesProcessed}\n` +
            `Latence moyenne: ${stats.avgLatencyMs}ms`,
            [{ text: 'OK' }]
        );
    };

    // ──────────────────────────────────────────────────────────────────────────
    //  CALLBACKS FROM PIPELINE
    // ──────────────────────────────────────────────────────────────────────────

    const handleMetricsUpdate = useCallback((newMetrics) => {
        setMetrics(newMetrics);

        // Haptic feedback on each new compression
        if (Platform.OS !== 'web' && newMetrics?.metrics && newMetrics.metrics.compression_count > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        }

        // Voice guidance — throttled to avoid overlapping
        const now = Date.now();
        if (now - lastSpeechRef.current > 4000) {
            const msg = pickVoiceMessage(newMetrics);
            if (msg && msg !== lastSpokenMsgRef.current) {
                const lang = rulesEngine.language === 'ar' ? 'ar-SA' : 'fr-FR';
                Speech.speak(msg, { language: lang, pitch: 1.0, rate: 1.1 });
                lastSpeechRef.current = now;
                lastSpokenMsgRef.current = msg;
            }
        }
    }, []);

    const handleConnectionUpdate = useCallback((status) => {
        setConnectionStatus(status);
    }, []);

    const handlePipelineError = useCallback((error) => {
        console.warn('[CPRScreen] Pipeline error:', error);
    }, []);

    // ──────────────────────────────────────────────────────────────────────────
    //  VOICE FEEDBACK
    // ──────────────────────────────────────────────────────────────────────────

    const pickVoiceMessage = (m) => {
        if (!m || !m.ui_commands || m.ui_commands.length === 0) return null;

        // Priority 1: Pick the first (most critical) command from the backend array
        const cmd = m.ui_commands[0];

        // Ensure proper fallback hierarchy based on rule definitions
        const lang = rulesEngine.language || 'fr';

        if (lang === 'ar' && cmd.text_ar) return cmd.text_ar;
        if (lang === 'fr' && cmd.text_fr) return cmd.text_fr;

        // Final fallback logic
        return cmd.text_fr || cmd.text_en;
    };

    const speak = (text) => {
        if (!text) return;
        const lang = rulesEngine.language === 'ar' ? 'ar-SA' : 'fr-FR';
        Speech.speak(text, { language: lang, pitch: 1.0, rate: 1.1 });
    };

    // ──────────────────────────────────────────────────────────────────────────
    //  UTILITIES
    // ──────────────────────────────────────────────────────────────────────────

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const victimTypes = rulesEngine.getVictimTypes();

    // ══════════════════════════════════════════════════════════════════════════
    //  RENDER
    // ══════════════════════════════════════════════════════════════════════════

    // ── Permission check ──
    if (!permission) {
        return <View style={styles.container}><ActivityIndicator size="large" color="#DC2626" /></View>;
    }
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Feather name="camera-off" size={48} color="#AAA" style={{ marginBottom: 16 }} />
                <Text style={styles.title}>Permission caméra requise</Text>
                <Text style={styles.subtitle}>Nécessaire pour la détection de pose CPR</Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
                    <Text style={styles.btnText}>Autoriser la caméra</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── SETUP phase: server connection ──
    if (phase === 'SETUP' || phase === 'CONNECTING') {
        return (
            <View style={styles.center}>
                <Feather name="server" size={48} color="#AAA" style={{ marginBottom: 16 }} />
                <Text style={styles.title}>Connexion au serveur</Text>

                <ActivityIndicator size="large" color="#DC2626" style={{ marginVertical: 20 }} />

                {phase === 'SETUP' && (
                    <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={connectToServer}
                    >
                        <Text style={styles.btnText}>Réessayer</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // ── READY / ACTIVE phase: camera + CPR ──
    return (
        <View style={styles.container}>
            {/* Camera */}
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                facing="back"
                mute={true}
                onCameraReady={() => setCameraReady(true)}
            />

            {/* Annotated Frame Overlay from Backend */}
            {isActive && metrics?.frame_annotated && (
                <Image
                    source={{ uri: `data:image/jpeg;base64,${metrics.frame_annotated}` }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                    pointerEvents="none"
                />
            )}

            {/* Overlays Container */}
            <View style={[StyleSheet.absoluteFillObject, { paddingBottom: 90, zIndex: 10 }]} pointerEvents="box-none">
                {/* ── Top status bar ── */}
                <View style={styles.statusBar}>
                    <View style={[styles.statusPill, { backgroundColor: connectionStatus?.connected ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.dot, { backgroundColor: connectionStatus?.connected ? '#A7F3D0' : '#FECACA' }]} />
                            <Text style={styles.statusText}>
                                {isOffline
                                    ? ' MODE HORS-LIGNE (TFLite)'
                                    : connectionStatus?.connected
                                        ? ` CONNECTÉ ${connectionStatus.latencyMs ? `${connectionStatus.latencyMs}ms` : ''}`
                                        : ' DÉCONNECTÉ'}
                            </Text>
                        </View>
                    </View>

                    {isActive && (
                        <View style={styles.statusPill}>
                            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
                        </View>
                    )}

                    {/* Show live Victim Classification */}
                    {isActive && metrics?.victim_type && (
                        <View style={[styles.statusPill, { backgroundColor: '#334155' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Feather name="search" size={12} color="#FFFFFF" />
                                <Text style={styles.statusText}>
                                    {metrics.victim_type.toUpperCase()} ({Math.round((metrics.victim_confidence || 0) * 100)}%)
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ── Error banners (from ui_commands) ── */}
                {isActive && metrics?.ui_commands?.length > 0 && (
                    <View style={styles.errorBanner}>
                        {metrics.ui_commands.slice(0, 2).map((cmd, i) => (
                            <View key={i} style={[styles.errorRow, { backgroundColor: `${SEVERITY_COLORS[cmd.severity] || '#EAB308'}EE` }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Feather
                                        name={SEVERITY_ICONS[cmd.severity] || 'info'}
                                        size={14}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.errorSeverity}>{cmd.severity}</Text>
                                </View>
                                <Text style={styles.errorText}>{cmd.text_fr || cmd.text_en}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Positive feedback ── */}
                {isActive && metrics && metrics.errors?.length === 0 && metrics.bpmStatus === 'GOOD' && (
                    <View style={styles.positiveBanner}>
                        <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.positiveText}>
                            {rulesEngine.getPositiveFeedback('good_compression')}
                        </Text>
                    </View>
                )}

                {/* ── Metrics overlay ── */}
                {isActive && metrics?.metrics && (
                    <View style={styles.metricsOverlay}>
                        {/* BPM */}
                        <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                            <Text style={styles.metricValue}>{metrics.metrics.bpm || '--'}</Text>
                            <Text style={styles.metricLabel}>BPM</Text>
                        </View>

                        {/* Compressions */}
                        <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                            <Text style={styles.metricValue}>{metrics.metrics.compression_count || 0}</Text>
                            <Text style={styles.metricLabel}>Comp.</Text>
                        </View>

                        {/* Depth (normalized %) */}
                        <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                            <Text style={styles.metricValue}>{metrics.metrics.depth_torso_pct ? `${Math.round(metrics.metrics.depth_torso_pct)}%` : '--'}</Text>
                            <Text style={styles.metricLabel}>Depth</Text>
                        </View>

                        {/* Recoil */}
                        <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                            <Text style={styles.metricValue}>{metrics.metrics.recoil_quality || '--'}%</Text>
                            <Text style={styles.metricLabel}>Recoil</Text>
                        </View>
                    </View>
                )}


            </View>

            {/* ── Bottom controls ── */}
            <View style={styles.controls}>
                {/* Victim type selector (disabled during active session) */}
                {!isActive && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.victimScroll}>
                        {victimTypes.map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.victimChip, victimType === type && styles.victimChipActive]}
                                onPress={() => {
                                    setVictimType(type);
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Feather
                                        name={VICTIM_ICONS[type] || 'user'}
                                        size={14}
                                        color={victimType === type ? '#FFFFFF' : '#AAA'}
                                    />
                                    <Text style={[styles.victimChipText, victimType === type && styles.victimChipTextActive]}>
                                        {VICTIM_LABELS[type]}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Main button */}
                <TouchableOpacity
                    style={[styles.mainBtn, isActive ? styles.stopBtn : styles.startBtn]}
                    onPress={isActive ? stopCPR : startCPR}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name={isActive ? 'square' : 'play'} size={20} color="#FFFFFF" />
                        <Text style={styles.mainBtnText}>
                            {isActive ? 'ARRÊTER' : 'DÉMARRER CPR'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 30 },
    camera: { flex: 1 },

    // Text
    title: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    subtitle: { color: '#AAA', fontSize: 14, textAlign: 'center', marginBottom: 20 },
    hint: { color: '#666', fontSize: 12, fontFamily: 'monospace', backgroundColor: '#222', padding: 8, borderRadius: 6, marginBottom: 25 },

    // IP Input
    ipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    ipPrefix: { color: '#888', fontSize: 16 },
    ipSuffix: { color: '#888', fontSize: 16 },
    ipInput: { backgroundColor: '#222', color: '#FFF', fontSize: 18, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, minWidth: 160, textAlign: 'center', borderWidth: 1, borderColor: '#444', marginHorizontal: 4 },

    // Buttons
    btnPrimary: { backgroundColor: '#DC2626', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, elevation: 2 },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    // Status bar
    statusBar: { position: 'absolute', top: 50, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between' },
    statusPill: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
    timerText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },

    // Error banners
    errorBanner: { position: 'absolute', top: 95, left: 10, right: 10 },
    errorRow: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 4 },
    errorSeverity: { color: '#FFF', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
    errorText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 4 },

    // Positive banner
    positiveBanner: { position: 'absolute', top: 95, left: 10, right: 10, backgroundColor: 'rgba(34,197,94,0.85)', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    positiveText: { color: '#FFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },

    // Metrics
    metricsOverlay: { position: 'absolute', bottom: 180, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-around' },
    metricCard: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 70, borderLeftWidth: 3 },
    metricValue: { color: '#FFF', fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace' },
    metricLabel: { color: '#AAA', fontSize: 10, marginTop: 2 },

    // Cycle bar
    cycleBar: { position: 'absolute', bottom: 145, left: 15, right: 15 },
    cycleTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
    cycleFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
    cycleText: { color: '#AAA', fontSize: 11, textAlign: 'center', marginTop: 4 },

    // Controls
    controls: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.85)', padding: 15, paddingBottom: 35 },
    victimScroll: { marginBottom: 12 },
    victimChip: { backgroundColor: '#333', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#444' },
    victimChipActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    victimChipText: { color: '#AAA', fontSize: 13, fontWeight: '500' },
    victimChipTextActive: { color: '#FFF', fontWeight: 'bold' },
    mainBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', elevation: 4 },
    startBtn: { backgroundColor: '#DC2626' },
    stopBtn: { backgroundColor: '#555' },
    mainBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
