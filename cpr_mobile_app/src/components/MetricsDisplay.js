/**
 * Affichage des Métriques CPR en temps réel
 * BPM, Profondeur, Qualité de relâchement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MetricsDisplay({ metrics, protocol }) {
    if (!metrics) return null;

    return (
        <View style={styles.container}>
            {/* BPM */}
            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>BPM</Text>
                <Text style={[styles.metricValue, { color: metrics.bpmColor }]}>
                    {metrics.bpm > 0 ? metrics.bpm : '--'}
                </Text>
                <Text style={styles.metricTarget}>
                    {protocol.minBPM}-{protocol.maxBPM}
                </Text>
                <View style={[styles.statusIndicator, { backgroundColor: metrics.bpmColor }]} />
            </View>

            {/* Profondeur */}
            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>PROFONDEUR</Text>
                <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                    {metrics.avgDepth > 0 ? `${(metrics.avgDepth / 10).toFixed(1)}` : '--'}
                </Text>
                <Text style={styles.metricTarget}>
                    {protocol.minDepthCm}-{protocol.maxDepthCm} cm
                </Text>
                <View style={[styles.statusIndicator, { backgroundColor: '#3B82F6' }]} />
            </View>

            {/* Relâchement */}
            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>RELÂCHEMENT</Text>
                <Text style={[styles.metricValue, { color: metrics.recoilColor }]}>
                    {metrics.recoilQuality > 0 ? `${metrics.recoilQuality}%` : '--'}
                </Text>
                <Text style={styles.metricTarget}>≥90%</Text>
                <View style={[styles.statusIndicator, { backgroundColor: metrics.recoilColor }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    metricCard: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        minWidth: 100,
        position: 'relative',
        overflow: 'hidden',
    },
    metricLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    metricTarget: {
        color: '#64748B',
        fontSize: 10,
        marginTop: 4,
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
    },
});
