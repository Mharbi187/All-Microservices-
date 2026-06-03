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
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { chatBotService } from '../services/ChatBotService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const SUGGESTED_QUESTIONS = [
    { text: 'Comment réaliser la RCP ?', icon: 'activity' },
    { text: 'Comment stopper une hémorragie ?', icon: 'droplet' },
    { text: 'Quels sont les signes d\'une crise cardiaque ?', icon: 'heart' },
    { text: 'Que faire en cas de fracture ?', icon: 'plus-square' },
    { text: 'Comment traiter une brûlure grave ?', icon: 'thermometer' },
    { text: 'Que faire en cas de choc anaphylactique ?', icon: 'alert-circle' },
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
            <Text style={typingStyles.label}>L'assistant tape...</Text>
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
            text: `Bonjour ${user?.prenom || ''} ! \n\nJe suis votre assistant de secourisme CRT. Je peux vous aider avec :\n• Protocoles de premiers secours\n• Techniques RCP et DEA\n• Gestion des urgences\n• Questions de formation PSE\n\nQue puis-je faire pour vous ?`,
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
                    text: 'Désolé, une erreur est survenue. Vérifiez votre connexion.',
                    isError: true,
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
                    <View style={[styles.avatar, item.isError && { backgroundColor: '#FEE2E2' }]}>
                        {item.isError ? (
                            <Feather name="alert-triangle" size={18} color="#DC2626" />
                        ) : (
                            <Feather name="cpu" size={20} color="#DC2626" />
                        )}
                    </View>
                )}
                <View
                    style={[
                        styles.bubble,
                        isUser ? styles.bubbleUser : styles.bubbleAssistant,
                        item.isError && { borderColor: '#FECACA', borderWidth: 1 }
                    ]}
                >
                    <Text
                        style={[
                            styles.bubbleText,
                            isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                            item.isError && { color: '#991B1B' }
                        ]}
                    >
                        {item.text}
                    </Text>
                    <Text style={[styles.timeText, isUser && { color: '#FCA5A5' }, item.isError && { color: '#F87171' }]}>
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.suggestChip}
                                    onPress={() => sendMessage(q.text)}
                                >
                                    <Feather name={q.icon} size={14} color="#DC2626" style={{ marginRight: 6 }} />
                                    <Text style={styles.suggestText}>{q.text}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
                            <Feather name="send" size={18} color="#FFFFFF" />
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
        gap: 10,
        maxWidth: width * 0.88,
    },
    msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubble: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxWidth: width * 0.72,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
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
    timeText: { fontSize: 10, color: '#9CA3AF', marginTop: 6, alignSelf: 'flex-end' },

    // Suggestions
    suggestions: {
        paddingBottom: 12,
    },
    suggestTitle: { paddingHorizontal: 16, fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
    suggestRow: { paddingHorizontal: 16, gap: 10 },
    suggestChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    suggestText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },

    // Input bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 12,
    },
    inputField: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111827',
        maxHeight: 120,
        backgroundColor: '#F9FAFB',
    },
    sendBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
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
});
