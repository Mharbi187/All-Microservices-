import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Tag } from 'antd';
import { SendOutlined, WarningOutlined, CheckCircleOutlined, AlertOutlined, AuditOutlined, MessageOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import { useCrisisSocket } from '@/hooks/useCrisisSocket';

const { Text } = Typography;

export default function CrisisMessagingPanel({ roomId, initialMessages }: { roomId: string, initialMessages: any[] }) {
    const { messages, setInitialMessages } = useCrisisSocket(roomId);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInitialMessages(initialMessages);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (type: string = 'text') => {
        if (!inputValue.trim()) return;
        try {
            await crisisApi.sendMessage(roomId, "usr_web_01", "Regional Commander", inputValue, type);
            setInputValue('');
        } catch (e) {
            console.error(e);
        }
    };

    const renderBubble = (msg: any) => {
        const isSelf = msg.sender_id === 'usr_web_01';
        const isSystem = msg.message_type === 'system';
        const isAlert = msg.message_type === 'alert';
        const isDecision = msg.message_type === 'decision';

        if (isSystem) {
            return (
                <div style={{ textAlign: 'center', margin: '12px 0' }} key={msg.id}>
                    <Text type="secondary" style={{ fontSize: 12, background: '#334155', padding: '4px 12px', borderRadius: 12 }}>
                        {msg.content}
                    </Text>
                </div>
            );
        }

        let bg = isSelf ? '#ef4444' : '#334155';
        let borderColor = 'transparent';
        let label = null;

        if (isAlert) {
            bg = '#7f1d1d';
            borderColor = '#ef4444';
            label = <Tag color="red" icon={<WarningOutlined />}>URGENT ALERT</Tag>;
        } else if (isDecision) {
            bg = '#14532d';
            borderColor = '#22c55e';
            label = <Tag color="green" icon={<CheckCircleOutlined />}>OFFICIAL DECISION</Tag>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', margin: '8px 0' }} key={msg.id}>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{msg.sender_name}</Text>
                <div style={{
                    background: bg,
                    border: '1px solid ' + borderColor,
                    padding: '8px 14px',
                    borderRadius: 16,
                    borderBottomRightRadius: isSelf ? 2 : 16,
                    borderBottomLeftRadius: !isSelf ? 2 : 16,
                    maxWidth: '85%'
                }}>
                    {label && <div style={{ marginBottom: 4 }}>{label}</div>}
                    <Text style={{ color: '#fff' }}>{msg.content}</Text>
                </div>
            </div >
        );
    };

    return (
        <Card
            title={<Text style={{ color: '#fff' }}><MessageOutlined style={{ marginRight: 8 }} />Tactical Comms Feed</Text>}
            style={{ background: '#1e293b', borderColor: '#334155', height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#0f172a' }}>
                {messages.map(renderBubble)}
            </div>
            <div style={{ padding: '12px', background: '#1e293b', borderTop: '1px solid #334155' }}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={() => handleSend('text')}
                        placeholder="Type tactical update..."
                        style={{ background: '#0f172a', borderColor: '#334155', color: '#fff' }}
                    />
                    <Button type="primary" danger icon={<SendOutlined />} onClick={() => handleSend('text')} />
                    <Button danger icon={<AlertOutlined />} onClick={() => handleSend('alert')} title="Send Alert" />
                    <Button type="primary" style={{ background: '#22c55e' }} icon={<AuditOutlined />} onClick={() => handleSend('decision')} title="Log Decision" />
                </Space.Compact>
            </div>
        </Card>
    );
}
