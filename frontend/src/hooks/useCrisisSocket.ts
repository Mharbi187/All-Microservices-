import { useEffect, useState, useRef } from 'react';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_BASE = `${wsProtocol}//${window.location.host}/ws/crisis`;

export function useCrisisSocket(roomId: string) {
    const [messages, setMessages] = useState<any[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!roomId) return;

        const ws = new WebSocket(`${WS_BASE}/${roomId}`);
        wsRef.current = ws;

        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.event === 'NEW_MESSAGE') {
                setMessages(prev => [...prev, data.data]);
            }
            // handle TEAM_DEPLOYED etc if needed
        };

        return () => {
            ws.close();
        };
    }, [roomId]);

    const setInitialMessages = (msgs: any[]) => {
        setMessages(msgs);
    };

    return { messages, setInitialMessages };
}
