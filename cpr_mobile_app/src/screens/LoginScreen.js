/**
 * LoginScreen - Connexion par matricule CRT
 * Croissant Rouge Tunisien
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const [matricule, setMatricule] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleLogin = async () => {
        if (!matricule.trim() || !password.trim()) {
            setError('Veuillez remplir tous les champs.');
            shake();
            return;
        }
        setError('');
        setLoading(true);
        try {
            const result = await login(matricule.trim(), password);
            if (!result.success) {
                setError(result.error || 'Identifiants incorrects.');
                shake();
            }
        } catch (e) {
            setError('Erreur de connexion. Vérifiez votre réseau.');
            shake();
        } finally {
            setLoading(false);
        }
    };

    const TEST_ACCOUNTS = [
        { label: 'NDRT', mat: 'CRT001' },
        { label: 'RDRT', mat: 'CRT002' },
        { label: 'Secouriste', mat: 'CRT003' },
        { label: 'Chef Équipe', mat: 'CRT004' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <Feather name="arrow-left" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.logoArea}>
                            <Image source={require('../../assets/logo_symbole.png')} style={styles.logoEmoji} />
                            <Text style={styles.logoTitle}>CRT Secours</Text>
                            <Text style={styles.logoSub}>Espace Membre</Text>
                        </View>
                    </View>

                    {/* Formulaire */}
                    <Animated.View
                        style={[
                            styles.card,
                            { transform: [{ translateX: shakeAnim }] },
                        ]}
                    >
                        <Text style={styles.cardTitle}>Connexion</Text>
                        <Text style={styles.cardSub}>
                            Entrez votre matricule CRT et votre mot de passe
                        </Text>

                        {error ? (
                            <View style={styles.errorBox}>
                                <Feather name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 8 }} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Matricule */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Matricule CRT</Text>
                            <View style={styles.inputWrap}>
                                <Feather name="credit-card" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ex: CRT001"
                                    placeholderTextColor="#9CA3AF"
                                    value={matricule}
                                    onChangeText={setMatricule}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                />
                            </View>
                        </View>

                        {/* Mot de passe */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Mot de passe</Text>
                            <View style={styles.inputWrap}>
                                <Feather name="lock" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Votre mot de passe"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPass}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                                    <Feather
                                        name={showPass ? 'eye-off' : 'eye'}
                                        size={18}
                                        color="#9CA3AF"
                                        style={{ padding: 4 }}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Bouton connexion */}
                        <TouchableOpacity
                            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.loginBtnText}>Se connecter</Text>
                                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>
                                Mot de passe oublié ? Contactez votre délégation
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Comptes de test */}
                    <View style={styles.testSection}>
                        <View style={styles.testTitleRow}>
                            <Feather name="info" size={13} color="#065F46" style={{ marginRight: 6 }} />
                            <Text style={styles.testTitle}>Comptes de démonstration (mdp: 1234)</Text>
                        </View>
                        <View style={styles.testGrid}>
                            {TEST_ACCOUNTS.map((a) => (
                                <TouchableOpacity
                                    key={a.mat}
                                    style={styles.testChip}
                                    onPress={() => {
                                        setMatricule(a.mat);
                                        setPassword('1234');
                                    }}
                                >
                                    <Text style={styles.testChipLabel}>{a.label}</Text>
                                    <Text style={styles.testChipMat}>{a.mat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { flexGrow: 1, paddingBottom: 32 },

    // Header
    header: {
        backgroundColor: '#DC2626',
        paddingTop: 8,
        paddingBottom: 32,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        alignItems: 'center',
    },
    backBtn: {
        alignSelf: 'flex-start',
        padding: 4,
        marginBottom: 8,
    },
    logoArea: { alignItems: 'center' },
    logoEmoji: { width: 56, height: 56, resizeMode: 'contain', marginBottom: 8 },
    logoTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 1,
    },
    logoSub: { color: '#FEE2E2', fontSize: 13, marginTop: 2 },

    // Card
    card: {
        margin: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginTop: -20,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4,
    },
    cardSub: { color: '#6B7280', fontSize: 13, marginBottom: 20 },

    errorBox: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorText: { color: '#DC2626', fontSize: 13, flex: 1 },

    fieldGroup: { marginBottom: 16 },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F9FAFB',
        height: 52,
    },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },

    loginBtn: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 8,
        elevation: 3,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    loginBtnDisabled: { opacity: 0.7 },
    loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

    forgotBtn: { alignItems: 'center', marginTop: 16 },
    forgotText: { color: '#6B7280', fontSize: 12, textDecorationLine: 'underline' },

    // Test accounts
    testSection: {
        marginHorizontal: 20,
        marginTop: 8,
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    testTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    testTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#065F46',
    },
    testGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    testChip: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#10B981',
        alignItems: 'center',
    },
    testChipLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#065F46',
    },
    testChipMat: { fontSize: 11, color: '#6B7280' },
});
