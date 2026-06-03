/**
 * WelcomeScreen - Écran d'accueil public
 * Accessible à tous les visiteurs sans connexion
 * Croissant Rouge Tunisien
 */

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
    Animated,
    Linking,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const FEATURES = [
    {
        icon: 'activity',
        title: 'Assistance RCP',
        desc: 'Guidage en temps réel pour la réanimation cardio-pulmonaire',
        color: '#FEE2E2',
        border: '#DC2626',
        iconColor: '#DC2626',
    },
    {
        icon: 'cpu',
        title: 'Assistant IA',
        desc: 'Posez vos questions sur les gestes de premiers secours',
        color: '#EFF6FF',
        border: '#3B82F6',
        iconColor: '#3B82F6',
    },
    {
        icon: 'book-open',
        title: 'Formations',
        desc: 'Apprenez les protocoles PSE1, PSE2 et plus encore',
        color: '#F0FDF4',
        border: '#10B981',
        iconColor: '#10B981',
    },
    {
        icon: 'bell',
        title: 'Interventions',
        desc: 'Notifications de déploiement pour membres NDRT/RDRT',
        color: '#FFF7ED',
        border: '#F59E0B',
        iconColor: '#F59E0B',
    },
];

export default function WelcomeScreen({ navigation }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleEmergencyCall = () => {
        Alert.alert(
            'Appel d\'urgence',
            'Voulez-vous appeler le SAMU (190) ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Appeler 190',
                    style: 'destructive',
                    onPress: () => Linking.openURL('tel:190'),
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Header */}
                <LinearGradient
                    colors={['#DC2626', '#B91C1C', '#991B1B']}
                    style={styles.hero}
                >
                    <Animated.View
                        style={[
                            styles.heroContent,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                        ]}
                    >
                        <View style={styles.logoRow}>
                            <Image source={require('../../assets/logo_symbole.png')} style={styles.logoIcon} />
                            <View>
                                <Text style={styles.orgAr}>الهلال الأحمر التونسي</Text>
                                <Text style={styles.orgFr}>Croissant Rouge Tunisien</Text>
                            </View>
                        </View>

                        <Text style={styles.heroTitle}>CRT Secours</Text>
                        <Text style={styles.heroSubtitle}>
                            Application officielle des secouristes{'\n'}et bénévoles du CRT
                        </Text>

                        {/* Bouton urgence */}
                        <TouchableOpacity
                            style={styles.emergencyBtn}
                            onPress={handleEmergencyCall}
                            activeOpacity={0.8}
                        >
                            <Feather name="phone" size={18} color="#DC2626" />
                            <Text style={styles.emergencyText}>URGENCE — 190</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </LinearGradient>

                {/* Section fonctionnalités */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nos Services</Text>
                    <View style={styles.grid}>
                        {FEATURES.map((f, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.featureCard,
                                    { backgroundColor: f.color, borderLeftColor: f.border },
                                ]}
                            >
                                <View style={[styles.featureIconWrap, { backgroundColor: f.border + '18' }]}>
                                    <Feather name={f.icon} size={22} color={f.iconColor} />
                                </View>
                                <Text style={styles.featureTitle}>{f.title}</Text>
                                <Text style={styles.featureDesc}>{f.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Stats du CRT */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>24</Text>
                        <Text style={styles.statLabel}>Délégations</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>5000+</Text>
                        <Text style={styles.statLabel}>Bénévoles</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>NDRT</Text>
                        <Text style={styles.statLabel}>& RDRT</Text>
                    </View>
                </View>

                {/* Boutons d'action */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.loginBtn}
                        onPress={() => navigation.navigate('Login')}
                        activeOpacity={0.85}
                    >
                        <Feather name="log-in" size={18} color="#FFFFFF" />
                        <Text style={styles.loginBtnText}>Se connecter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.guestBtn}
                        onPress={() => navigation.navigate('CPRGuest')}
                        activeOpacity={0.85}
                    >
                        <Feather name="activity" size={18} color="#DC2626" />
                        <Text style={styles.guestBtnText}>
                            Démarrer la RCP sans compte
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        Cet outil est une aide à la formation.{'\n'}
                        En cas d'urgence, appelez le 190.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { flexGrow: 1, paddingBottom: 32 },

    // Hero
    hero: {
        paddingTop: 16,
        paddingBottom: 36,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroContent: { alignItems: 'center' },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    logoIcon: { width: 44, height: 44, resizeMode: 'contain' },
    orgAr: { color: '#FEE2E2', fontSize: 14, fontWeight: '700', textAlign: 'right' },
    orgFr: { color: '#FCA5A5', fontSize: 11, textAlign: 'right' },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 8,
    },
    heroSubtitle: {
        color: '#FEE2E2',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    emergencyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 50,
        paddingVertical: 12,
        paddingHorizontal: 28,
        gap: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    emergencyText: {
        color: '#DC2626',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },

    // Section
    section: { paddingHorizontal: 20, paddingTop: 28 },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    featureCard: {
        width: (width - 52) / 2,
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    featureIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    featureTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
    featureDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        margin: 20,
        backgroundColor: '#DC2626',
        borderRadius: 16,
        paddingVertical: 18,
        elevation: 3,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    statLabel: { color: '#FEE2E2', fontSize: 11, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: '#EF4444' },

    // Actions
    actions: { paddingHorizontal: 20, gap: 12 },
    loginBtn: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        elevation: 3,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    guestBtn: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 2,
        borderColor: '#DC2626',
    },
    guestBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
    disclaimer: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 11,
        lineHeight: 18,
        marginTop: 8,
    },
});
