/**
 * Application Principale — Croissant Rouge Tunisien
 * الهلال الأحمر التونسي
 * Plateforme mobile pour volontaires et membres CRT
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, Text } from 'react-native';

// Context authentification
import { AuthProvider, useAuth } from './contexts/AuthContext';

// ── Écrans publics (sans connexion) ──────────────────────────────────────────
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';

// ── Écrans principaux (post-connexion) ───────────────────────────────────────
import DashboardScreen from './screens/DashboardScreen';
import ChatAssistantScreen from './screens/ChatAssistantScreen';
import StudyScreen from './screens/StudyScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AlertScreen from './screens/AlertScreen';
import WeatherCalendarScreen from './screens/WeatherCalendarScreen';

// ── Écrans CPR / métier (accessibles depuis Dashboard) ───────────────────────
import CPRScreen from './screens/CPRScreen';
import ProtocolScreen from './screens/ProtocolScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

// Options de header communes
const HEADER_OPTS = {
    headerStyle: { backgroundColor: '#DC2626' },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: { fontWeight: '800', fontSize: 16 },
    headerTitleAlign: 'center',
};

// ──────────────────────────────────────────────────────────────────────────────
// Navigator interne (utilise le contexte auth)
// ──────────────────────────────────────────────────────────────────────────────
function RootNavigator() {
    const { isAuthenticated } = useAuth();

    return (
        <Stack.Navigator screenOptions={HEADER_OPTS}>
            {!isAuthenticated ? (
                // ── Pile publique ──────────────────────────────────────────
                <>
                    <Stack.Screen
                        name="Welcome"
                        component={WelcomeScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                    {/* Accès invité RCP sans connexion */}
                    <Stack.Screen
                        name="CPRGuest"
                        component={CPRScreen}
                        options={{ title: 'Assistance RCP', headerBackTitle: 'Retour' }}
                    />
                    <Stack.Screen
                        name="ProtocolGuest"
                        component={ProtocolScreen}
                        options={{ title: 'Protocoles RCP' }}
                    />
                </>
            ) : (
                // ── Pile authentifiée ──────────────────────────────────────
                <>
                    <Stack.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CPR"
                        component={CPRScreen}
                        options={{ title: 'Assistance RCP' }}
                    />
                    <Stack.Screen
                        name="Protocol"
                        component={ProtocolScreen}
                        options={{ title: 'Protocoles RCP' }}
                    />
                    <Stack.Screen
                        name="Chat"
                        component={ChatAssistantScreen}
                        options={{ title: 'Assistant IA', headerBackTitle: 'Retour' }}
                    />
                    <Stack.Screen
                        name="Study"
                        component={StudyScreen}
                        options={{ title: 'Formations', headerBackTitle: 'Retour' }}
                    />
                    <Stack.Screen
                        name="Profile"
                        component={ProfileScreen}
                        options={{ title: 'Mon Profil', headerBackTitle: 'Retour' }}
                    />
                    <Stack.Screen
                        name="Notifications"
                        component={NotificationsScreen}
                        options={{ title: 'Notifications', headerBackTitle: 'Retour' }}
                    />
                    <Stack.Screen
                        name="Alert"
                        component={AlertScreen}
                        options={{ title: 'Envoyer une Alerte', headerBackTitle: 'Retour' }}
                    />
                    <Stack.Screen
                        name="WeatherCalendar"
                        component={WeatherCalendarScreen}
                        options={{ title: 'Météo & Calendrier', headerBackTitle: 'Retour' }}
                    />
                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{ title: 'Paramètres' }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Composant racine
// ──────────────────────────────────────────────────────────────────────────────
export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <NavigationContainer>
                    <StatusBar style="light" />
                    <RootNavigator />
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
