import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Tag } from 'antd';
import { SendOutlined, WarningOutlined, CheckCircleOutlined, AlertOutlined, AuditOutlined, MessageOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import { useCrisisSocket } from '@/hooks/useCrisisSocket';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Text } = Typography;

export default function CrisisMessagingPanel({ roomId, initialMessages }: { roomId: string, initialMessages: any[] }) {
    const { messages, setInitialMessages } = useCrisisSocket(roomId);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

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
                    <Text style={{ fontSize: 11, color: t.textSub, background: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', padding: '4px 12px', borderRadius: 12, fontFamily: rfont.body }}>
                        {msg.content}
                    </Text>
                </div>
            );
        }

        let bg = isSelf 
            ? `linear-gradient(135deg, ${rp.red600}, ${rp.red500})` 
            : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0');
        let textColor = isSelf ? '#FFFFFF' : t.text;
        let borderColor = isSelf ? 'transparent' : (isDark ? 'rgba(255,255,255,0.04)' : '#CBD5E1');
        let label = null;

        if (isAlert) {
            bg = isDark ? '#7f1d1d' : '#FEE2E2';
            borderColor = rp.red500;
            textColor = isDark ? '#FFFFFF' : rp.red600;
            label = <Tag color="red" icon={<WarningOutlined />} style={{ fontFamily: rfont.data, fontWeight: 700, borderRadius: rr.sm, fontSize: 9 }}>ALERTE URGENTE</Tag>;
        } else if (isDecision) {
            bg = isDark ? '#14532d' : '#DCFCE7';
            borderColor = rp.grn500;
            textColor = isDark ? '#FFFFFF' : rp.grn600;
            label = <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontFamily: rfont.data, fontWeight: 700, borderRadius: rr.sm, fontSize: 9 }}>DÉCISION OFFICIELLE</Tag>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', margin: '8px 0' }} key={msg.id}>
                <Text style={{ fontSize: 11, color: t.textSub, marginBottom: 2, fontFamily: rfont.body }}>{msg.sender_name}</Text>
                <div style={{
                    background: bg,
                    border: '1px solid ' + borderColor,
                    padding: '8px 14px',
                    borderRadius: 16,
                    borderBottomRightRadius: isSelf ? 2 : 16,
                    borderBottomLeftRadius: !isSelf ? 2 : 16,
                    maxWidth: '85%',
                    boxShadow: isSelf ? '0 2px 8px rgba(220,38,38,0.2)' : 'none',
                }}>
                    {label && <div style={{ marginBottom: 4 }}>{label}</div>}
                    <Text style={{ color: textColor, fontFamily: rfont.body, fontSize: 13 }}>{msg.content}</Text>
                </div>
            </div >
        );
    };

    return (
        <Card
            title={<Text style={{ color: t.text, fontFamily: rfont.display, fontWeight: 700, fontSize: 14 }}><MessageOutlined style={{ marginRight: 8 }} />Tactical Comms Feed</Text>}
            style={{
                background: t.cardBg,
                borderColor: t.cardBorder,
                borderRadius: rr.lg,
                boxShadow: t.cardShadow,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
            }}
            bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderBottom: `1px solid ${t.divider}` }} className="rd-scroll">
                {messages.map(renderBubble)}
            </div>
            <div style={{ padding: '12px', background: t.cardBg, borderTop: `1px solid ${t.divider}` }}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={() => handleSend('text')}
                        placeholder="Tapez un message tactique..."
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                            borderColor: t.cardBorder,
                            color: t.text,
                            fontFamily: rfont.body,
                            borderRadius: `${rr.sm}px 0 0 ${rr.sm}px`,
                        }}
                    />
                    <Button type="primary" danger icon={<SendOutlined />} onClick={() => handleSend('text')} style={{ borderRadius: 0 }} />
                    <Button danger icon={<AlertOutlined />} onClick={() => handleSend('alert')} title="Envoyer Alerte" style={{ borderRadius: 0 }} />
                    <Button type="primary" style={{ background: rp.grn500, borderColor: rp.grn500, borderRadius: `0 ${rr.sm}px ${rr.sm}px 0` }} icon={<AuditOutlined />} onClick={() => handleSend('decision')} title="Enregistrer Décision" />
                </Space.Compact>
            </div>
        </Card>
    );
}
