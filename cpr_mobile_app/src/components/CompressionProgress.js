/**
 * Compression Progress Component
 * ================================
 * Shows 30:2 cycle progress bar and compression/ventilation tracking.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CompressionProgress({ count = 0, target = 30, cycle = 0, ventilationTarget = 2 }) {
    const progress = Math.min(1, count / target);
    const progressPercent = Math.round(progress * 100);

    // Color transitions: blue → green as you approach target
    const barColor = progress >= 1 ? '#22C55E' : progress > 0.8 ? '#3B82F6' : '#6366F1';

    return (
        <View style={styles.container}>
            {/* Progress bar */}
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${progressPercent}%`, backgroundColor: barColor }]} />
            </View>

            {/* Info row */}
            <View style={styles.infoRow}>
                <Text style={styles.countText}>
                    {count}/{target} compressions
                </Text>
                <Text style={styles.cycleText}>
                    Cycle {cycle} • Ratio {target}:{ventilationTarget}
                </Text>
            </View>

            {/* Ventilation reminder when cycle complete */}
            {progress >= 1 && (
                <View style={styles.ventAlert}>
                    <Text style={styles.ventText}>
                        💨 {ventilationTarget} ventilations maintenant !
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 10,
        padding: 10,
    },
    track: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    countText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cycleText: {
        color: '#AAA',
        fontSize: 11,
    },
    ventAlert: {
        marginTop: 6,
        backgroundColor: 'rgba(59,130,246,0.8)',
        paddingVertical: 6,
        borderRadius: 6,
    },
    ventText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
