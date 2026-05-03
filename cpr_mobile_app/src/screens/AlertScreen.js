/**
 * AlertScreen - Envoi d'alerte au chef d'équipe
 * Réclamations et signalements urgents
 * Croissant Rouge Tunisien
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { mockDataService } from '../services/MockDataService';

const ALERT_TYPES = [
    { id: 'urgence', label: 'Situation d\'urgence', icon: '🚨', color: '#DC2626', desc: 'Incident grave nécessitant intervention immédiate' },
    { id: 'medical', label: 'Urgence médicale', icon: '🏥', color: '#EF4444', desc: 'Blessé grave ou situation médicale critique' },
    { id: 'securite', label: 'Problème de sécurité', icon: '🦺', color: '#F59E0B', desc: 'Risque pour l\'équipe ou les bénévoles' },
    { id: 'logistique', label: 'Problème logistique', icon: '📦', color: '#3B82F6', desc: 'Matériel manquant ou défectueux' },
    { id: 'reclamation', label: 'Réclamation', icon: '📝', color: '#7C3AED', desc: 'Signalement d\'une situation problématique' },
    { id: 'info', label: 'Information', icon: '📢', color: '#6B7280', desc: 'Information à transmettre au responsable' },
];

const PRIORITY_LEVELS = [
    { id: 'critical', label: 'Critique', color: '#DC2626', icon: '🔴' },
    { id: 'high', label: 'Élevée', color: '#F59E0B', icon: '🟡' },
    { id: 'normal', label: 'Normale', color: '#3B82F6', icon: '🔵' },
];

export default function AlertScreen({ navigation }) {
    const { user } = useAuth();
    const [alertType, setAlertType] = useState(null);
    const [priority, setPriority] = useState('high');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [location, setLocation] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [sentRef, setSentRef] = useState('');
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    const handleSend = async () => {
        if (!alertType) {
            Alert.alert('Champ requis', 'Veuillez sélectionner le type d\'alerte.');
            return;
        }
        if (!subject.trim()) {
            Alert.alert('Champ requis', 'Veuillez saisir un objet.');
            return;
        }
        if (!message.trim() || message.trim().length < 10) {
            Alert.alert('Message insuffisant', 'Décrivez la situation en au moins 10 caractères.');
            return;
        }

        Alert.alert(
            'Confirmer l\'envoi',
            `Envoyer une alerte "${ALERT_TYPES.find((t) => t.id === alertType)?.label}" à votre chef d'équipe ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Envoyer',
                    style: 'destructive',
                    onPress: doSend,
                },
            ]
        );
    };

    const doSend = async () => {
        setSending(true);
        try {
            const result = await mockDataService.sendAlert({
                type: alertType,
                priority,
                subject: subject.trim(),
                message: message.trim(),
                location: location.trim(),
                sender: user,
            });
            setSentRef(result.ref);
            setSuccess(true);
            setHistory((prev) => [result, ...prev]);
            // Reset
            setAlertType(null);
            setSubject('');
            setMessage('');
            setLocation('');
            setPriority('high');
        } catch {
            Alert.alert('Erreur', 'Impossible d\'envoyer l\'alerte. Réessayez.');
        } finally {
            setSending(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Info banner */}
                    <View style={styles.infoBanner}>
                        <Text style={styles.infoBannerIcon}>📡</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoBannerTitle}>Alerte Chef d'Équipe</Text>
                            <Text style={styles.infoBannerSub}>
                                Votre alerte sera transmise directement à {'\n'}
                                votre responsable immédiat.
                            </Text>
                        </View>
                    </View>

                    {/* Type d'alerte */}
                    <Text style={styles.fieldLabel}>Type d'alerte *</Text>
                    <View style={styles.typeGrid}>
                        {ALERT_TYPES.map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                style={[
                                    styles.typeCard,
                                    alertType === t.id && { borderColor: t.color, backgroundColor: t.color + '10' },
                                ]}
                                onPress={() => setAlertType(t.id)}
                            >
                                <Text style={styles.typeIcon}>{t.icon}</Text>
                                <Text
                                    style={[
                                        styles.typeLabel,
                                        alertType === t.id && { color: t.color },
                                    ]}
                                >
                                    {t.label}
                                </Text>
                                <Text style={styles.typeDesc}>{t.desc}</Text>
                                {alertType === t.id && (
                                    <View style={[styles.typeCheck, { backgroundColor: t.color }]}>
                                        <Text style={styles.typeCheckText}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Priorité */}
                    <Text style={styles.fieldLabel}>Niveau de priorité *</Text>
                    <View style={styles.prioRow}>
                        {PRIORITY_LEVELS.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={[
                                    styles.prioBtn,
                                    priority === p.id && { backgroundColor: p.color, borderColor: p.color },
                                ]}
                                onPress={() => setPriority(p.id)}
                            >
                                <Text style={styles.prioIcon}>{p.icon}</Text>
                                <Text
                                    style={[
                                        styles.prioLabel,
                                        priority === p.id && { color: '#FFFFFF' },
                                    ]}
                                >
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Objet */}
                    <Text style={styles.fieldLabel}>Objet *</Text>
                    <TextInput
                        style={styles.inputField}
                        placeholder="Résumez la situation en quelques mots..."
                        placeholderTextColor="#9CA3AF"
                        value={subject}
                        onChangeText={setSubject}
                        maxLength={100}
                    />

                    {/* Localisation */}
                    <Text style={styles.fieldLabel}>Localisation (optionnel)</Text>
                    <TextInput
                        style={styles.inputField}
                        placeholder="Lieu, adresse, zone..."
                        placeholderTextColor="#9CA3AF"
                        value={location}
                        onChangeText={setLocation}
                        maxLength={100}
                    />

                    {/* Message */}
                    <Text style={styles.fieldLabel}>Description détaillée *</Text>
                    <TextInput
                        style={[styles.inputField, styles.textarea]}
                        placeholder="Décrivez la situation, les personnes impliquées, les besoins immédiats..."
                        placeholderTextColor="#9CA3AF"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{message.length}/500</Text>

                    {/* Infos expéditeur */}
                    <View style={styles.senderInfo}>
                        <Text style={styles.senderTitle}>📤  Envoyé par</Text>
                        <Text style={styles.senderName}>
                            {user?.prenom} {user?.nom} — {user?.matricule}
                        </Text>
                        <Text style={styles.senderRole}>
                            {user?.delegation}
                        </Text>
                    </View>

                    {/* Bouton envoi */}
                    <TouchableOpacity
                        style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={sending}
                        activeOpacity={0.85}
                    >
                        {sending ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.sendBtnText}>🚀  Envoyer l'alerte</Text>
                        )}
                    </TouchableOpacity>

                    {/* Historique des alertes envoyées */}
                    {history.length > 0 && (
                        <TouchableOpacity
                            style={styles.historyBtn}
                            onPress={() => setShowHistory(true)}
                        >
                            <Text style={styles.historyBtnText}>
                                📋  Historique ({history.length} alerte{history.length > 1 ? 's' : ''})
                            </Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 20 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal succès */}
            <Modal visible={success} animationType="fade" transparent>
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        <Text style={styles.successIcon}>✅</Text>
                        <Text style={styles.successTitle}>Alerte envoyée !</Text>
                        <Text style={styles.successRef}>Référence : #{sentRef}</Text>
                        <Text style={styles.successMsg}>
                            Votre chef d'équipe a été notifié.{'\n'}
                            Gardez votre téléphone à portée pour une réponse.
                        </Text>
                        <TouchableOpacity
                            style={styles.successBtn}
                            onPress={() => setSuccess(false)}
                        >
                            <Text style={styles.successBtnText}>OK, compris</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal historique */}
            <Modal visible={showHistory} animationType="slide" transparent onRequestClose={() => setShowHistory(false)}>
                <View style={styles.historyOverlay}>
                    <View style={styles.historySheet}>
                        <View style={styles.historyHandle} />
                        <Text style={styles.historyTitle}>📋  Alertes Envoyées</Text>
                        <ScrollView>
                            {history.map((h) => (
                                <View key={h.ref} style={styles.historyItem}>
                                    <Text style={styles.historyItemRef}>#{h.ref}</Text>
                                    <Text style={styles.historyItemSubject}>{h.subject}</Text>
                                    <Text style={styles.historyItemTime}>
                                        {new Date(h.sentAt).toLocaleString('fr-FR')}
                                    </Text>
                                    <View style={[styles.historyItemStatus, { backgroundColor: '#ECFDF5' }]}>
                                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>
                                            Transmise
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.historyCloseBtn} onPress={() => setShowHistory(false)}>
                            <Text style={styles.historyCloseBtnText}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { padding: 16 },

    infoBanner: {
        backgroundColor: '#FEE2E2',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    infoBannerIcon: { fontSize: 28 },
    infoBannerTitle: { fontSize: 15, fontWeight: '800', color: '#991B1B' },
    infoBannerSub: { fontSize: 12, color: '#B91C1C', lineHeight: 18, marginTop: 2 },

    fieldLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 10,
        marginTop: 4,
    },

    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    typeCard: {
        width: '47%',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        position: 'relative',
    },
    typeIcon: { fontSize: 24, marginBottom: 6 },
    typeLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
    typeDesc: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
    typeCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeCheckText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

    prioRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    prioBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 12,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    prioIcon: { fontSize: 14 },
    prioLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },

    inputField: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
        marginBottom: 16,
    },
    textarea: { height: 120, paddingTop: 12, marginBottom: 4 },
    charCount: { fontSize: 11, color: '#9CA3AF', alignSelf: 'flex-end', marginBottom: 16 },

    senderInfo: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    senderTitle: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    senderName: { fontSize: 14, fontWeight: '700', color: '#111827' },
    senderRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },

    sendBtn: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        marginBottom: 12,
    },
    sendBtnDisabled: { opacity: 0.6, elevation: 0 },
    sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

    historyBtn: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    historyBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },

    // Modal succès
    successOverlay: {
        flex: 1,
        backgroundColor: '#00000080',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    successCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        width: '100%',
    },
    successIcon: { fontSize: 56, marginBottom: 12 },
    successTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    successRef: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    successMsg: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        marginTop: 12,
        marginBottom: 20,
    },
    successBtn: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 40,
    },
    successBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

    // Modal historique
    historyOverlay: {
        flex: 1,
        backgroundColor: '#00000066',
        justifyContent: 'flex-end',
    },
    historySheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '70%',
    },
    historyHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    historyTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
    historyItem: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    historyItemRef: { fontSize: 11, color: '#9CA3AF' },
    historyItemSubject: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },
    historyItemTime: { fontSize: 11, color: '#6B7280', marginTop: 4 },
    historyItemStatus: {
        alignSelf: 'flex-start',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 6,
    },
    historyCloseBtn: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    historyCloseBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
});
