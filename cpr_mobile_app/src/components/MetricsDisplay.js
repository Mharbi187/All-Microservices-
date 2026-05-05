/**
 * Metrics Display Component
 * ==========================
 * Displays real-time CPR metrics from the pipeline.
 * Driven by data from RulesEngine / CPRAnalysisService.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const STATUS_COLORS = {
    GOOD: '#22C55E',
    TOO_SLOW: '#F97316',
    TOO_FAST: '#EF4444',
    TOO_SHALLOW: '#F97316',
    TOO_DEEP: '#EF4444',
    ACCEPTABLE: '#EAB308',
    POOR: '#EF4444',
    WAITING: '#888',
};

export default function MetricsDisplay({ metrics }) {
    if (!metrics) return null;

    return (
        <View style={styles.container}>
            {/* BPM */}
            <View style={styles.row}>
                <Text style={styles.label}>BPM</Text>
                <Text style={[styles.value, { color: STATUS_COLORS[metrics.bpmStatus] || '#FFF' }]}>
                    {metrics.bpm > 0 ? metrics.bpm : '--'}
                </Text>
                <Text style={[styles.status, { color: STATUS_COLORS[metrics.bpmStatus] || '#888' }]}>
                    {metrics.bpmStatus === 'GOOD' ? '✓ 100-120' :
                        metrics.bpmStatus === 'TOO_SLOW' ? '↑ Trop lent' :
                            metrics.bpmStatus === 'TOO_FAST' ? '↓ Trop rapide' : 'En attente'}
                </Text>
            </View>

            {/* Depth */}
            {metrics.depthCm != null && (
                <View style={styles.row}>
                    <Text style={styles.label}>Profondeur</Text>
                    <Text style={[styles.value, { color: STATUS_COLORS[metrics.depthStatus] || '#FFF' }]}>
                        {metrics.depthCm} cm
                    </Text>
                    <Text style={[styles.status, { color: STATUS_COLORS[metrics.depthStatus] || '#888' }]}>
                        {metrics.depthStatus === 'GOOD' ? '✓' :
                            metrics.depthStatus === 'TOO_SHALLOW' ? '↓ Plus profond' :
                                metrics.depthStatus === 'TOO_DEEP' ? '↑ Moins profond' : ''}
                    </Text>
                </View>
            )}

            {/* Recoil */}
            {metrics.recoilQuality > 0 && (
                <View style={styles.row}>
                    <Text style={styles.label}>Relâchement</Text>
                    <Text style={[styles.value, { color: STATUS_COLORS[metrics.recoilStatus] || '#FFF' }]}>
                        {metrics.recoilQuality}%
                    </Text>
                </View>
            )}

            {/* Elbow angle */}
            {metrics.elbowAngle != null && (
                <View style={styles.row}>
                    <Text style={styles.label}>Angle coude</Text>
                    <Text style={[styles.value, { color: metrics.elbowAngle >= 160 ? '#22C55E' : '#F97316' }]}>
                        {metrics.elbowAngle}°
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 12,
        padding: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    label: {
        color: '#AAA',
        fontSize: 12,
        flex: 1,
    },
    value: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        minWidth: 60,
        textAlign: 'right',
    },
    status: {
        fontSize: 11,
        marginLeft: 8,
        minWidth: 80,
    },
});
