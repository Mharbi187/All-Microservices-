import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Tag, Upload, Image, message, Tabs, List, Avatar, Popconfirm, Select } from 'antd';
import { SendOutlined, WarningOutlined, CheckCircleOutlined, AlertOutlined, AuditOutlined, MessageOutlined, CameraOutlined, LoadingOutlined, PictureOutlined, TeamOutlined, AudioOutlined, DeleteOutlined, UserOutlined, StopOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import { useCrisisSocket } from '@/hooks/useCrisisSocket';
import { useAuthStore, useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Text } = Typography;
const { Option } = Select;

export default function CrisisMessagingPanel({ roomId, initialMessages, initialParticipants = [], isClosed, canWrite = true, isStrategicAllowed = true }: { roomId: string, initialMessages: any[], initialParticipants?: any[], isClosed?: boolean, canWrite?: boolean, isStrategicAllowed?: boolean }) {
    const { user } = useAuthStore();
    const { messages, participants, typingUsers, sendTypingIndicator, setInitialMessages, setInitialParticipants } = useCrisisSocket(roomId);
    const [inputValue, setInputValue] = useState('');
    const [uploading, setUploading] = useState(false);
    
    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    
    const isVolunteerOnly = !isStrategicAllowed;

    const CLOUDINARY_CLOUD_NAME = 'doxmfj1cw'; 
    const CLOUDINARY_UPLOAD_PRESET = 'exus_aid_preset';

    const visibleMessages = [...messages].filter(msg => {
        if (isVolunteerOnly && (msg.message_type === 'decision' || msg.message_type === 'alert')) {
            return false;
        }
        return true;
    }).sort((a, b) => {
        const timeA = a.sent_at ? new Date(a.sent_at).getTime() : 0;
        const timeB = b.sent_at ? new Date(b.sent_at).getTime() : 0;
        return timeA - timeB;
    });

    const mediaMessages = visibleMessages.filter(msg => 
        msg.content?.startsWith('![image]') || msg.content?.startsWith('![audio]')
    );

    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    useEffect(() => {
        setInitialMessages(initialMessages);
        setInitialParticipants(initialParticipants);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (type: string = 'text', customContent?: string) => {
        const contentToSend = customContent !== undefined ? customContent : inputValue;
        if (!contentToSend.trim() || !user) return;
        const currentName = user.fullName || "Utilisateur";
        
        try {
            await crisisApi.sendMessage(roomId, user.id, currentName, contentToSend, type);
            if (customContent === undefined) {
                setInputValue('');
                sendTypingIndicator(user.id, currentName, false);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const uploadToCloudinary = async (file: Blob, resourceType: 'image' | 'video' = 'image') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        return await res.json();
    };

    const handleImageUpload = async (info: any) => {
        if (!user) return;
        try {
            setUploading(true);
            const data = await uploadToCloudinary(info.file, 'image');
            await handleSend('text', `![image](${data.secure_url})`);
        } catch (error) {
            console.error('Image upload error:', error);
            message.error("L'envoi de l'image a échoué.");
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                try {
                    setUploading(true);
                    // Cloudinary handles audio via the 'video' resource type
                    const data = await uploadToCloudinary(audioBlob, 'video');
                    await handleSend('voice', `![audio](${data.secure_url})`);
                } catch (error) {
                    console.error('Audio upload error:', error);
                    message.error("L'envoi du message vocal a échoué.");
                } finally {
                    setUploading(false);
                    setRecordingTime(0);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 300) { // 5 minutes max
                        stopRecording();
                        return 0;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone", err);
            message.error("Impossible d'accéder au microphone. Vérifiez vos permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        if (user) {
            sendTypingIndicator(user.id, user.fullName || "Utilisateur", val.trim().length > 0);
        }
    };

    const handleRemoveParticipant = async (userId: string) => {
        try {
            await crisisApi.removeParticipant(roomId, userId);
            message.success("Participant retiré avec succès.");
        } catch (e) {
            message.error("Erreur lors de la suppression.");
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await crisisApi.updateParticipantRole(roomId, userId, newRole);
            message.success("Rôle mis à jour.");
        } catch (e) {
            message.error("Erreur lors de la modification du rôle.");
        }
    };

    const renderBubble = (msg: any) => {
        const isSelf = msg.sender_id === user?.id;
        const isSystem = msg.message_type === 'system';
        const isAlert = msg.message_type === 'alert';
        const isDecision = msg.message_type === 'decision';

        if (isSystem) {
            return (
                <div style={{ textAlign: 'center', margin: '8px 0' }} key={msg.id}>
                    <Tag style={{ background: t.cardBg, borderColor: t.cardBorder, color: t.textSub, borderRadius: 12, padding: '4px 12px', fontSize: 11 }}>
                        {msg.content}
                    </Tag>
                </div>
            );
        }

        let bg = isSelf ? 'rgba(220,38,38,0.1)' : t.cardBg;
        let borderColor = isSelf ? 'rgba(220,38,38,0.3)' : t.cardBorder;
        let textColor = isSelf ? t.text : t.textSub;
        let label = null;

        if (isAlert) {
            bg = isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7';
            borderColor = isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A';
            textColor = isDark ? '#FCD34D' : '#D97706';
            label = <Tag color="warning" icon={<WarningOutlined />} style={{ fontFamily: rfont.data, fontWeight: 700, borderRadius: rr.sm, fontSize: 9 }}>ALERTE TACTIQUE</Tag>;
        }
        if (isDecision) {
            bg = isDark ? 'rgba(16, 185, 129, 0.1)' : '#D1FAE5';
            borderColor = isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0';
            textColor = isDark ? '#6EE7B7' : '#059669';
            label = <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontFamily: rfont.data, fontWeight: 700, borderRadius: rr.sm, fontSize: 9 }}>DÉCISION OFFICIELLE</Tag>;
        }

        let renderedContent: React.ReactNode = msg.content;
        if (msg.content) {
            if (msg.content.startsWith('![image](')) {
                const urlMatch = msg.content.match(/!\[image\]\((.*?)\)/);
                if (urlMatch && urlMatch[1]) {
                    renderedContent = (
                        <div style={{ marginTop: 4 }}>
                            <Image src={urlMatch[1]} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                        </div>
                    );
                }
            } else if (msg.content.startsWith('![audio](')) {
                const urlMatch = msg.content.match(/!\[audio\]\((.*?)\)/);
                if (urlMatch && urlMatch[1]) {
                    renderedContent = (
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <audio controls src={urlMatch[1]} style={{ height: 40, outline: 'none', maxWidth: 220 }} />
                        </div>
                    );
                }
            }
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', margin: '8px 0' }} key={msg.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 11, color: t.textSub, fontFamily: rfont.body, fontWeight: 600 }}>{msg.sender_name}</Text>
                    {msg.sent_at && <Text style={{ fontSize: 9, color: t.textSub, opacity: 0.7 }}>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
                </div>
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
                    <div style={{ color: textColor, fontFamily: rfont.body, fontSize: 13 }}>{renderedContent}</div>
                </div>
            </div >
        );
    };

    const chatContent = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderBottom: `1px solid ${t.divider}` }} className="rd-scroll">
                {visibleMessages.map(renderBubble)}
                {Object.keys(typingUsers).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <LoadingOutlined style={{ color: t.textSub, fontSize: 12 }} />
                        <Text style={{ fontSize: 11, color: t.textSub, fontStyle: 'italic' }}>
                            {Object.values(typingUsers).join(', ')} tape...
                        </Text>
                    </div>
                )}
            </div>
            {canWrite && (
                <div style={{ padding: '12px 16px', background: isDark ? 'rgba(30,41,59,0.95)' : '#FFFFFF', borderTop: `1px solid ${t.divider}` }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: isStrategicAllowed ? 12 : 0 }}>
                        <Upload
                            showUploadList={false}
                            beforeUpload={(file) => { handleImageUpload({ file }); return false; }}
                            disabled={isClosed || uploading || isRecording}
                        >
                            <Button 
                                type="text" 
                                shape="circle"
                                disabled={isClosed || uploading || isRecording} 
                                icon={uploading ? <LoadingOutlined /> : <CameraOutlined style={{ fontSize: 18 }} />} 
                                style={{ color: t.textSub, background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }} 
                            />
                        </Upload>
                        <Button 
                            type={isRecording ? "primary" : "text"} 
                            danger={isRecording}
                            shape={isRecording ? "round" : "circle"}
                            disabled={isClosed || uploading} 
                            onClick={isRecording ? stopRecording : startRecording}
                            icon={isRecording ? <StopOutlined /> : <AudioOutlined style={{ fontSize: 18 }} />} 
                            style={{ 
                                color: isRecording ? '#fff' : t.textSub,
                                background: isRecording ? '#dc2626' : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                                minWidth: isRecording ? 80 : undefined
                            }} 
                        >
                            {isRecording && `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`}
                        </Button>
                        
                        <Input
                            value={inputValue}
                            onChange={handleInputChange}
                            onPressEnter={() => handleSend('text')}
                            placeholder={isClosed ? "La salle de crise est clôturée" : isRecording ? "Enregistrement audio en cours..." : "Saisissez votre message..."}
                            disabled={isClosed || isRecording}
                            bordered={false}
                            style={{
                                background: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC',
                                color: t.text,
                                fontFamily: rfont.body,
                                borderRadius: 20,
                                padding: '8px 16px',
                                flex: 1
                            }}
                        />
                        <Button 
                            type="primary" 
                            shape="circle"
                            danger 
                            disabled={isClosed || isRecording || (!inputValue.trim() && !uploading)} 
                            icon={<SendOutlined />} 
                            onClick={() => handleSend('text')} 
                        />
                    </div>
                    {isStrategicAllowed && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button 
                                size="small"
                                danger 
                                disabled={isClosed || isRecording || !inputValue.trim()} 
                                icon={<AlertOutlined />} 
                                onClick={() => handleSend('alert')}
                                style={{ borderRadius: 12, fontSize: 11, fontWeight: 600 }}
                            >
                                Déclarer Alerte
                            </Button>
                            <Button 
                                size="small"
                                type="primary" 
                                disabled={isClosed || isRecording || !inputValue.trim()} 
                                style={{ background: rp.grn500, borderColor: rp.grn500, borderRadius: 12, fontSize: 11, fontWeight: 600 }} 
                                icon={<AuditOutlined />} 
                                onClick={() => handleSend('decision')}
                            >
                                Noter Décision
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const mediaContent = (
        <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }} className="rd-scroll">
            {mediaMessages.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: 40, color: t.textSub }}>Aucun média partagé.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {mediaMessages.map(msg => (
                        <div key={msg.id} style={{ padding: 12, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: 8, border: `1px solid ${t.cardBorder}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{msg.sender_name}</Text>
                                {msg.sent_at && <Text style={{ fontSize: 10, color: t.textSub }}>{new Date(msg.sent_at).toLocaleDateString()} {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
                            </div>
                            {renderBubble(msg)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const participantsContent = (
        <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }} className="rd-scroll">
            <List
                itemLayout="horizontal"
                dataSource={participants}
                renderItem={item => (
                    <List.Item
                        actions={isStrategicAllowed ? [
                            <Select 
                                size="small" 
                                defaultValue={item.role} 
                                style={{ width: 140 }} 
                                onChange={(val) => handleRoleChange(item.user_id, val)}
                            >
                                <Option value="president">Président</Option>
                                <Option value="vice_president">Vice-Président</Option>
                                <Option value="catastrophe_manager">Resp. Catastrophe</Option>
                                <Option value="coordinator">Coordinateur</Option>
                                <Option value="team_leader">Team Leader</Option>
                                <Option value="volunteer">Volontaire</Option>
                                <Option value="ndrt_member">Membre NDRT</Option>
                                <Option value="rdrt_member">Membre RDRT</Option>
                            </Select>,
                            <Popconfirm title="Retirer ce membre ?" onConfirm={() => handleRemoveParticipant(item.user_id)}>
                                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                            </Popconfirm>
                        ] : []}
                    >
                        <List.Item.Meta
                            avatar={<Avatar icon={<UserOutlined />} style={{ background: item.is_online ? rp.grn500 : '#888' }} />}
                            title={<Text style={{ color: t.text, fontWeight: 600 }}>{item.name}</Text>}
                            description={
                                <Space>
                                    <Tag color={item.is_online ? 'success' : 'default'} style={{ fontSize: 10, margin: 0 }}>
                                        {item.is_online ? 'En ligne' : 'Hors ligne'}
                                    </Tag>
                                    <Text style={{ fontSize: 11, color: t.textSub }}>{item.role}</Text>
                                </Space>
                            }
                        />
                    </List.Item>
                )}
            />
        </div>
    );

    return (
        <Card
            title={
                <Space>
                    <MessageOutlined style={{ color: rp.red500 }} />
                    <Text style={{ fontFamily: rfont.display, fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: '-0.02em' }}>Communications & Tactique</Text>
                </Space>
            }
            bodyStyle={{ 
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                overflow: 'hidden'
            }}
            style={{
                borderRadius: rr.lg,
                borderColor: t.cardBorder,
                background: t.cardBg,
                boxShadow: t.cardShadow,
                borderWidth: 2,
                overflow: 'hidden',
                height: 480,
                display: 'flex',
                flexDirection: 'column'
            }}
            headStyle={{ borderBottom: `1px solid ${t.divider}`, background: t.cardBg, minHeight: 48 }}
        >
            <Tabs 
                defaultActiveKey="1" 
                style={{ padding: '0 8px' }}
                className="crisis-messaging-tabs"
                items={[
                    { key: '1', label: <span style={{ padding: '0 8px' }}><MessageOutlined /> Chat</span>, children: chatContent },
                    { key: '2', label: <span style={{ padding: '0 8px' }}><PictureOutlined /> Médias</span>, children: mediaContent },
                    { key: '3', label: <span style={{ padding: '0 8px' }}><TeamOutlined /> Participants</span>, children: participantsContent }
                ]}
            />
            <style>{`
                .crisis-messaging-tabs {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .crisis-messaging-tabs .ant-tabs-content-holder {
                    flex: 1;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                }
                .crisis-messaging-tabs .ant-tabs-content {
                    height: 100%;
                }
                .crisis-messaging-tabs .ant-tabs-tabpane {
                    height: 100%;
                }
                /* Custom modern scrollbar matching the tactical C2 theme */
                .crisis-messaging-tabs .rd-scroll::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .crisis-messaging-tabs .rd-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .crisis-messaging-tabs .rd-scroll::-webkit-scrollbar-thumb {
                    background: ${isDark ? 'rgba(220, 38, 38, 0.3)' : 'rgba(220, 38, 38, 0.25)'};
                    border-radius: 999px;
                    transition: background 0.15s ease;
                }
                .crisis-messaging-tabs .rd-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(220, 38, 38, 0.6) !important;
                }
            `}</style>
        </Card>
    );
}
