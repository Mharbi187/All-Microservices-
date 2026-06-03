/**
 * DashboardScreen - Interface principale après connexion
 * Adapté selon le rôle de l'utilisateur
 * Croissant Rouge Tunisien
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
    Animated,
    Alert,
    Linking,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../contexts/AuthContext';
import { mockDataService } from '../services/MockDataService';

const { width } = Dimensions.get('window');

// Modules disponibles selon le rôle
const getModules = (role, notifCount) => {
    const base = [
        {
            id: 'cpr',
            icon: 'activity',
            title: 'Assistance RCP',
            subtitle: 'Guidage en temps réel',
            bg: '#DC2626',
            textColor: '#FFFFFF',
            screen: 'CPR',
            roles: ['volunteer', 'secouriste', 'ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
        {
            id: 'chat',
            icon: 'cpu',
            title: 'Assistant IA',
            subtitle: 'Posez vos questions',
            bg: '#3B82F6',
            textColor: '#FFFFFF',
            screen: 'Chat',
            roles: ['volunteer', 'secouriste', 'ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
        {
            id: 'study',
            icon: 'book-open',
            title: 'Formations',
            subtitle: 'PSE1, PSE2 & Protocoles',
            bg: '#10B981',
            textColor: '#FFFFFF',
            screen: 'Study',
            roles: ['volunteer', 'secouriste', 'ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
        {
            id: 'protocol',
            icon: 'clipboard',
            title: 'Protocoles',
            subtitle: 'Guides de référence',
            bg: '#FFFFFF',
            textColor: '#111827',
            screen: 'Protocol',
            roles: ['volunteer', 'secouriste', 'ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
        {
            id: 'calendar',
            icon: 'calendar',
            title: 'Calendrier & Météo',
            subtitle: 'Activités & prévisions',
            bg: '#FFFFFF',
            textColor: '#111827',
            screen: 'WeatherCalendar',
            roles: ['volunteer', 'secouriste', 'ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
        {
            id: 'notifications',
            icon: 'bell',
            title: 'Interventions',
            subtitle: notifCount > 0 ? `${notifCount} notification(s)` : 'Déploiements NDRT/RDRT',
            bg: notifCount > 0 ? '#F59E0B' : '#FFFFFF',
            textColor: notifCount > 0 ? '#FFFFFF' : '#111827',
            screen: 'Notifications',
            badge: notifCount > 0 ? notifCount : null,
            roles: ['ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
        {
            id: 'alert',
            icon: 'alert-triangle',
            title: 'Alerte Chef Équipe',
            subtitle: 'Signaler une situation',
            bg: '#FFFFFF',
            textColor: '#DC2626',
            screen: 'Alert',
            roles: ['ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
        {
            id: 'profile',
            icon: 'user',
            title: 'Mon Profil',
            subtitle: 'Certifications & infos',
            bg: '#FFFFFF',
            textColor: '#111827',
            screen: 'Profile',
            roles: ['volunteer', 'secouriste', 'ndrt', 'rdrt', 'chef_equipe', 'responsable'],
        },
    ];

    return base.filter((m) => m.roles.includes(role));
};

const today = new Date();
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function DashboardScreen({ navigation }) {
    const { user, logout, isNDRTorRDRT } = useAuth();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const modules = getModules(user?.role || 'volunteer', user?.unreadNotifications || 0);
    const roleColor = ROLE_COLORS[user?.role] || '#6B7280';
    const roleLabel = ROLE_LABELS[user?.role] || 'Membre';

    const handleEmergencyCall = () => {
        Alert.alert(
            'Appel d\'urgence',
            'Appeler le SAMU (190) ?',
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Appeler 190', style: 'destructive', onPress: () => Linking.openURL('tel:190') },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnecter', style: 'destructive', onPress: logout },
        ]);
    };

    const handleModulePress = (screen) => {
        if (screen === 'CPR') {
            navigation.navigate('CPR', { rescuerCount: 1 });
        } else {
            navigation.navigate(screen);
        }
    };

    // Disposition: première carte large + reste en grille 2 col
    const firstModule = modules[0];
    const restModules = modules.slice(1);

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {/* Header personnalisé */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>
                            {getGreeting()}, {user?.prenom}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: roleColor + '22', borderColor: roleColor }]}>
                            <Text style={[styles.roleText, { color: roleColor }]}>
                                {roleLabel}  •  {user?.delegation}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.notifBtn}
                            onPress={() => isNDRTorRDRT() && navigation.navigate('Notifications')}
                        >
                            <Feather name="bell" size={22} color="#374151" />
                            {(user?.unreadNotifications || 0) > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{user.unreadNotifications}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                            <Feather name="log-out" size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date widget */}
                <View style={styles.dateBar}>
                    <View style={styles.dateLeft}>
                        <Feather name="calendar" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={styles.dateText}>
                            {DAYS[today.getDay()]} {today.getDate()} {MONTHS[today.getMonth()]} {today.getFullYear()}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.emergencyPill}
                        onPress={handleEmergencyCall}
                    >
                        <Feather name="phone" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.emergencyPillText}>190</Text>
                    </TouchableOpacity>
                </View>

                {/* Grille modules */}
                <Animated.View style={[styles.modulesWrap, { opacity: fadeAnim }]}>
                    {/* Première carte: grande */}
                    {firstModule && (
                        <TouchableOpacity
                            style={[styles.cardLarge, { backgroundColor: firstModule.bg }]}
                            onPress={() => handleModulePress(firstModule.screen)}
                            activeOpacity={0.85}
                        >
                            <View style={styles.cardLargeIconWrap}>
                                <Feather name={firstModule.icon} size={36} color={firstModule.textColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardLargeTitle, { color: firstModule.textColor }]}>
                                    {firstModule.title}
                                </Text>
                                <Text style={[styles.cardLargeSub, { color: firstModule.textColor + 'CC' }]}>
                                    {firstModule.subtitle}
                                </Text>
                            </View>
                            <Feather name="arrow-right" size={20} color={firstModule.textColor} />
                        </TouchableOpacity>
                    )}

                    {/* Reste en grille 2 colonnes */}
                    <View style={styles.grid}>
                        {restModules.map((m) => (
                            <TouchableOpacity
                                key={m.id}
                                style={[
                                    styles.cardSmall,
                                    { backgroundColor: m.bg },
                                    m.bg === '#FFFFFF' && styles.cardSmallBorder,
                                ]}
                                onPress={() => handleModulePress(m.screen)}
                                activeOpacity={0.85}
                            >
                                {m.badge && (
                                    <View style={styles.cardBadge}>
                                        <Text style={styles.cardBadgeText}>{m.badge}</Text>
                                    </View>
                                )}
                                <View style={styles.cardSmallIconWrap}>
                                    <Feather name={m.icon} size={24} color={m.textColor} />
                                </View>
                                <Text style={[styles.cardSmallTitle, { color: m.textColor }]}>
                                    {m.title}
                                </Text>
                                <Text style={[styles.cardSmallSub, { color: m.textColor + '99' }]}>
                                    {m.subtitle}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Footer info */}
                <View style={[styles.footer, { flexDirection: 'row', justifyContent: 'center' }]}>
                    <Image source={require('../../assets/logo_symbole.png')} style={{ width: 16, height: 16, marginRight: 6, resizeMode: 'contain' }} />
                    <Text style={styles.footerText}>
                        الهلال الأحمر التونسي  •  Croissant Rouge Tunisien
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F3F4F6' },
    scroll: { flexGrow: 1, paddingBottom: 24 },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerLeft: { flex: 1 },
    greeting: { fontSize: 18, fontWeight: '800', color: '#111827' },
    roleBadge: {
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderWidth: 1,
        marginTop: 6,
    },
    roleText: { fontSize: 12, fontWeight: '700' },
    headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    notifBtn: { position: 'relative', padding: 6 },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#DC2626',
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
    logoutBtn: { padding: 6 },

    // Date bar
    dateBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    dateLeft: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 13, color: '#374151', fontWeight: '500' },
    emergencyPill: {
        backgroundColor: '#DC2626',
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    emergencyPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

    // Modules
    modulesWrap: { padding: 16, gap: 12 },

    cardLarge: {
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        elevation: 4,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    cardLargeIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardLargeTitle: { fontSize: 18, fontWeight: '800' },
    cardLargeSub: { fontSize: 12, marginTop: 2 },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    cardSmall: {
        width: (width - 44) / 2,
        borderRadius: 16,
        padding: 16,
        minHeight: 110,
        justifyContent: 'flex-end',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
        position: 'relative',
    },
    cardSmallBorder: { borderWidth: 1.5, borderColor: '#E5E7EB' },
    cardSmallIconWrap: { marginBottom: 10 },
    cardSmallTitle: { fontSize: 14, fontWeight: '700' },
    cardSmallSub: { fontSize: 11, marginTop: 2 },
    cardBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#DC2626',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    cardBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    footerText: { color: '#9CA3AF', fontSize: 11 },
});
