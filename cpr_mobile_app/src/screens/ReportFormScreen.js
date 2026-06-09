/**
 * ReportFormScreen.js
 * =====================
 * Allows volunteers and responsables to view their assigned reports from the
 * admin-service, fill them in dynamically, auto-save, and submit.
 *
 * Flow:
 *   1. Fetch list of my reports → GET /api/v1/admin/reports/my
 *   2. Select a pending report → GET /api/v1/admin/reports/{id}
 *   3. Fill the form fields dynamically
 *   4. Auto-save → PUT /api/v1/admin/reports/{id}/data
 *   5. Submit → POST /api/v1/admin/reports/{id}/submit
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, RefreshControl,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { coreAPI } from '../services/CoreAPIService';

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
    DRAFT: { color: '#6B7280', label: 'Brouillon', icon: 'file' },
    SUBMITTED: { color: '#F59E0B', label: 'Soumis', icon: 'clock' },
    VALIDATED: { color: '#3B82F6', label: 'Validé', icon: 'check-circle' },
    FINALIZED: { color: '#10B981', label: 'Finalisé', icon: 'award' },
    ARCHIVED: { color: '#8B5CF6', label: 'Archivé', icon: 'archive' },
};

// ─── Field renderer ───────────────────────────────────────────────────────────
// Handles all TemplateElement types: text_input, textarea, checkbox, radio, date_picker, etc.
function DynamicField({ field, value, onChange, disabled }) {
    const key = field.key || field.id || field.name || '';
    const currentVal = value !== undefined && value !== null ? value : '';

    const renderInput = () => {
        switch (field.type) {
            case 'textarea':
                return (
                    <TextInput
                        style={[styles.input, styles.textarea, disabled && styles.inputDisabled]}
                        value={String(currentVal)}
                        onChangeText={(t) => onChange(key, t)}
                        multiline
                        numberOfLines={4}
                        placeholder={field.placeholder || ''}
                        placeholderTextColor="#6B7280"
                        editable={!disabled}
                    />
                );
            case 'checkbox':
                return (
                    <View style={styles.optionGroup}>
                        {(field.options || []).map((opt) => {
                            const selected = Array.isArray(currentVal)
                                ? currentVal.includes(opt.value || opt.id)
                                : currentVal === (opt.value || opt.id);
                            return (
                                <TouchableOpacity
                                    key={opt.id || opt.value}
                                    style={[styles.optionRow, selected && styles.optionRowActive]}
                                    onPress={() => {
                                        if (disabled) return;
                                        const arr = Array.isArray(currentVal) ? [...currentVal] : [];
                                        const v = opt.value || opt.id;
                                        onChange(key, arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.checkBox, selected && styles.checkBoxActive]}>
                                        {selected && <Feather name="check" size={11} color="#FFF" />}
                                    </View>
                                    <Text style={[styles.optionLabel, selected && styles.optionLabelActive]}>{opt.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );
            case 'radio':
                return (
                    <View style={styles.optionGroup}>
                        {(field.options || []).map((opt) => {
                            const selected = currentVal === (opt.value || opt.id);
                            return (
                                <TouchableOpacity
                                    key={opt.id || opt.value}
                                    style={[styles.optionRow, selected && styles.optionRowActive]}
                                    onPress={() => { if (!disabled) onChange(key, opt.value || opt.id); }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                                        {selected && <View style={styles.radioDot} />}
                                    </View>
                                    <Text style={[styles.optionLabel, selected && styles.optionLabelActive]}>{opt.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );
            case 'date_picker':
                return (
                    <TextInput
                        style={[styles.input, disabled && styles.inputDisabled]}
                        value={String(currentVal)}
                        onChangeText={(t) => onChange(key, t)}
                        placeholder={field.format || 'JJ/MM/AAAA'}
                        placeholderTextColor="#6B7280"
                        keyboardType="numeric"
                        editable={!disabled}
                    />
                );
            case 'number':
                return (
                    <TextInput
                        style={[styles.input, disabled && styles.inputDisabled]}
                        value={String(currentVal)}
                        onChangeText={(t) => onChange(key, t)}
                        placeholder={field.placeholder || ''}
                        placeholderTextColor="#6B7280"
                        keyboardType="numeric"
                        editable={!disabled}
                    />
                );
            default: // text_input and fallback
                return (
                    <TextInput
                        style={[styles.input, disabled && styles.inputDisabled]}
                        value={String(currentVal)}
                        onChangeText={(t) => onChange(key, t)}
                        placeholder={field.placeholder || ''}
                        placeholderTextColor="#6B7280"
                        editable={!disabled}
                    />
                );
        }
    };

    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
                {field.label || key}
                {field.required && <Text style={{ color: '#EF4444' }}> *</Text>}
            </Text>
            {renderInput()}
            {field.description && <Text style={styles.fieldHint}>{field.description}</Text>}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  REPORT LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ReportListView({ onSelect }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            // Fetch both my reports and assigned reports, then merge them
            const [myData, assignedData] = await Promise.all([
                coreAPI.fetchMyReports().catch(() => []),
                coreAPI.fetchAssignedReports().catch(() => [])
            ]);
            
            const myReports = Array.isArray(myData) ? myData : [];
            const assignedReports = Array.isArray(assignedData) ? assignedData : [];
            
            const allReports = [...myReports, ...assignedReports];
            // Remove duplicates by ID in case a report is both created and assigned to the same user
            const uniqueReports = Array.from(new Map(allReports.map(r => [r.id, r])).values());
            
            setReports(uniqueReports);
        } catch (e) {
            Alert.alert('Erreur', 'Impossible de charger vos rapports: ' + e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { load(); }, []));

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Chargement des rapports...</Text>
        </View>
    );

    if (reports.length === 0) return (
        <View style={styles.center}>
            <Feather name="file-text" size={52} color="#374151" />
            <Text style={styles.emptyTitle}>Aucun rapport assigné</Text>
            <Text style={styles.emptySubtitle}>Vous n'avez pas de rapport en attente à remplir.</Text>
        </View>
    );

    return (
        <ScrollView
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#DC2626" />}
        >
            {reports.map((r) => {
                const sc = STATUS_CONFIG[r.workflowStatus] || STATUS_CONFIG.DRAFT;
                const canEdit = r.workflowStatus === 'DRAFT';
                return (
                    <TouchableOpacity
                        key={r.id}
                        style={styles.reportCard}
                        onPress={() => onSelect(r)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.statusBadge, { backgroundColor: sc.color + '22', borderColor: sc.color }]}>
                                <Feather name={sc.icon} size={11} color={sc.color} />
                                <Text style={[styles.statusText, { color: sc.color }]}>{sc.label.toUpperCase()}</Text>
                            </View>
                            <Feather name={canEdit ? 'edit-3' : 'eye'} size={16} color="#9CA3AF" />
                        </View>

                        <Text style={styles.reportTitle} numberOfLines={2}>
                            {r.reportTitle || r.templateTitle || 'Rapport sans titre'}
                        </Text>

                        {r.templateType && (
                            <Text style={styles.reportMeta}>
                                <Feather name="layers" size={11} color="#9CA3AF" /> {r.templateType}
                            </Text>
                        )}

                        <View style={styles.cardFooter}>
                            <Text style={styles.reportDate}>
                                <Feather name="calendar" size={11} color="#6B7280" />
                                {' '}{r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '--'}
                            </Text>
                            <Text style={[styles.actionHint, { color: canEdit ? '#DC2626' : '#6B7280' }]}>
                                {canEdit ? 'Remplir →' : 'Voir →'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  REPORT FORM VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ReportFormView({ reportSummary, onBack }) {
    const [report, setReport] = useState(null);
    const [filledData, setFilledData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [autoSaveTimer, setAutoSaveTimer] = useState(null);

    const isReadOnly = reportSummary.workflowStatus !== 'DRAFT';

    useEffect(() => {
        (async () => {
            try {
                const full = await coreAPI.fetchReportById(reportSummary.id);
                setReport(full);
                
                let data = full.filledData || {};
                if (typeof data === 'string') {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        data = {};
                    }
                }
                setFilledData(data);
            } catch (e) {
                Alert.alert('Erreur', 'Impossible de charger le rapport: ' + e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [reportSummary.id]);

    // Auto-save after 2s of inactivity
    const handleFieldChange = (key, val) => {
        const updated = { ...filledData, [key]: val };
        setFilledData(updated);
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        const t = setTimeout(() => autoSave(updated), 2000);
        setAutoSaveTimer(t);
    };

    const autoSave = async (data) => {
        if (isReadOnly) return;
        try {
            setSaving(true);
            await coreAPI.updateReportData(reportSummary.id, data);
        } catch (e) {
            console.warn('[AutoSave]', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = () => {
        Alert.alert(
            'Soumettre le rapport',
            'Une fois soumis, vous ne pourrez plus modifier ce rapport. Continuer ?',
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Soumettre', style: 'default', onPress: () => doSubmit() },
            ]
        );
    };

    const doSubmit = async () => {
        setSubmitting(true);
        try {
            // Save latest data first, then submit
            await coreAPI.updateReportData(reportSummary.id, filledData);
            await coreAPI.submitReport(reportSummary.id);
            Alert.alert('✅ Rapport soumis', 'Votre rapport a été soumis avec succès.', [
                { text: 'OK', onPress: onBack }
            ]);
        } catch (e) {
            Alert.alert('Erreur', 'La soumission a échoué: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#DC2626" />
        </View>
    );

    // Extract fillable fields from the pinned TemplateVersion structure.
    // The backend stores structure as TemplateElement[] (id, type, props).
    // We filter to input-type elements and map props into field descriptors.
    const FILLABLE_TYPES = ['text_input', 'textarea', 'checkbox', 'radio', 'date_picker', 'number'];
    let rawElements = report?.templateVersion?.structure
        || report?.template?.structure
        || [];

    if (typeof rawElements === 'string') {
        try {
            rawElements = JSON.parse(rawElements);
        } catch (e) {
            rawElements = [];
        }
    }

    const fields = Array.isArray(rawElements)
        ? rawElements
            .filter(el => FILLABLE_TYPES.includes(el.type))
            .map(el => ({
                key: el.id,
                id: el.id,
                type: el.type,
                label: el.props?.label || el.id,
                placeholder: el.props?.placeholder || '',
                required: el.props?.required || false,
                description: el.props?.description || '',
                options: el.props?.options || [],
                format: el.props?.format || '',
            }))
        : [];

    const sc = STATUS_CONFIG[report?.workflowStatus] || STATUS_CONFIG.DRAFT;

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
                {/* Header */}
                <View style={styles.formHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: sc.color + '22', borderColor: sc.color, alignSelf: 'flex-start' }]}>
                        <Feather name={sc.icon} size={11} color={sc.color} />
                        <Text style={[styles.statusText, { color: sc.color }]}>{sc.label.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.formTitle}>{report?.reportTitle || 'Rapport'}</Text>
                    {report?.templateType && <Text style={styles.formMeta}>Type: {report.templateType}</Text>}
                    {saving && <Text style={styles.autoSaveText}>💾 Sauvegarde auto...</Text>}
                    {isReadOnly && (
                        <View style={styles.readOnlyBanner}>
                            <Feather name="lock" size={13} color="#F59E0B" />
                            <Text style={styles.readOnlyText}>Rapport en lecture seule</Text>
                        </View>
                    )}
                </View>

                {/* Dynamic Fields */}
                {fields.length > 0 ? (
                    fields.map((field, i) => (
                        <DynamicField
                            key={field.key || field.id || i}
                            field={field}
                            value={filledData[field.key || field.id || field.name]}
                            onChange={handleFieldChange}
                            disabled={isReadOnly}
                        />
                    ))
                ) : (
                    /* Fallback: show raw filledData keys */
                    Object.entries(filledData).length > 0 ? (
                        Object.entries(filledData).map(([k, v]) => (
                            <DynamicField
                                key={k}
                                field={{ key: k, label: k, type: 'text' }}
                                value={v}
                                onChange={handleFieldChange}
                                disabled={isReadOnly}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyFields}>
                            <Feather name="file-plus" size={36} color="#374151" />
                            <Text style={styles.emptyTitle}>Formulaire vide</Text>
                            <Text style={styles.emptySubtitle}>Ce rapport n'a pas de champs définis dans son modèle.</Text>
                        </View>
                    )
                )}
            </ScrollView>

            {/* Submit Button */}
            {!isReadOnly && (
                <View style={styles.submitBar}>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                        {submitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Feather name="send" size={17} color="#FFF" />
                                <Text style={styles.submitBtnText}>Soumettre le rapport</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ReportFormScreen({ navigation }) {
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        navigation.setOptions({
            title: selectedReport ? 'Remplir le rapport' : 'Mes Rapports',
            headerLeft: selectedReport
                ? () => (
                    <TouchableOpacity onPress={() => setSelectedReport(null)} style={{ paddingLeft: 8 }}>
                        <Feather name="arrow-left" size={22} color="#FFF" />
                    </TouchableOpacity>
                )
                : undefined,
        });
    }, [selectedReport]);

    if (selectedReport) {
        return <ReportFormView reportSummary={selectedReport} onBack={() => setSelectedReport(null)} />;
    }
    return <ReportListView onSelect={setSelectedReport} />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', padding: 30 },
    loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },

    listContainer: { padding: 16, paddingBottom: 40 },
    reportCard: {
        backgroundColor: '#1F2937', borderRadius: 14, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#374151',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    reportTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    reportMeta: { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    reportDate: { color: '#6B7280', fontSize: 12 },
    actionHint: { fontSize: 13, fontWeight: '700' },

    emptyTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: '700', marginTop: 14, textAlign: 'center' },
    emptySubtitle: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    emptyFields: { alignItems: 'center', marginTop: 40, padding: 20 },

    formScroll: { flex: 1, backgroundColor: '#111' },
    formContent: { padding: 16, paddingBottom: 100 },
    formHeader: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#374151' },
    formTitle: { color: '#F9FAFB', fontSize: 20, fontWeight: '700', marginTop: 10, marginBottom: 4 },
    formMeta: { color: '#9CA3AF', fontSize: 13, marginBottom: 8 },
    autoSaveText: { color: '#60A5FA', fontSize: 12, marginTop: 8 },
    readOnlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B22', padding: 8, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#F59E0B44' },
    readOnlyText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' },

    fieldContainer: { marginBottom: 18 },
    fieldLabel: { color: '#E5E7EB', fontSize: 14, fontWeight: '600', marginBottom: 6 },
    fieldHint: { color: '#6B7280', fontSize: 11, marginTop: 4 },
    input: {
        backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1,
        borderRadius: 10, color: '#F9FAFB', fontSize: 15, paddingHorizontal: 14, paddingVertical: 11,
    },
    textarea: { height: 110, textAlignVertical: 'top', paddingTop: 11 },
    inputDisabled: { backgroundColor: '#111827', color: '#6B7280' },

    // Option groups (checkbox & radio)
    optionGroup: { gap: 8 },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151',
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    },
    optionRowActive: { borderColor: '#DC2626', backgroundColor: '#DC262611' },
    optionLabel: { color: '#9CA3AF', fontSize: 14, flex: 1 },
    optionLabelActive: { color: '#F9FAFB', fontWeight: '600' },
    // Checkbox
    checkBox: {
        width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#4B5563',
        alignItems: 'center', justifyContent: 'center',
    },
    checkBoxActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    // Radio
    radioCircle: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#4B5563',
        alignItems: 'center', justifyContent: 'center',
    },
    radioCircleActive: { borderColor: '#DC2626' },
    radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#DC2626' },

    submitBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(17,17,17,0.96)', padding: 16, paddingBottom: 30,
        borderTopWidth: 1, borderTopColor: '#374151',
    },
    submitBtn: {
        backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
