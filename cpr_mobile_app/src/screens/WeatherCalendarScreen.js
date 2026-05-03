/**
 * WeatherCalendarScreen - Météo & Calendrier des activités
 * Tunisie - Données simulées en attente API
 * Croissant Rouge Tunisien
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockDataService } from '../services/MockDataService';

const TABS = [
    { id: 'weather', label: 'Météo', icon: '⛅' },
    { id: 'calendar', label: 'Calendrier', icon: '📅' },
];

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getMonthDays(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Adjust: getDay() returns 0=Sun, convert to Mon=0
    const offset = (firstDay === 0 ? 6 : firstDay - 1);
    return { offset, daysInMonth };
}

export default function WeatherCalendarScreen() {
    const [activeTab, setActiveTab] = useState('weather');
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCity, setSelectedCity] = useState('Tunis');
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());
    const [eventModal, setEventModal] = useState(null);

    const load = async () => {
        try {
            const [w, f, e] = await Promise.all([
                mockDataService.getWeather(selectedCity),
                mockDataService.getForecast(selectedCity),
                mockDataService.getCalendarEvents(),
            ]);
            setWeather(w);
            setForecast(f);
            setEvents(e);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
    }, [selectedCity]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const getDayEvents = (day) => {
        return events.filter((ev) => {
            const d = new Date(ev.date);
            return (
                d.getFullYear() === calYear &&
                d.getMonth() === calMonth &&
                d.getDate() === day
            );
        });
    };

    const getEventTypeStyle = (type) => {
        const map = {
            formation: { bg: '#EEF2FF', text: '#4338CA', border: '#A5B4FC' },
            intervention: { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
            reunion: { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
            exercice: { bg: '#FFFBEB', text: '#D97706', border: '#FCD34D' },
            default: { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
        };
        return map[type] || map.default;
    };

    const selectedDayEvents = getDayEvents(selectedDay);

    const { offset, daysInMonth } = getMonthDays(calYear, calMonth);

    const prevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
        else setCalMonth((m) => m - 1);
        setSelectedDay(1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
        else setCalMonth((m) => m + 1);
        setSelectedDay(1);
    };

    const CITIES = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Monastir', 'Nabeul'];

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
            {/* Tabs */}
            <View style={styles.tabs}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.id}
                        style={[styles.tab, activeTab === t.id && styles.tabActive]}
                        onPress={() => setActiveTab(t.id)}
                    >
                        <Text style={styles.tabIcon}>{t.icon}</Text>
                        <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'weather' ? (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Sélecteur de ville */}
                    <View style={styles.citiesRow}>
                        {CITIES.map((c) => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.cityChip, selectedCity === c && styles.cityChipActive]}
                                onPress={() => { setSelectedCity(c); setLoading(true); }}
                            >
                                <Text style={[styles.cityChipText, selectedCity === c && styles.cityChipTextActive]}>
                                    {c}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Météo actuelle */}
                    {weather && (
                        <View style={styles.weatherCard}>
                            <View style={styles.weatherTop}>
                                <View>
                                    <Text style={styles.weatherCity}>{weather.city}</Text>
                                    <Text style={styles.weatherDesc}>{weather.description}</Text>
                                    <Text style={styles.weatherDate}>{weather.date}</Text>
                                </View>
                                <View style={styles.weatherTempBox}>
                                    <Text style={styles.weatherIcon}>{weather.icon}</Text>
                                    <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
                                </View>
                            </View>
                            <View style={styles.weatherDetails}>
                                <WeatherStat icon="💧" label="Humidité" value={`${weather.humidity}%`} />
                                <WeatherStat icon="🌬️" label="Vent" value={`${weather.wind} km/h`} />
                                <WeatherStat icon="👁️" label="Visibilité" value={`${weather.visibility} km`} />
                                <WeatherStat icon="🌡️" label="Ressenti" value={`${weather.feelsLike}°C`} />
                            </View>
                        </View>
                    )}

                    {/* Prévisions 7 jours */}
                    <Text style={styles.sectionTitle}>Prévisions 7 jours</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastRow}>
                        {forecast.map((f, i) => (
                            <View key={i} style={styles.forecastCard}>
                                <Text style={styles.forecastDay}>{f.day}</Text>
                                <Text style={styles.forecastIcon}>{f.icon}</Text>
                                <Text style={styles.forecastMax}>{f.max}°</Text>
                                <Text style={styles.forecastMin}>{f.min}°</Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Alerte météo */}
                    {weather?.alert && (
                        <View style={styles.weatherAlert}>
                            <Text style={styles.weatherAlertIcon}>⚠️</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.weatherAlertTitle}>Alerte météo</Text>
                                <Text style={styles.weatherAlertText}>{weather.alert}</Text>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 20 }} />
                </ScrollView>
            ) : (
                /* CALENDRIER */
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header navigation mois */}
                    <View style={styles.calHeader}>
                        <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                            <Text style={styles.calNavTxt}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.calMonthTitle}>
                            {MONTHS[calMonth]} {calYear}
                        </Text>
                        <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                            <Text style={styles.calNavTxt}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Jours de la semaine */}
                    <View style={styles.calWeekRow}>
                        {DAYS_SHORT.map((d) => (
                            <Text key={d} style={styles.calWeekLabel}>{d}</Text>
                        ))}
                    </View>

                    {/* Grille du mois */}
                    <View style={styles.calGrid}>
                        {Array.from({ length: offset }).map((_, i) => (
                            <View key={`empty-${i}`} style={styles.calCell} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                            const dayEvts = getDayEvents(day);
                            const isToday =
                                day === new Date().getDate() &&
                                calMonth === new Date().getMonth() &&
                                calYear === new Date().getFullYear();
                            const isSelected = day === selectedDay;
                            return (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.calCell,
                                        isToday && styles.calCellToday,
                                        isSelected && styles.calCellSelected,
                                    ]}
                                    onPress={() => setSelectedDay(day)}
                                >
                                    <Text
                                        style={[
                                            styles.calDayNum,
                                            isToday && styles.calDayNumToday,
                                            isSelected && styles.calDayNumSelected,
                                        ]}
                                    >
                                        {day}
                                    </Text>
                                    {dayEvts.length > 0 && (
                                        <View style={styles.calDotRow}>
                                            {dayEvts.slice(0, 3).map((ev, di) => (
                                                <View
                                                    key={di}
                                                    style={[
                                                        styles.calDot,
                                                        { backgroundColor: getEventTypeStyle(ev.type).text },
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Événements du jour sélectionné */}
                    <View style={styles.dayEventsSection}>
                        <Text style={styles.dayEventsTitle}>
                            {selectedDay} {MONTHS[calMonth]} {calYear}
                        </Text>
                        {selectedDayEvents.length === 0 ? (
                            <View style={styles.noEventBox}>
                                <Text style={styles.noEventIcon}>📭</Text>
                                <Text style={styles.noEventText}>Aucun événement ce jour</Text>
                            </View>
                        ) : (
                            selectedDayEvents.map((ev) => {
                                const ts = getEventTypeStyle(ev.type);
                                return (
                                    <TouchableOpacity
                                        key={ev.id}
                                        style={[styles.eventCard, { borderLeftColor: ts.text }]}
                                        onPress={() => setEventModal(ev)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.eventTypeTag, { backgroundColor: ts.bg, borderColor: ts.border }]}>
                                            <Text style={[styles.eventTypeText, { color: ts.text }]}>
                                                {ev.type.charAt(0).toUpperCase() + ev.type.slice(1)}
                                            </Text>
                                        </View>
                                        <Text style={styles.eventTitle}>{ev.title}</Text>
                                        <Text style={styles.eventSub}>
                                            🕐 {ev.time}  •  📍 {ev.location}
                                        </Text>
                                        {ev.organizer && (
                                            <Text style={styles.eventOrg}>👤 {ev.organizer}</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>

                    {/* Tous les événements du mois */}
                    <View style={styles.allEventsSection}>
                        <Text style={styles.sectionTitle}>
                            Tous les événements — {MONTHS[calMonth]}
                        </Text>
                        {events
                            .filter((ev) => {
                                const d = new Date(ev.date);
                                return d.getFullYear() === calYear && d.getMonth() === calMonth;
                            })
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((ev) => {
                                const ts = getEventTypeStyle(ev.type);
                                const d = new Date(ev.date);
                                return (
                                    <TouchableOpacity
                                        key={ev.id}
                                        style={styles.allEventRow}
                                        onPress={() => setEventModal(ev)}
                                    >
                                        <View style={[styles.allEventDate, { backgroundColor: ts.bg }]}>
                                            <Text style={[styles.allEventDateNum, { color: ts.text }]}>{d.getDate()}</Text>
                                            <Text style={[styles.allEventDateMonth, { color: ts.text }]}>
                                                {MONTHS[d.getMonth()].slice(0, 3)}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.allEventTitle}>{ev.title}</Text>
                                            <Text style={styles.allEventSub}>
                                                {ev.time} • {ev.location}
                                            </Text>
                                        </View>
                                        <View style={[styles.eventTypeTag, { backgroundColor: ts.bg, borderColor: ts.border }]}>
                                            <Text style={[styles.eventTypeText, { color: ts.text }]}>{ev.type}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>
            )}

            {/* Modal détail événement */}
            <Modal visible={!!eventModal} transparent animationType="fade" onRequestClose={() => setEventModal(null)}>
                <View style={styles.evModalOverlay}>
                    <View style={styles.evModalCard}>
                        {eventModal && (() => {
                            const ts = getEventTypeStyle(eventModal.type);
                            return (
                                <>
                                    <View style={[styles.evModalHeader, { backgroundColor: ts.bg }]}>
                                        <View style={[styles.evModalTag, { backgroundColor: ts.text }]}>
                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                                                {eventModal.type.toUpperCase()}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setEventModal(null)}
                                            style={styles.evModalClose}
                                        >
                                            <Text style={{ color: '#6B7280', fontSize: 16 }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView style={{ padding: 20 }}>
                                        <Text style={styles.evModalTitle}>{eventModal.title}</Text>
                                        <View style={styles.evModalDetails}>
                                            <Detail icon="📅" label={new Date(eventModal.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                                            <Detail icon="🕐" label={eventModal.time} />
                                            <Detail icon="📍" label={eventModal.location} />
                                            {eventModal.organizer && <Detail icon="👤" label={`Organisé par ${eventModal.organizer}`} />}
                                            {eventModal.participants && <Detail icon="👥" label={`${eventModal.participants} participants`} />}
                                        </View>
                                        {eventModal.description && (
                                            <>
                                                <Text style={styles.evModalDescLabel}>Description</Text>
                                                <Text style={styles.evModalDesc}>{eventModal.description}</Text>
                                            </>
                                        )}
                                    </ScrollView>
                                    <TouchableOpacity
                                        style={[styles.evModalBtn, { backgroundColor: ts.text }]}
                                        onPress={() => setEventModal(null)}
                                    >
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

function WeatherStat({ icon, label, value }) {
    return (
        <View style={styles.weatherStat}>
            <Text style={styles.weatherStatIcon}>{icon}</Text>
            <Text style={styles.weatherStatLabel}>{label}</Text>
            <Text style={styles.weatherStatValue}>{value}</Text>
        </View>
    );
}

function Detail({ icon, label }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>{icon}</Text>
            <Text style={styles.detailLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#6B7280', fontSize: 14 },

    tabs: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: '#DC2626' },
    tabIcon: { fontSize: 16 },
    tabLabel: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    tabLabelActive: { color: '#DC2626' },

    // Weather
    citiesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: 16,
        paddingBottom: 0,
    },
    cityChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    cityChipActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    cityChipText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
    cityChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

    weatherCard: {
        backgroundColor: '#1E3A5F',
        margin: 16,
        borderRadius: 20,
        padding: 20,
        elevation: 6,
        shadowColor: '#1E3A5F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    weatherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    weatherCity: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
    weatherDesc: { fontSize: 14, color: '#93C5FD', marginTop: 2 },
    weatherDate: { fontSize: 12, color: '#64748B', marginTop: 4 },
    weatherTempBox: { alignItems: 'center' },
    weatherIcon: { fontSize: 48 },
    weatherTemp: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginTop: -4 },
    weatherDetails: { flexDirection: 'row', justifyContent: 'space-between' },
    weatherStat: { alignItems: 'center', flex: 1 },
    weatherStatIcon: { fontSize: 20 },
    weatherStatLabel: { fontSize: 10, color: '#93C5FD', marginTop: 2 },
    weatherStatValue: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    forecastRow: { paddingHorizontal: 12, gap: 8, paddingVertical: 8 },
    forecastCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        minWidth: 68,
        gap: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    forecastDay: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
    forecastIcon: { fontSize: 24 },
    forecastMax: { fontSize: 14, fontWeight: '700', color: '#111827' },
    forecastMin: { fontSize: 12, color: '#9CA3AF' },

    weatherAlert: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FFFBEB',
        margin: 16,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    weatherAlertIcon: { fontSize: 20 },
    weatherAlertTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
    weatherAlertText: { fontSize: 12, color: '#B45309', marginTop: 2, lineHeight: 18 },

    // Calendar
    calHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    calNavBtn: { padding: 8 },
    calNavTxt: { fontSize: 24, color: '#DC2626', fontWeight: '600' },
    calMonthTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },

    calWeekRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        paddingVertical: 8,
    },
    calWeekLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
    },

    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    calCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 6,
        borderWidth: 0.5,
        borderColor: '#F3F4F6',
    },
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
    noEventIcon: { fontSize: 32, marginBottom: 8 },
    noEventText: { color: '#9CA3AF', fontSize: 14 },

    eventCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    eventTypeTag: {
        alignSelf: 'flex-start',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: 1,
        marginBottom: 6,
    },
    eventTypeText: { fontSize: 11, fontWeight: '700' },
    eventTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
    eventSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    eventOrg: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

    allEventsSection: { paddingHorizontal: 16 },
    allEventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
    },
    allEventDate: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    allEventDateNum: { fontSize: 18, fontWeight: '800' },
    allEventDateMonth: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    allEventTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
    allEventSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },

    // Modal événement
    evModalOverlay: {
        flex: 1,
        backgroundColor: '#00000070',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    evModalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '100%',
        maxHeight: '75%',
        overflow: 'hidden',
    },
    evModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    evModalTag: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
    evModalClose: { padding: 8 },
    evModalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
    evModalDetails: { gap: 10, marginBottom: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    detailIcon: { fontSize: 18, width: 28 },
    detailLabel: { fontSize: 14, color: '#374151', flex: 1 },
    evModalDescLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
    evModalDesc: { fontSize: 14, color: '#374151', lineHeight: 22 },
    evModalBtn: {
        margin: 16,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    evModalBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
