/**
 * Barre de Progression des Compressions
 * Affiche la progression vers le prochain cycle (30 ou 15 compressions)
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function CompressionProgress({ current, target, cycleCount }) {
    const progress = Math.min(current / target, 1);
    const progressWidth = (width - 40) * progress;

    return (
        <View style={styles.container}>
            {/* Compteur de cycles */}
            <View style={styles.cycleCounter}>
                <Text style={styles.cycleLabel}>CYCLES</Text>
                <Text style={styles.cycleValue}>{cycleCount}</Text>
            </View>

            {/* Barre de progression */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: progressWidth }
                        ]}
                    />
                </View>

                {/* Indicateur de compression actuel */}
                <View style={styles.compressionInfo}>
                    <Text style={styles.compressionText}>
                        {current}/{target} compressions
                    </Text>

                    {/* Indication phase suivante */}
                    {current >= target && (
                        <Text style={styles.nextPhaseText}>
                            → 2 VENTILATIONS
                        </Text>
                    )}
                </View>
            </View>

            {/* Indicateur de progression visuel */}
            <View style={styles.dotsContainer}>
                {Array.from({ length: Math.min(target, 30) }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i < current && styles.dotFilled,
                            i === current - 1 && styles.dotCurrent
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        marginHorizontal: 20,
        borderRadius: 16,
        marginBottom: 12,
    },
    cycleCounter: {
        position: 'absolute',
        top: 12,
        right: 16,
        alignItems: 'center',
    },
    cycleLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '600',
    },
    cycleValue: {
        color: '#22C55E',
        fontSize: 24,
        fontWeight: 'bold',
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressTrack: {
        height: 8,
        backgroundColor: '#334155',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: 4,
    },
    compressionInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    compressionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    nextPhaseText: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: 'bold',
    },
    dotsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#334155',
    },
    dotFilled: {
        backgroundColor: '#22C55E',
    },
    dotCurrent: {
        backgroundColor: '#22C55E',
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4,
    },
});
