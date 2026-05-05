/**
 * Guidance Overlay Component
 * ===========================
 * Shows real-time guidance messages from the RulesEngine.
 * Messages have severity-based styling.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SEVERITY_STYLES = {
    CRITICAL: { bg: 'rgba(239,68,68,0.9)', icon: '🔴' },
    HIGH: { bg: 'rgba(249,115,22,0.85)', icon: '🟠' },
    MEDIUM: { bg: 'rgba(234,179,8,0.85)', icon: '🟡' },
    WARNING: { bg: 'rgba(249,115,22,0.85)', icon: '⚠️' },
    POSITIVE: { bg: 'rgba(34,197,94,0.85)', icon: '✅' },
    info: { bg: 'rgba(59,130,246,0.85)', icon: 'ℹ️' },
    success: { bg: 'rgba(34,197,94,0.85)', icon: '✅' },
    warning: { bg: 'rgba(249,115,22,0.85)', icon: '⚠️' },
};

export default function GuidanceOverlay({ guidance }) {
    if (!guidance) return null;

    // Handle both array format and single object format
    const items = Array.isArray(guidance) ? guidance : [guidance];
    if (items.length === 0) return null;

    return (
        <View style={styles.container}>
            {items.slice(0, 2).map((item, i) => {
                const type = item.type || item.severity || 'info';
                const style = SEVERITY_STYLES[type] || SEVERITY_STYLES.info;
                const text = item.text || item.text_fr || item.correction || '';

                if (!text) return null;

                return (
                    <View key={i} style={[styles.banner, { backgroundColor: style.bg }]}>
                        <Text style={styles.text}>{style.icon} {text}</Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 95,
        left: 10,
        right: 10,
    },
    banner: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 5,
    },
    text: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
