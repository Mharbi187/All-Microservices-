/**
 * NotificationsScreen - Notifications d'interventions NDRT/RDRT
 * Simulation de données en attente de l'API réelle
 * Croissant Rouge Tunisien
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { mockDataService } from '../services/MockDataService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const PRIORITY_CONFIG = {
    urgent: { label: 'URGENT', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-octagon' },
    high: { label: 'ÉLEVÉ', color: '#F59E0B', bg: '#FEF3C7', icon: 'alert-triangle' },
    normal: { label: 'NORMAL', color: '#3B82F6', bg: '#EFF6FF', icon: 'info' },
    info: { label: 'INFO', color: '#6B7280', bg: '#F3F4F6', icon: 'message-circle' },
};

const STATUS_CONFIG = {
    pending: { label: 'En attente', color: '#F59E0B' },
    accepted: { label: 'Accepté', color: '#10B981' },
    declined: { label: 'Refusé', color: '#DC2626' },
    read: { label: 'Lu', color: '#9CA3AF' },
};

export default function NotificationsScreen({ navigation }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        const data = await mockDataService.getNotifications(user?.id);
        setNotifications(data);
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        const data = await mockDataService.getNotifications(user?.id);
        setNotifications(data);
        setRefreshing(false);
    };

    const handleAccept = async (notifId) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === notifId ? { ...n, status: 'accepted' } : n))
        );
        setSelected(null);
    };

    const handleDecline = async (notifId) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === notifId ? { ...n, status: 'declined' } : n))
        );
        setSelected(null);
    };

    const markAsRead = (notifId) => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === notifId && n.status === 'pending' ? { ...n, unread: false } : n
            )
        );
    };

    const FILTERS = [
        { key: 'all', label: 'Tout' },
        { key: 'urgent', label: 'Urgent' },
        { key: 'pending', label: 'En attente' },
        { key: 'accepted', label: 'Accepté' },
    ];

    const filteredNotifs = notifications.filter((n) => {
        if (filter === 'all') return true;
        if (filter === 'urgent') return n.priority === 'urgent';
        if (filter === 'pending') return n.status === 'pending';
        if (filter === 'accepted') return n.status === 'accepted';
        return true;
    });

    const unreadCount = notifications.filter((n) => n.unread).length;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>

            {/* Filtre */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterBar}
                contentContainerStyle={styles.filterContent}
            >
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#DC2626" />
                    <Text style={styles.loadingText}>Chargement des notifications...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header compteur */}
                    {unreadCount > 0 && (
                        <View style={styles.unreadBanner}>
                            <Feather name="bell" size={13} color="#92400E" style={{ marginRight: 6 }} />
                            <Text style={styles.unreadBannerText}>
                                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}

                    {filteredNotifs.length === 0 ? (
                        <View style={styles.empty}>
                            <View style={styles.emptyIconWrap}>
                                <Feather name="bell-off" size={48} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>Aucune notification</Text>
                            <Text style={styles.emptySub}>
                                Tirez vers le bas pour actualiser.
                            </Text>
                        </View>
                    ) : (
                        filteredNotifs.map((notif) => {
                            const prio = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.normal;
                            const status = STATUS_CONFIG[notif.status] || STATUS_CONFIG.read;
                            return (
                                <TouchableOpacity
                                    key={notif.id}
                                    style={[styles.notifCard, notif.unread && styles.notifCardUnread]}
                                    onPress={() => {
                                        markAsRead(notif.id);
                                        setSelected(notif);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.prioStripe, { backgroundColor: prio.color }]} />
                                    <View style={styles.notifBody}>
                                        <View style={styles.notifTop}>
                                            <View style={[styles.prioBadge, { backgroundColor: prio.bg, borderColor: prio.color, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                                <Feather name={prio.icon} size={11} color={prio.color} />
                                                <Text style={[styles.prioText, { color: prio.color }]}>
                                                    {prio.label}
                                                </Text>
                                            </View>
                                            {notif.unread && <View style={styles.unreadDot} />}
                                            <Text style={[styles.statusText, { color: status.color }]}>
                                                {status.label}
                                            </Text>
                                        </View>
                                        <Text style={styles.notifTitle}>{notif.title}</Text>
                                        <Text style={styles.notifDesc} numberOfLines={2}>
                                            {notif.message}
                                        </Text>
                                        <View style={styles.notifMeta}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Feather name="clock" size={11} color="#9CA3AF" />
                                                <Text style={styles.notifTime}>{notif.date}</Text>
                                            </View>
                                            {notif.location && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Feather name="map-pin" size={11} color="#9CA3AF" />
                                                    <Text style={styles.notifLocation}>{notif.location}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <Text style={styles.notifArrow}>›</Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                    <View style={{ height: 20 }} />
                </ScrollView>
            )}

            {/* Modal détail notification */}
            <Modal
                visible={!!selected}
                animationType="slide"
                transparent
                onRequestClose={() => setSelected(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {selected && (() => {
                            const prio = PRIORITY_CONFIG[selected.priority] || PRIORITY_CONFIG.normal;
                            return (
                                <>
                                    <View style={styles.modalHandle} />

                                    <View style={[styles.modalPrio, { backgroundColor: prio.bg, borderColor: prio.color, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                        <Feather name={prio.icon} size={13} color={prio.color} />
                                        <Text style={[styles.modalPrioText, { color: prio.color }]}>
                                            {prio.label}
                                        </Text>
                                    </View>

                                    <Text style={styles.modalTitle}>{selected.title}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                        <Feather name="clock" size={12} color="#9CA3AF" />
                                        <Text style={styles.modalTime}>{selected.date}</Text>
                                    </View>

                                    {selected.location && (
                                        <View style={styles.modalInfoRow}>
                                            <Feather name="map-pin" size={16} color="#6B7280" />
                                            <Text style={styles.modalInfoText}>{selected.location}</Text>
                                        </View>
                                    )}

                                    <Text style={styles.modalMessage}>{selected.message}</Text>

                                    {selected.details && (
                                        <View style={styles.detailsBox}>
                                            {Object.entries(selected.details).map(([k, v]) => (
                                                <View key={k} style={styles.detailRow}>
                                                    <Text style={styles.detailKey}>{k}</Text>
                                                    <Text style={styles.detailVal}>{v}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Actions si en attente */}
                                    {selected.status === 'pending' && selected.requiresResponse && (
                                        <View style={styles.modalActions}>
                                            <TouchableOpacity
                                                style={styles.declineBtn}
                                                onPress={() => handleDecline(selected.id)}
                                            >
                                                <Text style={styles.declineBtnText}>Refuser</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.acceptBtn}
                                                onPress={() => handleAccept(selected.id)}
                                            >
                                                <Text style={styles.acceptBtnText}>Accepter</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={styles.modalCloseBtn}
                                        onPress={() => setSelected(null)}
                                    >
                                        <Text style={styles.modalCloseBtnText}>Fermer</Text>
                                    </TouchableOpacity>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },

    filterBar: { maxHeight: 52, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    filterChip: {
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 14,
        backgroundColor: '#F3F4F6',
    },
    filterChipActive: { backgroundColor: '#DC2626' },
    filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    filterTextActive: { color: '#FFFFFF', fontWeight: '700' },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#6B7280', fontSize: 14 },

    scroll: { padding: 16 },

    unreadBanner: {
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    unreadBanner: {
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBannerText: { color: '#92400E', fontSize: 13, fontWeight: '600' },

    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIconWrap: { marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
    emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 6 },

    notifCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 10,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    notifCardUnread: { borderWidth: 1.5, borderColor: '#FECACA' },
    prioStripe: { width: 5 },
    notifBody: { flex: 1, padding: 14 },
    notifTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    prioBadge: {
        borderRadius: 10,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderWidth: 1,
    },
    prioText: { fontSize: 11, fontWeight: '700' },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DC2626',
    },
    statusText: { fontSize: 11, fontWeight: '600', marginLeft: 'auto' },
    notifTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
    notifDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
    notifMeta: { flexDirection: 'row', gap: 12, marginTop: 8 },
    notifTime: { fontSize: 11, color: '#9CA3AF' },
    notifLocation: { fontSize: 11, color: '#9CA3AF' },
    notifArrow: { fontSize: 24, color: '#D1D5DB', alignSelf: 'center', marginRight: 12 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: '#00000066',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '85%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalPrio: {
        alignSelf: 'flex-start',
        borderRadius: 10,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        marginBottom: 12,
    },
    modalPrioText: { fontSize: 13, fontWeight: '700' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
    modalTime: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
    modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    modalInfoIcon: { fontSize: 16 },
    modalInfoText: { fontSize: 14, color: '#374151' },
    modalMessage: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
        marginBottom: 16,
    },
    detailsBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    detailKey: { fontSize: 13, color: '#6B7280' },
    detailVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
    modalActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    declineBtn: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#DC2626',
    },
    declineBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
    acceptBtn: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: '#10B981',
    },
    acceptBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    modalCloseBtn: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    modalCloseBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
});
