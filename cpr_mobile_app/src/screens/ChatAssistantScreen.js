/**
 * ChatAssistantScreen - Assistant IA pour les questions de secourisme
 * Simulation de réponses IA en attente de l'API réelle
 * Croissant Rouge Tunisien
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatBotService } from '../services/ChatBotService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const SUGGESTED_QUESTIONS = [
    '🫀 Comment réaliser la RCP ?',
    '🩸 Comment stopper une hémorragie ?',
    '😮‍💨 Quels sont les signes d\'une crise cardiaque ?',
    '🤕 Que faire en cas de fracture ?',
    '🔥 Comment traiter une brûlure grave ?',
    '🌡️ Que faire en cas de choc anaphylactique ?',
];

const TypingIndicator = () => {
    const dot1 = useRef(new (require('react-native').Animated).Value(0)).current;
    const dot2 = useRef(new (require('react-native').Animated).Value(0)).current;
    const dot3 = useRef(new (require('react-native').Animated).Value(0)).current;

    useEffect(() => {
        const anim = (d, delay) =>
            require('react-native').Animated.loop(
                require('react-native').Animated.sequence([
                    require('react-native').Animated.delay(delay),
                    require('react-native').Animated.timing(d, { toValue: -6, duration: 300, useNativeDriver: true }),
                    require('react-native').Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
                ])
            ).start();
        anim(dot1, 0);
        anim(dot2, 150);
        anim(dot3, 300);
    }, []);

    const { Animated } = require('react-native');
    return (
        <View style={typingStyles.wrap}>
            <Text style={typingStyles.label}>Assistant tape...</Text>
            <View style={typingStyles.dots}>
                {[dot1, dot2, dot3].map((d, i) => (
                    <Animated.View
                        key={i}
                        style={[typingStyles.dot, { transform: [{ translateY: d }] }]}
                    />
                ))}
            </View>
        </View>
    );
};

const typingStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    label: { color: '#6B7280', fontSize: 12, marginRight: 6 },
    dots: { flexDirection: 'row', gap: 4 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626' },
});

export default function ChatAssistantScreen({ navigation }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        {
            id: '0',
            role: 'assistant',
            text: `Bonjour ${user?.prenom || ''} ! 👋\n\nJe suis votre assistant de secourisme CRT. Je peux vous aider avec :\n• Protocoles de premiers secours\n• Techniques RCP et DEA\n• Gestion des urgences\n• Questions de formation PSE\n\nQue puis-je faire pour vous ?`,
            time: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatRef = useRef(null);

    const sendMessage = async (text) => {
        const msg = text || input.trim();
        if (!msg) return;
        setInput('');

        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            text: msg,
            time: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const response = await chatBotService.ask(msg);
            const assistantMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: response,
                time: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    text: '❌ Désolé, une erreur est survenue. Vérifiez votre connexion.',
                    time: new Date(),
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        if (flatRef.current && messages.length > 0) {
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages, isTyping]);

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
                {!isUser && (
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>🤖</Text>
                    </View>
                )}
                <View
                    style={[
                        styles.bubble,
                        isUser ? styles.bubbleUser : styles.bubbleAssistant,
                    ]}
                >
                    <Text
                        style={[
                            styles.bubbleText,
                            isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                        ]}
                    >
                        {item.text}
                    </Text>
                    <Text style={[styles.timeText, isUser && { color: '#FCA5A5' }]}>
                        {item.time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messagesList}
                    ListFooterComponent={isTyping ? <TypingIndicator /> : null}
                    showsVerticalScrollIndicator={false}
                />

                {/* Questions suggérées (si premier message seulement) */}
                {messages.length === 1 && (
                    <View style={styles.suggestions}>
                        <Text style={styles.suggestTitle}>Questions fréquentes :</Text>
                        <View style={styles.suggestRow}>
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.suggestChip}
                                    onPress={() => sendMessage(q.slice(2))}
                                >
                                    <Text style={styles.suggestText}>{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Input zone */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.inputField}
                        placeholder="Posez votre question..."
                        placeholderTextColor="#9CA3AF"
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={() => sendMessage()}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!input.trim() || isTyping}
                    >
                        {isTyping ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.sendIcon}>➤</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },

    messagesList: {
        padding: 16,
        gap: 12,
        flexGrow: 1,
    },
    msgRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: width * 0.85,
    },
    msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 18 },
    bubble: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: width * 0.72,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
    },
    bubbleUser: {
        backgroundColor: '#DC2626',
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    bubbleText: { fontSize: 14, lineHeight: 22 },
    bubbleTextUser: { color: '#FFFFFF' },
    bubbleTextAssistant: { color: '#111827' },
    timeText: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },

    // Suggestions
    suggestions: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    suggestTitle: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    suggestChip: {
        backgroundColor: '#FEE2E2',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    suggestText: { fontSize: 12, color: '#DC2626', fontWeight: '500' },

    // Input bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 10,
    },
    inputField: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        maxHeight: 100,
        backgroundColor: '#F9FAFB',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#DC2626',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    sendBtnDisabled: { backgroundColor: '#D1D5DB', elevation: 0 },
    sendIcon: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
