/**
 * SettingsScreen - Configuration de l'application
 * Croissant Rouge Tunisien
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Linking,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emergencyService } from '../services/EmergencyNumberService';

export default function SettingsScreen() {
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [hapticEnabled, setHapticEnabled] = useState(true);
    const [language, setLanguage] = useState('fr');
    const [emergencyInfo, setEmergencyInfo] = useState(null);

    useEffect(() => {
        loadSettings();
        loadEmergencyInfo();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await AsyncStorage.getItem('app_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                setVoiceEnabled(parsed.voiceEnabled ?? true);
                setHapticEnabled(parsed.hapticEnabled ?? true);
                setLanguage(parsed.language ?? 'fr');
            }
        } catch (error) {
            console.warn('Erreur chargement paramètres:', error);
        }
    };

    const saveSettings = async (key, value) => {
        try {
            const current = await AsyncStorage.getItem('app_settings');
            const settings = current ? JSON.parse(current) : {};
            settings[key] = value;
            await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Erreur sauvegarde paramètres:', error);
        }
    };

    const loadEmergencyInfo = async () => {
        const info = await emergencyService.getEmergencyInfo();
        setEmergencyInfo(info);
    };

    const refreshLocation = async () => {
        Alert.alert('Actualisation', 'Détection de votre localisation en cours...');
        await emergencyService.refreshCache();
        await loadEmergencyInfo();
        Alert.alert('Terminé', 'Numéro d\'urgence mis à jour');
    };

    const toggleVoice = (value) => {
        setVoiceEnabled(value);
        saveSettings('voiceEnabled', value);
    };

    const toggleHaptic = (value) => {
        setHapticEnabled(value);
        saveSettings('hapticEnabled', value);
    };

    const changeLanguage = (lang) => {
        setLanguage(lang);
        saveSettings('language', lang);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView}>

                {/* Section Localisation */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Feather name="map-pin" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Localisation & Urgence</Text>
                    </View>

                    <View style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View>
                                <Text style={styles.settingLabel}>Pays détecté</Text>
                                <Text style={styles.settingValue}>
                                    {emergencyInfo?.country || 'Détection...'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={refreshLocation}
                            >
                                <Feather name="refresh-cw" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Numéro d'urgence</Text>
                                <View style={styles.emergencyRow}>
                                    <Feather name="phone" size={16} color="#22C55E" style={{ marginRight: 6 }} />
                                    <Text style={styles.emergencyNumber}>
                                        {emergencyInfo?.primary || '190'} — {emergencyInfo?.primaryName || 'SAMU'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Section Audio/Feedback */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Feather name="volume-2" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Audio & Feedback</Text>
                    </View>

                    <View style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View>
                                <Text style={styles.settingLabel}>Guide vocal</Text>
                                <Text style={styles.settingDescription}>
                                    Instructions vocales pendant la RCP
                                </Text>
                            </View>
                            <Switch
                                value={voiceEnabled}
                                onValueChange={toggleVoice}
                                trackColor={{ false: '#334155', true: '#22C55E' }}
                                thumbColor={voiceEnabled ? '#FFFFFF' : '#94A3B8'}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.settingRow}>
                            <View>
                                <Text style={styles.settingLabel}>Vibrations</Text>
                                <Text style={styles.settingDescription}>
                                    Retour haptique à chaque compression
                                </Text>
                            </View>
                            <Switch
                                value={hapticEnabled}
                                onValueChange={toggleHaptic}
                                trackColor={{ false: '#334155', true: '#22C55E' }}
                                thumbColor={hapticEnabled ? '#FFFFFF' : '#94A3B8'}
                            />
                        </View>
                    </View>
                </View>

                {/* Section Langue */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Feather name="globe" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Langue / اللغة</Text>
                    </View>

                    <View style={styles.settingCard}>
                        <View style={styles.languageOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.languageButton,
                                    language === 'fr' && styles.languageButtonActive
                                ]}
                                onPress={() => changeLanguage('fr')}
                            >
                                <Text style={[
                                    styles.languageText,
                                    language === 'fr' && styles.languageTextActive
                                ]}>
                                    Français
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.languageButton,
                                    language === 'ar' && styles.languageButtonActive
                                ]}
                                onPress={() => changeLanguage('ar')}
                            >
                                <Text style={[
                                    styles.languageText,
                                    language === 'ar' && styles.languageTextActive
                                ]}>
                                    العربية
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Section À propos */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Feather name="info" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>À propos</Text>
                    </View>

                    <View style={styles.settingCard}>
                        <View style={styles.aboutRow}>
                            <Text style={styles.aboutLabel}>Application</Text>
                            <Text style={styles.aboutValue}>CPR Assistant v1.0.0</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.aboutRow}>
                            <Text style={styles.aboutLabel}>Organisation</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Image source={require('../../assets/logo_symbole.png')} style={{ width: 20, height: 20, marginRight: 8, resizeMode: 'contain' }} />
                                <Text style={styles.aboutValue}>الهلال الأحمر التونسي</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.aboutRow}>
                            <Text style={styles.aboutLabel}>Protocoles</Text>
                            <Text style={styles.aboutValue}>AHA/ERC 2021</Text>
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.linkRow}
                            onPress={() => Linking.openURL('https://www.ifrc.org')}
                        >
                            <Feather name="external-link" size={14} color="#3B82F6" style={{ marginRight: 8 }} />
                            <Text style={styles.linkText}>Site Croissant-Rouge International</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Avertissement */}
                <View style={styles.disclaimer}>
                    <View style={styles.disclaimerTitleRow}>
                        <Feather name="alert-triangle" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                        <Text style={styles.disclaimerTitle}>Avertissement</Text>
                    </View>
                    <Text style={styles.disclaimerText}>
                        Cette application est un outil d'assistance à la formation.
                        Elle ne remplace pas une formation certifiée en secourisme
                        ni l'appel aux services d'urgence.
                    </Text>
                    <Text style={styles.disclaimerTextAr}>
                        هذا التطبيق أداة مساعدة للتدريب فقط. لا يحل محل التدريب المعتمد
                        أو الاتصال بخدمات الطوارئ.
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8',
    },
    settingCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 16,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    settingValue: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    settingDescription: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    emergencyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    emergencyNumber: {
        fontSize: 18,
        color: '#22C55E',
        fontWeight: 'bold',
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 16,
    },
    languageOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    languageButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#0F172A',
        alignItems: 'center',
    },
    languageButtonActive: {
        backgroundColor: '#22C55E',
    },
    languageText: {
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    },
    languageTextActive: {
        color: '#FFFFFF',
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    aboutLabel: {
        fontSize: 14,
        color: '#94A3B8',
    },
    aboutValue: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    linkRow: {
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: '#3B82F6',
    },
    disclaimer: {
        margin: 16,
        padding: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    disclaimerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    disclaimerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F59E0B',
    },
    disclaimerText: {
        fontSize: 12,
        color: '#F59E0B',
        lineHeight: 18,
    },
    disclaimerTextAr: {
        fontSize: 12,
        color: '#F59E0B',
        lineHeight: 18,
        marginTop: 8,
        textAlign: 'right',
    },
});
