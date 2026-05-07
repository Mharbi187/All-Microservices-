/**
 * Écran des Protocoles CPR
 * Guide de référence rapide pour tous les scénarios
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { MEDICAL_PROTOCOLS } from '../services/MedicalProtocols';

const { width } = Dimensions.get('window');

export default function ProtocolScreen() {
    const [expandedProtocol, setExpandedProtocol] = useState(null);

    const toggleExpand = (id) => {
        setExpandedProtocol(expandedProtocol === id ? null : id);
    };

    const protocols = Object.entries(MEDICAL_PROTOCOLS);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>📋 Guide des Protocoles</Text>
                    <Text style={styles.subtitle}>دليل البروتوكولات</Text>
                    <Text style={styles.reference}>
                        Conforme aux directives Croissant-Rouge / Croix-Rouge 2021
                    </Text>
                </View>

                {/* Rappel Chaîne de Survie */}
                <View style={styles.survivalChain}>
                    <Text style={styles.chainTitle}>🔗 Chaîne de Survie</Text>
                    <View style={styles.chainSteps}>
                        <View style={styles.chainStep}>
                            <Text style={styles.chainNumber}>1</Text>
                            <Text style={styles.chainText}>Sécurité</Text>
                        </View>
                        <Text style={styles.chainArrow}>→</Text>
                        <View style={styles.chainStep}>
                            <Text style={styles.chainNumber}>2</Text>
                            <Text style={styles.chainText}>Conscience</Text>
                        </View>
                        <Text style={styles.chainArrow}>→</Text>
                        <View style={styles.chainStep}>
                            <Text style={styles.chainNumber}>3</Text>
                            <Text style={styles.chainText}>Appeler 190</Text>
                        </View>
                        <Text style={styles.chainArrow}>→</Text>
                        <View style={styles.chainStep}>
                            <Text style={styles.chainNumber}>4</Text>
                            <Text style={styles.chainText}>RCP</Text>
                        </View>
                    </View>
                </View>

                {/* Liste des protocoles */}
                {protocols.map(([id, protocol]) => (
                    <TouchableOpacity
                        key={id}
                        style={styles.protocolCard}
                        onPress={() => toggleExpand(id)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.protocolHeader}>
                            <View style={styles.protocolTitleRow}>
                                <Text style={styles.protocolIcon}>{protocol.icon}</Text>
                                <View style={styles.protocolTitleContainer}>
                                    <Text style={styles.protocolName}>{protocol.name}</Text>
                                    <Text style={styles.protocolNameAr}>{protocol.nameAr}</Text>
                                </View>
                            </View>
                            <Text style={styles.expandIcon}>
                                {expandedProtocol === id ? '▼' : '▶'}
                            </Text>
                        </View>

                        {/* Résumé rapide */}
                        <View style={styles.quickInfo}>
                            <View style={styles.infoBadge}>
                                <Text style={styles.infoLabel}>Ratio</Text>
                                <Text style={styles.infoValue}>
                                    {protocol.compressionRatio}:{protocol.ventilationRatio}
                                </Text>
                            </View>
                            <View style={styles.infoBadge}>
                                <Text style={styles.infoLabel}>BPM</Text>
                                <Text style={styles.infoValue}>
                                    {protocol.minBPM}-{protocol.maxBPM}
                                </Text>
                            </View>
                            <View style={styles.infoBadge}>
                                <Text style={styles.infoLabel}>Profondeur</Text>
                                <Text style={styles.infoValue}>
                                    {protocol.minDepthCm}-{protocol.maxDepthCm} cm
                                </Text>
                            </View>
                        </View>

                        {/* Détails étendus */}
                        {expandedProtocol === id && (
                            <View style={styles.expandedContent}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Technique:</Text>
                                    <Text style={styles.detailValue}>{protocol.techniqueDesc}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>التقنية:</Text>
                                    <Text style={styles.detailValueAr}>{protocol.techniqueDescAr}</Text>
                                </View>

                                {protocol.initialVentilations && (
                                    <View style={styles.specialNote}>
                                        <Text style={styles.specialNoteText}>
                                            ⚠️ {protocol.initialVentilations} insufflations initiales AVANT les compressions
                                        </Text>
                                    </View>
                                )}

                                {protocol.specialWarning && (
                                    <View style={styles.warningNote}>
                                        <Text style={styles.warningNoteText}>
                                            🚨 {protocol.specialWarning}
                                        </Text>
                                        {protocol.specialWarningAr && (
                                            <Text style={styles.warningNoteTextAr}>
                                                {protocol.specialWarningAr}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                ))}

                {/* Rappels importants */}
                <View style={styles.reminders}>
                    <Text style={styles.remindersTitle}>💡 Rappels Essentiels</Text>

                    <View style={styles.reminderItem}>
                        <Text style={styles.reminderBullet}>•</Text>
                        <Text style={styles.reminderText}>
                            Poussez FORT (5-6 cm) et VITE (100-120/min)
                        </Text>
                    </View>

                    <View style={styles.reminderItem}>
                        <Text style={styles.reminderBullet}>•</Text>
                        <Text style={styles.reminderText}>
                            Laissez le thorax remonter COMPLÈTEMENT entre les compressions
                        </Text>
                    </View>

                    <View style={styles.reminderItem}>
                        <Text style={styles.reminderBullet}>•</Text>
                        <Text style={styles.reminderText}>
                            Minimisez les interruptions (max 10 secondes)
                        </Text>
                    </View>

                    <View style={styles.reminderItem}>
                        <Text style={styles.reminderBullet}>•</Text>
                        <Text style={styles.reminderText}>
                            Alternez les secouristes toutes les 2 minutes si possible
                        </Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Source: FICR, AHA/ERC Guidelines 2021
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 4,
    },
    reference: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 8,
        textAlign: 'center',
    },
    survivalChain: {
        backgroundColor: '#1E293B',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    chainTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    chainSteps: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    chainStep: {
        alignItems: 'center',
    },
    chainNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#DC2626',
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 28,
        overflow: 'hidden',
    },
    chainText: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 4,
    },
    chainArrow: {
        color: '#64748B',
        fontSize: 16,
        marginHorizontal: 8,
    },
    protocolCard: {
        backgroundColor: '#1E293B',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
    },
    protocolHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    protocolTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    protocolIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    protocolTitleContainer: {
        flex: 1,
    },
    protocolName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    protocolNameAr: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'right',
    },
    expandIcon: {
        fontSize: 14,
        color: '#64748B',
    },
    quickInfo: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    infoBadge: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        color: '#64748B',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 2,
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    detailLabel: {
        color: '#94A3B8',
        fontSize: 13,
        width: 80,
    },
    detailValue: {
        color: '#FFFFFF',
        fontSize: 13,
        flex: 1,
    },
    detailValueAr: {
        color: '#FFFFFF',
        fontSize: 13,
        flex: 1,
        textAlign: 'right',
    },
    specialNote: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    specialNoteText: {
        color: '#60A5FA',
        fontSize: 13,
    },
    warningNote: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    warningNoteText: {
        color: '#F87171',
        fontSize: 13,
        fontWeight: 'bold',
    },
    warningNoteTextAr: {
        color: '#F87171',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    reminders: {
        backgroundColor: '#1E293B',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    remindersTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    reminderItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    reminderBullet: {
        color: '#22C55E',
        fontSize: 16,
        marginRight: 8,
    },
    reminderText: {
        color: '#94A3B8',
        fontSize: 13,
        flex: 1,
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#64748B',
        fontSize: 11,
    },
});
