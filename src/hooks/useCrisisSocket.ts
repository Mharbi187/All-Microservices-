import { useEffect, useState, useRef, useCallback } from 'react';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_BASE = `${wsProtocol}//${window.location.host}/ws/crisis`;

export interface CrisisMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    message_type: string;
    sent_at: string;
    read_by?: string[];
}

export interface CrisisWebSocketEvent {
    event: string;
    data: any;
}

/**
 * Custom hook for real-time WebSocket connection to crisis room (MS4)
 * 
 * Features:
 * - Auto-reconnection on disconnect
 * - Message history and real-time updates
 * - Team deployment notifications
 * - Participant join/leave tracking
 * - Error handling and connection status
 * 
 * Usage:
 * const { messages, isConnected, error, sendMessage } = useCrisisSocket(roomId);
 */
export function useCrisisSocket(roomId: string | null) {
    const [messages, setMessages] = useState<CrisisMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [latestCprMetrics, setLatestCprMetrics] = useState<any | null>(null);
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // userId -> userName
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Connect to WebSocket
    useEffect(() => {
        if (!roomId) return;

        const connect = () => {
            try {
                const ws = new WebSocket(`${WS_BASE}/${roomId}`);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log(`[Crisis Room] Connected to ${roomId}`);
                    setIsConnected(true);
                    setError(null);
                };

                ws.onmessage = (evt) => {
                    try {
                        const payload: CrisisWebSocketEvent = JSON.parse(evt.data);
                        
                        if (payload.event === 'NEW_MESSAGE') {
                            setMessages(prev => [...prev, payload.data as CrisisMessage]);
                        } else if (payload.event === 'TEAM_DEPLOYED') {
                            console.log('[Crisis Room] Team deployed:', payload.data);
                        } else if (payload.event === 'PARTICIPANT_JOINED') {
                            setParticipants(prev => {
                                if (prev.find(p => p.user_id === payload.data.user_id)) return prev;
                                return [...prev, payload.data];
                            });
                        } else if (payload.event === 'PARTICIPANT_LEFT') {
                            setParticipants(prev => prev.filter(p => p.user_id !== payload.data.user_id));
                        } else if (payload.event === 'PARTICIPANT_UPDATED') {
                            setParticipants(prev => prev.map(p => p.user_id === payload.data.user_id ? payload.data : p));
                        } else if (payload.event === 'CPR_METRICS_UPDATE') {
                            setLatestCprMetrics(payload.data);
                        } else if (payload.event === 'TYPING_START') {
                            const { sender_id, sender_name } = payload.data;
                            setTypingUsers(prev => ({ ...prev, [sender_id]: sender_name }));
                            
                            // Clear existing timeout
                            if (typingTimeoutRef.current[sender_id]) {
                                clearTimeout(typingTimeoutRef.current[sender_id]);
                            }
                            
                            // Auto-remove after 3 seconds
                            typingTimeoutRef.current[sender_id] = setTimeout(() => {
                                setTypingUsers(prev => {
                                    const next = { ...prev };
                                    delete next[sender_id];
                                    return next;
                                });
                            }, 3000);
                        } else if (payload.event === 'TYPING_STOP') {
                            const { sender_id } = payload.data;
                            setTypingUsers(prev => {
                                const next = { ...prev };
                                delete next[sender_id];
                                return next;
                            });
                        }
                    } catch (e) {
                        console.error('[Crisis Room WS] Parse error:', e);
                    }
                };

                ws.onerror = (event) => {
                    console.error('[Crisis Room WS] Error:', event);
                    setError('WebSocket connection error');
                    setIsConnected(false);
                };

                ws.onclose = () => {
                    console.log(`[Crisis Room] Disconnected from ${roomId}`);
                    setIsConnected(false);
                    
                    // Attempt auto-reconnect after 3 seconds
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[Crisis Room] Attempting to reconnect...');
                        connect();
                    }, 3000);
                };

            } catch (e) {
                console.error('[Crisis Room WS] Connection error:', e);
                setError(String(e));
            }
        };

        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, [roomId]);

    // Send message via WebSocket
    const sendMessage = useCallback((
        senderId: string,
        senderName: string,
        content: string,
        messageType: string = 'text'
    ): boolean => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.error('[Crisis Room] WebSocket not connected');
            return false;
        }

        try {
            wsRef.current.send(JSON.stringify({
                type: messageType,
                sender_id: senderId,
                sender_name: senderName,
                content,
                timestamp: new Date().toISOString()
            }));
            return true;
        } catch (e) {
            console.error('[Crisis Room] Send error:', e);
            return false;
        }
    }, []);

    const sendTypingIndicator = useCallback((senderId: string, senderName: string, isTyping: boolean) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        try {
            wsRef.current.send(JSON.stringify({
                type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
                sender_id: senderId,
                sender_name: senderName,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            console.error('[Crisis Room] Typing indicator error:', e);
        }
    }, []);

    // Send read receipt
    const sendReadReceipt = useCallback((messageId: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            wsRef.current.send(JSON.stringify({
                type: 'READ_RECEIPT',
                message_id: messageId,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            console.error('[Crisis Room] Read receipt error:', e);
        }
    }, []);

    // Helper to set initial messages (for batch loading)
    const setInitialMessages = (msgs: CrisisMessage[]) => {
        setMessages(msgs);
    };

    const setInitialParticipants = (parts: any[]) => {
        setParticipants(parts);
    };

    return {
        messages,
        isConnected,
        error,
        participants,
        latestCprMetrics,
        typingUsers,
        sendMessage,
        sendTypingIndicator,
        sendReadReceipt,
        setInitialMessages,
        setInitialParticipants
    };
}
