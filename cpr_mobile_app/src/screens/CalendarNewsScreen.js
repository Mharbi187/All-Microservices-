import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    RefreshControl, Modal, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { coreAPI } from '../services/CoreAPIService';

const TABS = [
    { id: 'calendar', label: 'Calendrier', icon: 'calendar' },
    { id: 'news', label: 'Actualités', icon: 'file-text' },
];

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getMonthDays(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay === 0 ? 6 : firstDay - 1);
    return { offset, daysInMonth };
}

export default function CalendarNewsScreen() {
    const [activeTab, setActiveTab] = useState('calendar');
    const [events, setEvents] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());
    const [eventModal, setEventModal] = useState(null);

    const loadData = async () => {
        try {
            const [evs, nws] = await Promise.all([
                coreAPI.fetchUpcomingEvents().catch(() => []),
                coreAPI.fetchNews().catch(() => [])
            ]);
            setEvents(evs || []);
            setNews(nws || []);
        } catch (err) {
            console.error('[CalendarNewsScreen] Error fetching data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getDayEvents = (day) => {
        return events.filter((ev) => {
            if (!ev.date) return false;
            const d = new Date(ev.date);
            return (
                d.getFullYear() === calYear &&
                d.getMonth() === calMonth &&
                d.getDate() === day
            );
        });
    };

    const getEventTypeStyle = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('formation')) return { bg: '#EEF2FF', text: '#4338CA', border: '#A5B4FC' };
        if (t.includes('intervention')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
        if (t.includes('reunion')) return { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' };
        return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
    };

    const { offset, daysInMonth } = getMonthDays(calYear, calMonth);
    const selectedDayEvents = getDayEvents(selectedDay);

    const prevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
        else setCalMonth(m => m - 1);
        setSelectedDay(1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
        else setCalMonth(m => m + 1);
        setSelectedDay(1);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#DC2626" size="large" />
                    <Text style={styles.loadingText}>Chargement...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <View style={styles.tabs}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.id}
                        style={[styles.tab, activeTab === t.id && styles.tabActive]}
                        onPress={() => setActiveTab(t.id)}
                    >
                        <Feather name={t.icon} size={16} color={activeTab === t.id ? '#DC2626' : '#6B7280'} />
                        <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'calendar' ? (
                    <View>
                        <View style={styles.calHeader}>
                            <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                                <Feather name="chevron-left" size={24} color="#DC2626" />
                            </TouchableOpacity>
                            <Text style={styles.calMonthTitle}>
                                {MONTHS[calMonth]} {calYear}
                            </Text>
                            <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                                <Feather name="chevron-right" size={24} color="#DC2626" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calWeekRow}>
                            {DAYS_SHORT.map(d => <Text key={d} style={styles.calWeekLabel}>{d}</Text>)}
                        </View>

                        <View style={styles.calGrid}>
                            {Array.from({ length: offset }).map((_, i) => <View key={`empty-${i}`} style={styles.calCell} />)}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                const dayEvts = getDayEvents(day);
                                const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
                                const isSelected = day === selectedDay;
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[styles.calCell, isToday && styles.calCellToday, isSelected && styles.calCellSelected]}
                                        onPress={() => setSelectedDay(day)}
                                    >
                                        <Text style={[styles.calDayNum, isToday && styles.calDayNumToday, isSelected && styles.calDayNumSelected]}>{day}</Text>
                                        {dayEvts.length > 0 && (
                                            <View style={styles.calDotRow}>
                                                {dayEvts.slice(0, 3).map((ev, di) => (
                                                    <View key={di} style={[styles.calDot, { backgroundColor: getEventTypeStyle(ev.type).text }]} />
                                                ))}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.dayEventsSection}>
                            <Text style={styles.dayEventsTitle}>{selectedDay} {MONTHS[calMonth]} {calYear}</Text>
                            {selectedDayEvents.length === 0 ? (
                                <View style={styles.noEventBox}>
                                    <Feather name="inbox" size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
                                    <Text style={styles.noEventText}>Aucun événement ce jour</Text>
                                </View>
                            ) : (
                                selectedDayEvents.map(ev => {
                                    const ts = getEventTypeStyle(ev.type);
                                    return (
                                        <TouchableOpacity key={ev.id} style={[styles.eventCard, { borderLeftColor: ts.text }]} onPress={() => setEventModal(ev)}>
                                            <View style={[styles.eventTypeTag, { backgroundColor: ts.bg, borderColor: ts.border }]}>
                                                <Text style={[styles.eventTypeText, { color: ts.text }]}>{ev.type}</Text>
                                            </View>
                                            <Text style={styles.eventTitle}>{ev.title}</Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={styles.newsSection}>
                        {news.length === 0 ? (
                            <View style={styles.noEventBox}>
                                <Feather name="info" size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
                                <Text style={styles.noEventText}>Aucune actualité disponible</Text>
                            </View>
                        ) : (
                            news.map(n => (
                                <View key={n.id} style={styles.newsCard}>
                                    <Text style={styles.newsTitle}>{n.title}</Text>
                                    <Text style={styles.newsDate}>{new Date(n.publishedAt || n.date).toLocaleDateString()}</Text>
                                    <Text style={styles.newsContent}>{n.content}</Text>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            <Modal visible={!!eventModal} transparent animationType="fade" onRequestClose={() => setEventModal(null)}>
                <View style={styles.evModalOverlay}>
                    <View style={styles.evModalCard}>
                        {eventModal && (() => {
                            const ts = getEventTypeStyle(eventModal.type);
                            return (
                                <>
                                    <View style={[styles.evModalHeader, { backgroundColor: ts.bg }]}>
                                        <Text style={{ color: ts.text, fontWeight: '700' }}>{eventModal.type}</Text>
                                        <TouchableOpacity onPress={() => setEventModal(null)}><Feather name="x" size={20} color="#6B7280" /></TouchableOpacity>
                                    </View>
                                    <ScrollView style={{ padding: 20 }}>
                                        <Text style={styles.evModalTitle}>{eventModal.title}</Text>
                                        {eventModal.description && <Text style={styles.evModalDesc}>{eventModal.description}</Text>}
                                    </ScrollView>
                                    <TouchableOpacity style={[styles.evModalBtn, { backgroundColor: ts.text }]} onPress={() => setEventModal(null)}>
                                        <Text style={styles.evModalBtnText}>Fermer</Text>
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
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#6B7280', fontSize: 14 },
    tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#DC2626' },
    tabLabel: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    tabLabelActive: { color: '#DC2626' },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF' },
    calNavBtn: { padding: 8 },
    calMonthTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
    calWeekRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 8 },
    calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFFFFF' },
    calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', paddingTop: 6, borderWidth: 0.5, borderColor: '#F3F4F6' },
    calCellToday: { backgroundColor: '#FEF2F2' },
    calCellSelected: { backgroundColor: '#DC2626' },
    calDayNum: { fontSize: 13, color: '#374151', fontWeight: '500' },
    calDayNumToday: { color: '#DC2626', fontWeight: '800' },
    calDayNumSelected: { color: '#FFFFFF', fontWeight: '800' },
    calDotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    calDot: { width: 5, height: 5, borderRadius: 3 },
    dayEventsSection: { padding: 16 },
    dayEventsTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
    noEventBox: { alignItems: 'center', paddingVertical: 24 },
    noEventText: { color: '#9CA3AF', fontSize: 14 },
    eventCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
    eventTypeTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, marginBottom: 6 },
    eventTypeText: { fontSize: 11, fontWeight: '700' },
    eventTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
    newsSection: { padding: 16 },
    newsCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12 },
    newsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    newsDate: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
    newsContent: { fontSize: 14, color: '#374151', lineHeight: 20 },
    evModalOverlay: { flex: 1, backgroundColor: '#00000070', alignItems: 'center', justifyContent: 'center', padding: 20 },
    evModalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxHeight: '75%', overflow: 'hidden' },
    evModalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    evModalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    evModalDesc: { fontSize: 14, color: '#374151', lineHeight: 22 },
    evModalBtn: { margin: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    evModalBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 }
});
