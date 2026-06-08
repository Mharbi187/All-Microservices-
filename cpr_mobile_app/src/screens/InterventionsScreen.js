/**
 * InterventionsScreen.js
 * =======================
 * Shows real interventions assigned to the logged-in volunteer/responsable.
 * Fetched live from core-service.
 *
 * Endpoints:
 *   GET  /api/v1/interventions/volunteer/{volunteerId}  (volunteer view)
 *   GET  /api/v1/interventions                          (responsable/admin view)
 *   POST /api/v1/interventions/{id}/start
 *   POST /api/v1/interventions/{id}/complete
 */

import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { coreAPI } from '../services/CoreAPIService';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    PLANNED: { color: '#3B82F6', label: 'Planifiée', icon: 'calendar' },
    IN_PROGRESS: { color: '#F59E0B', label: 'En cours', icon: 'activity' },
    COMPLETED: { color: '#10B981', label: 'Terminée', icon: 'check-circle' },
    CANCELLED: { color: '#EF4444', label: 'Annulée', icon: 'x-circle' },
};

const TYPE_ICONS = {
    MEDICAL: 'heart',
    RESCUE: 'shield',
    TRAINING: 'book',
    LOGISTIC: 'truck',
    AWARENESS: 'radio',
};

// ─── Complete intervention modal ──────────────────────────────────────────────
function CompleteModal({ visible, interventionId, onClose, onDone }) {
    const [reportContent, setReportContent] = useState('');
    const [beneficiariesCount, setBeneficiariesCount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleComplete = async () => {
        if (!reportContent.trim()) {
            Alert.alert('Attention', 'Veuillez rédiger un rapport de clôture.');
            return;
        }
        setSubmitting(true);
        try {
            await coreAPI.completeIntervention(
                interventionId,
                reportContent.trim(),
                beneficiariesCount ? parseInt(beneficiariesCount) : null,
            );
            onDone();
        } catch (e) {
            Alert.alert('Erreur', 'Clôture impossible: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Clôturer l'intervention</Text>

                    <Text style={styles.fieldLabel}>Rapport de clôture *</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        multiline
                        numberOfLines={5}
                        value={reportContent}
                        onChangeText={setReportContent}
                        placeholder="Décrivez le déroulement et les actions réalisées..."
                        placeholderTextColor="#6B7280"
                    />

                    <Text style={styles.fieldLabel}>Nombre de bénéficiaires</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={beneficiariesCount}
                        onChangeText={setBeneficiariesCount}
                        placeholder="Ex: 23"
                        placeholderTextColor="#6B7280"
                    />

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleComplete} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#FFF" /> : (
                                <Text style={styles.confirmBtnText}>Terminer</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Single intervention card ─────────────────────────────────────────────────
function InterventionCard({ item, onStart, onComplete }) {
    const [expanded, setExpanded] = useState(false);
    const sc = STATUS_CONFIG[item.status] || { color: '#6B7280', label: item.status || '?', icon: 'circle' };
    const typeIcon = TYPE_ICONS[item.interventionType] || 'alert-circle';

    return (
        <View style={styles.card}>
            <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <View style={[styles.typeIcon, { backgroundColor: sc.color + '22' }]}>
                            <Feather name={typeIcon} size={16} color={sc.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle} numberOfLines={expanded ? 10 : 2}>{item.title}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: sc.color + '22', borderColor: sc.color }]}>
                                <Feather name={sc.icon} size={10} color={sc.color} />
                                <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                            </View>
                        </View>
                    </View>
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.cardBody}>
                    {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}

                    <View style={styles.metaRow}>
                        <Feather name="map-pin" size={12} color="#9CA3AF" />
                        <Text style={styles.metaText}>{item.locationGps || 'Localisation non définie'}</Text>
                    </View>

                    {item.startDatetime && (
                        <View style={styles.metaRow}>
                            <Feather name="clock" size={12} color="#9CA3AF" />
                            <Text style={styles.metaText}>
                                {new Date(item.startDatetime).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                            </Text>
                        </View>
                    )}

                    {item.interventionType && (
                        <View style={styles.metaRow}>
                            <Feather name="tag" size={12} color="#9CA3AF" />
                            <Text style={styles.metaText}>{item.interventionType}</Text>
                        </View>
                    )}

                    {item.status === 'PLANNED' && (
                        <TouchableOpacity style={styles.startBtn} onPress={() => onStart(item.id)}>
                            <Feather name="play" size={14} color="#FFF" />
                            <Text style={styles.startBtnText}>Démarrer l'intervention</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'IN_PROGRESS' && (
                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#10B981' }]} onPress={() => onComplete(item.id)}>
                            <Feather name="check" size={14} color="#FFF" />
                            <Text style={styles.startBtnText}>Clôturer l'intervention</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function InterventionsScreen() {
    const { user } = useAuth();

    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [completeTarget, setCompleteTarget] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');

    const FILTERS = ['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'];

    const load = async () => {
        try {
            let data;
            if (user?.id) {
                data = await coreAPI.fetchMyInterventions(user.id);
            } else {
                data = await coreAPI.fetchAllInterventions();
            }
            setInterventions(Array.isArray(data) ? data : []);
        } catch (e) {
            Alert.alert('Erreur', 'Chargement échoué: ' + e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { load(); }, [user?.id]));

    const handleStart = (id) => {
        Alert.alert('Démarrer', 'Confirmer le démarrage de l\'intervention ?', [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Démarrer', onPress: async () => {
                    try {
                        await coreAPI.startIntervention(id);
                        load();
                    } catch (e) {
                        Alert.alert('Erreur', e.message);
                    }
                }
            }
        ]);
    };

    const handleComplete = (id) => setCompleteTarget(id);
    const handleCompleted = () => { setCompleteTarget(null); load(); };

    const filtered = filterStatus === 'ALL'
        ? interventions
        : interventions.filter(i => i.status === filterStatus);

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Chargement des interventions...</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Filter bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filterStatus === f && styles.filterChipActive]}
                        onPress={() => setFilterStatus(f)}
                    >
                        <Text style={[styles.filterText, filterStatus === f && styles.filterTextActive]}>
                            {f === 'ALL' ? 'Toutes' : STATUS_CONFIG[f]?.label || f}
                            {f !== 'ALL' ? ` (${interventions.filter(i => i.status === f).length})` : ` (${interventions.length})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {filtered.length === 0 ? (
                <View style={styles.center}>
                    <Feather name="shield" size={52} color="#374151" />
                    <Text style={styles.emptyTitle}>Aucune intervention</Text>
                    <Text style={styles.emptySubtitle}>
                        {filterStatus === 'ALL' ? 'Vous n\'avez pas encore d\'interventions assignées.' : `Aucune intervention avec le statut "${STATUS_CONFIG[filterStatus]?.label}".`}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#DC2626" />}
                >
                    {filtered.map(item => (
                        <InterventionCard key={item.id} item={item} onStart={handleStart} onComplete={handleComplete} />
                    ))}
                </ScrollView>
            )}

            <CompleteModal
                visible={!!completeTarget}
                interventionId={completeTarget}
                onClose={() => setCompleteTarget(null)}
                onDone={handleCompleted}
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', padding: 30 },
    loadingText: { color: '#9CA3AF', marginTop: 12 },
    emptyTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: '700', marginTop: 14, textAlign: 'center' },
    emptySubtitle: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },

    filterBar: { backgroundColor: '#1F2937', paddingVertical: 10, flexGrow: 0 },
    filterChip: { backgroundColor: '#374151', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    filterChipActive: { backgroundColor: '#DC2626' },
    filterText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
    filterTextActive: { color: '#FFF' },

    card: { backgroundColor: '#1F2937', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151', overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
    typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '700', marginBottom: 6, flex: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
    statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

    cardBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12 },
    cardDesc: { color: '#D1D5DB', fontSize: 13, lineHeight: 19, marginBottom: 10 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    metaText: { color: '#9CA3AF', fontSize: 12 },

    startBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
    startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#374151' },
    modalTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
    fieldLabel: { color: '#E5E7EB', fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: { backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1, borderRadius: 10, color: '#F9FAFB', fontSize: 15, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14 },
    textarea: { height: 110, textAlignVertical: 'top', paddingTop: 11 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    cancelBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { color: '#D1D5DB', fontWeight: '700', fontSize: 15 },
    confirmBtn: { flex: 2, backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
