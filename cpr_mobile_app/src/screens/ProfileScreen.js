/**
 * ProfileScreen - Profil utilisateur avec rôle et certifications
 * Secouriste simple ou membre NDRT/RDRT
 * Croissant Rouge Tunisien
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../contexts/AuthContext';

const ROLE_DESCRIPTIONS = {
    volunteer: 'Bénévole actif du Croissant Rouge Tunisien. Participe aux activités locales et aux opérations de sensibilisation.',
    secouriste: 'Secouriste certifié PSE1. Habilité à pratiquer les gestes de premiers secours lors des interventions.',
    ndrt: 'Membre de l\'Équipe Nationale d\'Intervention en Cas de Catastrophe (NDRT). Déployable à l\'échelle nationale en cas de catastrophe.',
    rdrt: 'Membre de l\'Équipe Régionale d\'Intervention (RDRT). Spécialisé dans la réponse aux crises régionales et les interventions avancées.',
    chef_equipe: 'Chef d\'Équipe certifié. Coordonne les interventions, gère les ressources humaines et assure la liaison avec le commandement.',
    responsable: 'Responsable de délégation. Supervise l\'ensemble des activités opérationnelles et administratives.',
};

const ROLE_ICONS = {
    volunteer: '🤝',
    secouriste: '🏥',
    ndrt: '🌍',
    rdrt: '🌐',
    chef_equipe: '⭐',
    responsable: '👑',
};

const NDRT_RDRT_BADGE = {
    ndrt: { label: 'NDRT', fullLabel: 'National Disaster Response Team', color: '#DC2626', bg: '#FEE2E2' },
    rdrt: { label: 'RDRT', fullLabel: 'Regional Disaster Response Team', color: '#7C3AED', bg: '#F3E8FF' },
    chef_equipe: { label: 'CHEF ÉQUIPE', fullLabel: 'Chef d\'Équipe CRT', color: '#F59E0B', bg: '#FEF3C7' },
    responsable: { label: 'RESPONSABLE', fullLabel: 'Responsable Délégation', color: '#DC2626', bg: '#FEE2E2' },
};

export default function ProfileScreen({ navigation }) {
    const { user, logout, hasRole } = useAuth();
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const roleColor = ROLE_COLORS[user?.role] || '#6B7280';
    const roleLabel = ROLE_LABELS[user?.role] || 'Membre';
    const roleIcon = ROLE_ICONS[user?.role] || '👤';
    const roleDesc = ROLE_DESCRIPTIONS[user?.role] || '';
    const specialBadge = NDRT_RDRT_BADGE[user?.role];

    const handleLogout = () => {
        Alert.alert('Déconnexion', 'Quitter votre espace membre ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnecter', style: 'destructive', onPress: logout },
        ]);
    };

    const yearsActive = () => {
        if (!user?.dateAdhesion) return '—';
        const years = new Date().getFullYear() - new Date(user.dateAdhesion).getFullYear();
        return years === 0 ? 'Nouveau membre' : `${years} an${years > 1 ? 's' : ''}`;
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Card profil principal */}
                <View style={styles.profileCard}>
                    {/* Avatar */}
                    <View style={[styles.avatarCircle, { borderColor: roleColor }]}>
                        <Text style={styles.avatarEmoji}>{roleIcon}</Text>
                    </View>

                    <Text style={styles.userName}>
                        {user?.prenom} {user?.nom}
                    </Text>
                    <Text style={styles.userMatricule}>#{user?.matricule}</Text>

                    {/* Badge rôle */}
                    <View style={[styles.rolePill, { backgroundColor: roleColor + '20', borderColor: roleColor }]}>
                        <Text style={[styles.rolePillText, { color: roleColor }]}>{roleLabel}</Text>
                    </View>

                    {/* Badge NDRT/RDRT spécial */}
                    {specialBadge && (
                        <View style={[styles.specialBadge, { backgroundColor: specialBadge.bg, borderColor: specialBadge.color }]}>
                            <Text style={[styles.specialBadgeLabel, { color: specialBadge.color }]}>
                                {specialBadge.label}
                            </Text>
                            <Text style={[styles.specialBadgeFull, { color: specialBadge.color + 'AA' }]}>
                                {specialBadge.fullLabel}
                            </Text>
                        </View>
                    )}

                    {/* Description rôle */}
                    <Text style={styles.roleDesc}>{roleDesc}</Text>
                </View>

                {/* Infos générales */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ℹ️  Informations</Text>
                    {[
                        { label: 'Délégation', value: user?.delegation, icon: '📍' },
                        { label: 'Téléphone', value: user?.phone, icon: '📞' },
                        { label: 'Date d\'adhésion', value: user?.dateAdhesion || '—', icon: '📅' },
                        { label: 'Ancienneté', value: yearsActive(), icon: '⭐' },
                    ].map((info, i) => (
                        <View key={i} style={styles.infoRow}>
                            <Text style={styles.infoIcon}>{info.icon}</Text>
                            <Text style={styles.infoLabel}>{info.label}</Text>
                            <Text style={styles.infoValue}>{info.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Certifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏅  Certifications</Text>
                    {(user?.certifications && user.certifications.length > 0) ? (
                        <View style={styles.certGrid}>
                            {user.certifications.map((cert, i) => (
                                <View key={i} style={styles.certChip}>
                                    <Text style={styles.certIcon}>✓</Text>
                                    <Text style={styles.certText}>{cert}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyCerts}>
                            <Text style={styles.emptyCertsText}>
                                Aucune certification enregistrée.{'\n'}
                                Contactez votre délégation pour valider vos formations.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Statistiques */}
                <View style={styles.statsCard}>
                    <Text style={styles.sectionTitle}>📊  Activité</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>
                                {user?.certifications?.length || 0}
                            </Text>
                            <Text style={styles.statLabel}>Certifications</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>
                                {hasRole('ndrt', 'rdrt', 'chef_equipe') ? '✓' : '—'}
                            </Text>
                            <Text style={styles.statLabel}>NDRT/RDRT</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{yearsActive().replace(' ans', '').replace(' an', '')}</Text>
                            <Text style={styles.statLabel}>Années</Text>
                        </View>
                    </View>
                </View>

                {/* Préférences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚙️  Préférences</Text>
                    {[
                        {
                            label: 'Notifications',
                            sub: 'Alertes et interventions',
                            value: notifEnabled,
                            onToggle: setNotifEnabled,
                        },
                        {
                            label: 'Son et vibrations',
                            sub: 'Alertes sonores',
                            value: soundEnabled,
                            onToggle: setSoundEnabled,
                        },
                    ].map((pref, i) => (
                        <View key={i} style={styles.prefRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.prefLabel}>{pref.label}</Text>
                                <Text style={styles.prefSub}>{pref.sub}</Text>
                            </View>
                            <Switch
                                value={pref.value}
                                onValueChange={pref.onToggle}
                                trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
                                thumbColor={pref.value ? '#DC2626' : '#9CA3AF'}
                            />
                        </View>
                    ))}
                </View>

                {/* Bouton déconnexion */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>↪️  Se déconnecter</Text>
                </TouchableOpacity>

                <Text style={styles.version}>CRT Secours • Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { padding: 16, paddingBottom: 32 },

    // Profile card
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        marginBottom: 16,
    },
    avatarCircle: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#F9FAFB',
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarEmoji: { fontSize: 40 },
    userName: { fontSize: 22, fontWeight: '800', color: '#111827' },
    userMatricule: { fontSize: 13, color: '#9CA3AF', marginTop: 2, marginBottom: 10 },
    rolePill: {
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        marginBottom: 10,
    },
    rolePillText: { fontSize: 13, fontWeight: '700' },
    specialBadge: {
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        marginBottom: 12,
    },
    specialBadgeLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    specialBadgeFull: { fontSize: 11, marginTop: 2 },
    roleDesc: {
        fontSize: 13,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 4,
    },

    // Section
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 12,
    },

    // Info rows
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
        gap: 10,
    },
    infoIcon: { fontSize: 16, width: 24 },
    infoLabel: { flex: 1, fontSize: 13, color: '#6B7280' },
    infoValue: { fontSize: 13, fontWeight: '600', color: '#111827' },

    // Certifications
    certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    certChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    certIcon: { color: '#10B981', fontSize: 12, fontWeight: '700' },
    certText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
    emptyCerts: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    emptyCertsText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

    // Stats
    statsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingVertical: 14,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 24, fontWeight: '900', color: '#DC2626' },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    statDivider: { width: 1, backgroundColor: '#E5E7EB' },

    // Preferences
    prefRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    prefLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
    prefSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

    // Logout
    logoutBtn: {
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
        marginBottom: 12,
    },
    logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },

    version: { textAlign: 'center', color: '#D1D5DB', fontSize: 11 },
});
