/**
 * Overlay de Guidance - Messages de correction/encouragement
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const COLORS = {
    CORRECTION: '#F59E0B',  // Orange
    WARNING: '#EF4444',     // Rouge
    POSITIVE: '#22C55E',    // Vert
    INFO: '#3B82F6'         // Bleu
};

const ICONS = {
    CORRECTION: '⚡',
    WARNING: '⚠️',
    POSITIVE: '✓',
    INFO: 'ℹ️'
};

export default function GuidanceOverlay({ guidance }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        // Animation d'entrée
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // Animation de sortie après 3 secondes
        const timeout = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0.7,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }, 3000);

        return () => clearTimeout(timeout);
    }, [guidance]);

    if (!guidance) return null;

    const color = COLORS[guidance.type] || COLORS.INFO;
    const icon = ICONS[guidance.type] || '•';

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: `${color}22`,
                    borderColor: color,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                }
            ]}
        >
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.textContainer}>
                <Text style={[styles.text, { color }]}>{guidance.text}</Text>
                {guidance.textAr && (
                    <Text style={[styles.textAr, { color }]}>{guidance.textAr}</Text>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        marginHorizontal: 20,
        maxWidth: 350,
    },
    icon: {
        fontSize: 28,
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    textAr: {
        fontSize: 14,
        marginTop: 4,
        textAlign: 'right',
        opacity: 0.9,
    },
});
