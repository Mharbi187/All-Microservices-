/**
 * StudyScreen - Modules de formation et quiz
 * Croissant Rouge Tunisien
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const MODULES = [
    {
        id: '1',
        title: 'Principes de base',
        desc: 'Protection, alerte et protection du secouriste.',
        icon: 'shield',
        color: '#DC2626',
        progress: 100,
        lessons: 4,
        time: '2h',
    },
    {
        id: '2',
        title: 'Urgences vitales',
        desc: 'Arrêt cardiaque, RCP, utilisation du DEA.',
        icon: 'activity',
        color: '#EF4444',
        progress: 60,
        lessons: 6,
        time: '3h',
    },
    {
        id: '3',
        title: 'Hémorragies',
        desc: 'Gestes d\'urgence pour stopper les saignements.',
        icon: 'droplet',
        color: '#B91C1C',
        progress: 0,
        lessons: 3,
        time: '1.5h',
    },
    {
        id: '4',
        title: 'Traumatologie',
        desc: 'Fractures, entorses, immobilisations.',
        icon: 'link',
        color: '#F59E0B',
        progress: 0,
        lessons: 5,
        time: '2.5h',
    },
    {
        id: '5',
        title: 'Malaise',
        desc: 'Signes, symptômes et conduite à tenir.',
        icon: 'thermometer',
        color: '#3B82F6',
        progress: 0,
        lessons: 4,
        time: '2h',
    },
    {
        id: '6',
        title: 'Logistique CRT',
        desc: 'Déploiement de poste de secours et matériel.',
        icon: 'package',
        color: '#7C3AED',
        progress: 0,
        lessons: 3,
        time: '1h',
    },
];

const RESSOURCES = [
    { id: 'r1', title: 'Manuel PSE1 2024', type: 'PDF', size: '4.2 MB', icon: 'file-text', color: '#EF4444' },
    { id: 'r2', title: 'Positions d\'attente', type: 'Fiche', size: '1.1 MB', icon: 'layers', color: '#F59E0B' },
    { id: 'r3', title: 'Alerter les secours', type: 'Vidéo', size: '12 MB', icon: 'video', color: '#3B82F6' },
    { id: 'r4', title: 'Bilans secouriste', type: 'Grille', size: '0.8 MB', icon: 'grid', color: '#10B981' },
];

export default function StudyScreen({ navigation }) {
    const { user } = useAuth();
    const [selectedModule, setSelectedModule] = useState(null);

    const getProgressColor = (progress) => {
        if (progress === 100) return '#10B981';
        if (progress > 0) return '#F59E0B';
        return '#E5E7EB';
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* En-tête Stat */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <View style={styles.headerTextWrap}>
                            <Text style={styles.headerGreeting}>Formation Continue</Text>
                            <Text style={styles.headerSub}>Mettez à jour vos connaissances</Text>
                        </View>
                        <View style={styles.headerIconWrap}>
                            <Feather name="book-open" size={26} color="#DC2626" />
                        </View>
                    </View>

                    <View style={styles.globalProgressBox}>
                        <View style={styles.globalProgressRow}>
                            <Text style={styles.globalProgressLabel}>Progression Générale</Text>
                            <Text style={styles.globalProgressValue}>25%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '25%', backgroundColor: '#DC2626' }]} />
                        </View>
                    </View>
                </View>

                {/* Modules Grid */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="grid" size={16} color="#4B5563" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Modules de formation</Text>
                    </View>

                    <View style={styles.grid}>
                        {MODULES.map((mod) => (
                            <TouchableOpacity
                                key={mod.id}
                                style={styles.moduleCard}
                                onPress={() => setSelectedModule(mod)}
                            >
                                <View style={[styles.moduleIconWrap, { backgroundColor: mod.color + '15' }]}>
                                    <Feather name={mod.icon} size={24} color={mod.color} />
                                </View>
                                <Text style={styles.moduleTitle} numberOfLines={2}>
                                    {mod.title}
                                </Text>
                                <Text style={styles.moduleMeta}>
                                    {mod.lessons} leçons • {mod.time}
                                </Text>

                                <View style={styles.moduleProgressStack}>
                                    <View style={styles.moduleProgressBg}>
                                        <View
                                            style={[
                                                styles.moduleProgressFill,
                                                {
                                                    width: `${mod.progress}%`,
                                                    backgroundColor: getProgressColor(mod.progress)
                                                }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.moduleProgressText}>
                                        {mod.progress === 100 ? 'Terminé' : `${mod.progress}%`}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Ressources */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="folder" size={16} color="#4B5563" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Ressources et fiches</Text>
                    </View>

                    {RESSOURCES.map((res) => (
                        <TouchableOpacity key={res.id} style={styles.resCard}>
                            <View style={[styles.resIconBox, { backgroundColor: res.color + '15' }]}>
                                <Feather name={res.icon} size={20} color={res.color} />
                            </View>
                            <View style={styles.resInfo}>
                                <Text style={styles.resTitle}>{res.title}</Text>
                                <View style={styles.resMetaRow}>
                                    <View style={styles.resBadge}>
                                        <Text style={styles.resBadgeText}>{res.type}</Text>
                                    </View>
                                    <Text style={styles.resSize}>{res.size}</Text>
                                </View>
                            </View>
                            <Feather name="download" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quiz Rapide Banner */}
                <TouchableOpacity style={styles.quizBanner}>
                    <View style={styles.quizIconWrap}>
                        <Feather name="target" size={28} color="#FFFFFF" />
                    </View>
                    <View style={styles.quizInfo}>
                        <Text style={styles.quizTitle}>Test de connaissances</Text>
                        <Text style={styles.quizDesc}>10 questions aléatoires pour évaluer votre niveau.</Text>
                    </View>
                    <Feather name="chevron-right" size={24} color="#FCA5A5" />
                </TouchableOpacity>

            </ScrollView>

            {/* Modal Module Detail */}
            <Modal
                visible={!!selectedModule}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedModule(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedModule && (
                            <>
                                <View style={styles.modalHandle} />
                                <View style={[styles.modalIconHuge, { backgroundColor: selectedModule.color + '15' }]}>
                                    <Feather name={selectedModule.icon} size={48} color={selectedModule.color} />
                                </View>
                                <Text style={styles.modalTitle}>{selectedModule.title}</Text>
                                <Text style={styles.modalDesc}>{selectedModule.desc}</Text>

                                <View style={styles.modalStatsRow}>
                                    <View style={styles.modalStat}>
                                        <Feather name="list" size={16} color="#6B7280" />
                                        <Text style={styles.modalStatText}>{selectedModule.lessons} leçons</Text>
                                    </View>
                                    <View style={styles.modalStatDivider} />
                                    <View style={styles.modalStat}>
                                        <Feather name="clock" size={16} color="#6B7280" />
                                        <Text style={styles.modalStatText}>{selectedModule.time} estimé</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.modalActionBtn, { backgroundColor: selectedModule.color }]}
                                    onPress={() => setSelectedModule(null)}
                                >
                                    <Feather name="play" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.modalActionText}>
                                        {selectedModule.progress === 0 ? 'Commencer' : 'Continuer'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    onPress={() => setSelectedModule(null)}
                                >
                                    <Text style={styles.modalCloseText}>Fermer</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { padding: 16, paddingBottom: 32 },

    // Header Card
    headerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTextWrap: { flex: 1 },
    headerGreeting: { fontSize: 22, fontWeight: '800', color: '#111827' },
    headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    headerIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    globalProgressBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 },
    globalProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    globalProgressLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
    globalProgressValue: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
    progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },

    // Sections
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

    // Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    moduleCard: {
        width: (width - 44) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    moduleIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    moduleTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4, minHeight: 36 },
    moduleMeta: { fontSize: 11, color: '#9CA3AF', marginBottom: 12 },
    moduleProgressStack: { gap: 6 },
    moduleProgressBg: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
    moduleProgressFill: { height: '100%', borderRadius: 2 },
    moduleProgressText: { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'right' },

    // Ressources
    resCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    resIconBox: {
        width: 42,
        height: 42,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    resInfo: { flex: 1 },
    resTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
    resMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    resBadgeText: { fontSize: 10, fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' },
    resSize: { fontSize: 11, color: '#9CA3AF' },

    // Quiz Banner
    quizBanner: {
        backgroundColor: '#DC2626',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 8,
        elevation: 4,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    quizIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizInfo: { flex: 1 },
    quizTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
    quizDesc: { fontSize: 12, color: '#FEE2E2', lineHeight: 16 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginBottom: 20,
    },
    modalIconHuge: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
    modalDesc: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 20 },

    modalStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    modalStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalStatDivider: { width: 1, height: 16, backgroundColor: '#E5E7EB', marginHorizontal: 20 },
    modalStatText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },

    modalActionBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    modalActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

    modalCloseBtn: {
        width: '100%',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
    },
    modalCloseText: { color: '#4B5563', fontSize: 15, fontWeight: '700' },
});
