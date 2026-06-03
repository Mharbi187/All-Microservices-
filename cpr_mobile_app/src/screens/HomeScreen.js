/**
 * Écran d'accueil - CPR Assistant
 * Croissant Rouge Tunisien
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
    Linking,
    Alert,
    ScrollView,
    I18nManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { emergencyService } from '../services/EmergencyNumberService';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const [emergencyInfo, setEmergencyInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEmergencyInfo();
    }, []);

    const loadEmergencyInfo = async () => {
        try {
            const info = await emergencyService.getEmergencyInfo();
            setEmergencyInfo(info);
        } catch (error) {
            setEmergencyInfo({
                primary: '190',
                primaryName: 'SAMU',
                country: 'Tunisie'
            });
        }
        setLoading(false);
    };

    const handleEmergencyCall = () => {
        if (!emergencyInfo) return;

        Alert.alert(
            '⚠️ APPEL D\'URGENCE',
            `Voulez-vous appeler le ${emergencyInfo.primary} (${emergencyInfo.primaryName})?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: `APPELER ${emergencyInfo.primary}`,
                    style: 'destructive',
                    onPress: () => Linking.openURL(`tel:${emergencyInfo.primary}`)
                }
            ]
        );
    };

    const startCPR = (rescuerCount) => {
        navigation.navigate('CPR', { rescuerCount });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header avec logo */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image source={require('../../assets/logo_symbole.png')} style={styles.logoImage} />
                        <View>
                            <Text style={styles.title}>الهلال الأحمر التونسي</Text>
                            <Text style={styles.subtitle}>Croissant Rouge Tunisien</Text>
                        </View>
                    </View>
                    <Text style={styles.appName}>CPR ASSISTANT</Text>
                    <Text style={styles.version}>مساعد الإنعاش القلبي الرئوي</Text>
                </View>

                {/* Bouton Urgence */}
                <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={handleEmergencyCall}
                    activeOpacity={0.8}
                >
                    <Text style={styles.emergencyIcon}>🆘</Text>
                    <View style={styles.emergencyTextContainer}>
                        <Text style={styles.emergencyTitle}>APPELER LES SECOURS</Text>
                        <Text style={styles.emergencyNumber}>
                            {loading ? '...' : `📞 ${emergencyInfo?.primary} - ${emergencyInfo?.primaryName}`}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Section principale - Démarrer RCP */}
                <View style={styles.mainSection}>
                    <Text style={styles.sectionTitle}>🚑 Démarrer l'assistance RCP</Text>
                    <Text style={styles.sectionSubtitle}>اختر عدد المنقذين</Text>

                    {/* 1 Secouriste */}
                    <TouchableOpacity
                        style={[styles.startButton, styles.singleRescuer]}
                        onPress={() => startCPR(1)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rescuerIcon}>
                            <Text style={styles.rescuerEmoji}>👤</Text>
                        </View>
                        <View style={styles.buttonTextContainer}>
                            <Text style={styles.buttonTitle}>1 SECOURISTE</Text>
                            <Text style={styles.buttonTitleAr}>منقذ واحد</Text>
                            <Text style={styles.buttonDesc}>Ratio 30:2 standard</Text>
                        </View>
                        <Text style={styles.arrowIcon}>▶</Text>
                    </TouchableOpacity>

                    {/* 2 Secouristes */}
                    <TouchableOpacity
                        style={[styles.startButton, styles.doubleRescuer]}
                        onPress={() => startCPR(2)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rescuerIcon}>
                            <Text style={styles.rescuerEmoji}>👥</Text>
                        </View>
                        <View style={styles.buttonTextContainer}>
                            <Text style={styles.buttonTitle}>2 SECOURISTES</Text>
                            <Text style={styles.buttonTitleAr}>منقذان</Text>
                            <Text style={styles.buttonDesc}>Ratio 15:2 (enfant/nourrisson)</Text>
                        </View>
                        <Text style={styles.arrowIcon}>▶</Text>
                    </TouchableOpacity>
                </View>

                {/* Actions rapides */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickButton}
                        onPress={() => navigation.navigate('Protocol')}
                    >
                        <Text style={styles.quickIcon}>📋</Text>
                        <Text style={styles.quickText}>Protocoles</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickButton}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Text style={styles.quickIcon}>⚙️</Text>
                        <Text style={styles.quickText}>Paramètres</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        ⚠️ Cet outil est une AIDE À LA FORMATION uniquement
                    </Text>
                    <Text style={styles.footerTextAr}>
                        هذه الأداة للتدريب فقط
                    </Text>
                    <Text style={styles.footerDisclaimer}>
                        Ne remplace pas l'appel aux secours ni une formation certifiée
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Fond sombre
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        paddingTop: 10,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    logoImage: {
        width: 50,
        height: 50,
        marginRight: 12,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'right',
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#DC2626',
        letterSpacing: 3,
        marginTop: 8,
    },
    version: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    emergencyButton: {
        backgroundColor: '#DC2626',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    emergencyIcon: {
        fontSize: 40,
        marginRight: 16,
    },
    emergencyTextContainer: {
        flex: 1,
    },
    emergencyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    emergencyNumber: {
        fontSize: 16,
        color: '#FEE2E2',
        marginTop: 4,
    },
    mainSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 16,
        textAlign: 'right',
    },
    startButton: {
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    singleRescuer: {
        backgroundColor: '#1E40AF',
    },
    doubleRescuer: {
        backgroundColor: '#047857',
    },
    rescuerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rescuerEmoji: {
        fontSize: 28,
    },
    buttonTextContainer: {
        flex: 1,
    },
    buttonTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    buttonTitleAr: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'right',
    },
    buttonDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    arrowIcon: {
        fontSize: 24,
        color: 'rgba(255,255,255,0.6)',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    quickButton: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 6,
    },
    quickIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    quickText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
    },
    footerText: {
        fontSize: 12,
        color: '#F59E0B',
        textAlign: 'center',
    },
    footerTextAr: {
        fontSize: 12,
        color: '#F59E0B',
        textAlign: 'center',
        marginTop: 4,
    },
    footerDisclaimer: {
        fontSize: 11,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
    },
});
