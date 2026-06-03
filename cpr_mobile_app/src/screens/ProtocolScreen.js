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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { MEDICAL_PROTOCOLS } from '../services/MedicalProtocols';

const { width } = Dimensions.get('window');

// Map emoji protocols to feather icons
const PROTOCOL_ICONS = {
    adult_cpr: 'user',
    child_cpr: 'user-minus',
    infant_cpr: 'users', // using users for infant
    choking_adult: 'alert-octagon',
    choking_infant: 'alert-triangle'
};

export default function ProtocolScreen() {
    const [expandedProtocol, setExpandedProtocol] = useState(null);

    const toggleExpand = (id) => {
        setExpandedProtocol(expandedProtocol === id ? null : id);
    };

    const protocols = Object.entries(MEDICAL_PROTOCOLS);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <Feather name="clipboard" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
                        <Text style={styles.title}>Guide des Protocoles</Text>
                    </View>
                    <Text style={styles.subtitle}>دليل البروتوكولات</Text>
                    <Text style={styles.reference}>
                        Conforme aux directives Croissant-Rouge / Croix-Rouge 2021
                    </Text>
                </View>

                {/* Rappel Chaîne de Survie */}
                <View style={styles.survivalChain}>
                    <View style={styles.chainTitleRow}>
                        <Feather name="link" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.chainTitle}>Chaîne de Survie</Text>
                    </View>
                    <View style={styles.chainSteps}>
                        <View style={styles.chainStep}>
                            <Text style={styles.chainNumber}>1</Text>
                            <Text style={styles.chainText}>Sécurité</Text>
                        </View>
                        <Feather name="arrow-right" size={16} color="#64748B" style={styles.chainArrow} />
                        <View style={styles.chainStep}>
                            <Text style={styles.chainNumber}>2</Text>
                            <Text style={styles.chainText}>Conscience</Text>
                        </View>
                        <Feather name="arrow-right" size={16} color="#64748B" style={styles.chainArrow} />
                        <View style={styles.chainStep}>
                            <Text style={styles.chainNumber}>3</Text>
                            <Text style={styles.chainText}>Appeler 190</Text>
                        </View>
                        <Feather name="arrow-right" size={16} color="#64748B" style={styles.chainArrow} />
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
                                <View style={styles.protocolIconWrap}>
                                    <Feather name={PROTOCOL_ICONS[id] || 'file'} size={22} color="#DC2626" />
                                </View>
                                <View style={styles.protocolTitleContainer}>
                                    <Text style={styles.protocolName}>{protocol.name}</Text>
                                    <Text style={styles.protocolNameAr}>{protocol.nameAr}</Text>
                                </View>
                            </View>
                            <Feather
                                name={expandedProtocol === id ? 'chevron-down' : 'chevron-right'}
                                size={20}
                                color="#64748B"
                            />
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
                                        <Feather name="alert-circle" size={16} color="#60A5FA" style={{ marginRight: 6, marginTop: 1 }} />
                                        <Text style={styles.specialNoteText}>
                                            {protocol.initialVentilations} insufflations initiales AVANT les compressions
                                        </Text>
                                    </View>
                                )}

                                {protocol.specialWarning && (
                                    <View style={styles.warningNote}>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                            <Feather name="alert-triangle" size={16} color="#F87171" style={{ marginRight: 6, marginTop: 1 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.warningNoteText}>
                                                    {protocol.specialWarning}
                                                </Text>
                                                {protocol.specialWarningAr && (
                                                    <Text style={styles.warningNoteTextAr}>
                                                        {protocol.specialWarningAr}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                ))}

                {/* Rappels importants */}
                <View style={styles.reminders}>
                    <View style={styles.remindersTitleRow}>
                        <Feather name="zap" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                        <Text style={styles.remindersTitle}>Rappels Essentiels</Text>
                    </View>

                    <View style={styles.reminderItem}>
                        <Feather name="check" size={16} color="#22C55E" style={styles.reminderBullet} />
                        <Text style={styles.reminderText}>
                            Poussez FORT (5-6 cm) et VITE (100-120/min)
                        </Text>
                    </View>

                    <View style={styles.reminderItem}>
                        <Feather name="check" size={16} color="#22C55E" style={styles.reminderBullet} />
                        <Text style={styles.reminderText}>
                            Laissez le thorax remonter COMPLÈTEMENT entre les compressions
                        </Text>
                    </View>

                    <View style={styles.reminderItem}>
                        <Feather name="check" size={16} color="#22C55E" style={styles.reminderBullet} />
                        <Text style={styles.reminderText}>
                            Minimisez les interruptions (max 10 secondes)
                        </Text>
                    </View>

                    <View style={styles.reminderItem}>
                        <Feather name="check" size={16} color="#22C55E" style={styles.reminderBullet} />
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
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
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
    chainTitleRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    chainTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
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
        flex: 1,
    },
    protocolIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
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
        textAlign: 'left', // Ensure proper alignment for UI
    },
    quickInfo: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 8,
    },
    infoBadge: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: '#64748B',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    detailLabel: {
        color: '#94A3B8',
        fontSize: 13,
        width: 80,
    },
    detailValue: {
        color: '#F8FAFC',
        fontSize: 13,
        flex: 1,
        lineHeight: 20,
    },
    detailValueAr: {
        color: '#F8FAFC',
        fontSize: 13,
        flex: 1,
        textAlign: 'right',
        lineHeight: 20,
    },
    specialNote: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    specialNoteText: {
        color: '#60A5FA',
        fontSize: 13,
        flex: 1,
        lineHeight: 20,
    },
    warningNote: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    warningNoteText: {
        color: '#F87171',
        fontSize: 13,
        fontWeight: 'bold',
        lineHeight: 20,
    },
    warningNoteTextAr: {
        color: '#F87171',
        fontSize: 13,
        textAlign: 'right',
        marginTop: 6,
        lineHeight: 20,
    },
    reminders: {
        backgroundColor: '#1E293B',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    remindersTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    remindersTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    reminderItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    reminderBullet: {
        marginRight: 10,
        marginTop: 1,
    },
    reminderText: {
        color: '#CBD5E1',
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
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
