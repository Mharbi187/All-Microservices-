/**
 * Sélecteur de Type de Victime
 * Modal pour choisir le protocole CPR approprié
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions
} from 'react-native';
import { MEDICAL_PROTOCOLS } from '../services/CPRAnalysisService';

const { width, height } = Dimensions.get('window');

export default function VictimTypeSelector({
    currentProtocol,
    onSelect,
    onClose,
    rescuerCount
}) {
    const protocols = Object.entries(MEDICAL_PROTOCOLS);

    const getCompressionInfo = (protocol) => {
        if (rescuerCount === 2 && protocol.compressionRatio) {
            return `${protocol.compressionRatio}:${protocol.ventilationRatio}`;
        }
        const ratio = protocol.compressionRatioSingle || protocol.compressionRatio;
        return `${ratio}:${protocol.ventilationRatio}`;
    };

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Type de Victime</Text>
                        <Text style={styles.titleAr}>نوع الضحية</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Liste des protocoles */}
                    <ScrollView style={styles.scrollView}>
                        {protocols.map(([id, protocol]) => (
                            <TouchableOpacity
                                key={id}
                                style={[
                                    styles.protocolCard,
                                    currentProtocol === id && styles.protocolCardSelected
                                ]}
                                onPress={() => onSelect(id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.iconContainer}>
                                    <Text style={styles.protocolIcon}>{protocol.icon}</Text>
                                </View>

                                <View style={styles.protocolInfo}>
                                    <Text style={styles.protocolName}>{protocol.name}</Text>
                                    <Text style={styles.protocolNameAr}>{protocol.nameAr}</Text>

                                    <View style={styles.protocolDetails}>
                                        <View style={styles.detailBadge}>
                                            <Text style={styles.detailText}>
                                                {getCompressionInfo(protocol)}
                                            </Text>
                                        </View>
                                        <View style={styles.detailBadge}>
                                            <Text style={styles.detailText}>
                                                {protocol.minBPM}-{protocol.maxBPM} BPM
                                            </Text>
                                        </View>
                                        <View style={styles.detailBadge}>
                                            <Text style={styles.detailText}>
                                                {protocol.minDepthCm}-{protocol.maxDepthCm} cm
                                            </Text>
                                        </View>
                                    </View>

                                    {protocol.specialWarning && (
                                        <View style={styles.warningBadge}>
                                            <Text style={styles.warningText}>
                                                ⚠️ {protocol.specialWarning}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {currentProtocol === id && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Info secouristes */}
                    <View style={styles.rescuerInfo}>
                        <Text style={styles.rescuerInfoText}>
                            {rescuerCount === 1
                                ? '👤 Mode 1 secouriste - Ratio 30:2 pour adultes'
                                : '👥 Mode 2 secouristes - Ratio 15:2 pour enfants/nourrissons'
                            }
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.85,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        position: 'relative',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    titleAr: {
        fontSize: 14,
        color: '#94A3B8',
        marginLeft: 8,
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        color: '#FFF',
        fontSize: 16,
    },
    scrollView: {
        padding: 16,
    },
    protocolCard: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    protocolCardSelected: {
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    protocolIcon: {
        fontSize: 28,
    },
    protocolInfo: {
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
    protocolDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 6,
    },
    detailBadge: {
        backgroundColor: '#334155',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    detailText: {
        color: '#94A3B8',
        fontSize: 11,
    },
    warningBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 8,
    },
    warningText: {
        color: '#F59E0B',
        fontSize: 11,
    },
    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    rescuerInfo: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        backgroundColor: '#0F172A',
    },
    rescuerInfoText: {
        color: '#64748B',
        fontSize: 13,
        textAlign: 'center',
    },
});
