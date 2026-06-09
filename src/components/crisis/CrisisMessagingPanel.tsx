import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Tag, Upload, Image, message, Tabs, List, Avatar, Popconfirm, Select } from 'antd';
import { SendOutlined, WarningOutlined, CheckCircleOutlined, AlertOutlined, AuditOutlined, MessageOutlined, CameraOutlined, LoadingOutlined, PictureOutlined, TeamOutlined, AudioOutlined, DeleteOutlined, UserOutlined, StopOutlined, PauseOutlined, CaretRightOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import { useCrisisSocket } from '@/hooks/useCrisisSocket';
import { useAuthStore, useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Text } = Typography;
const { Option } = Select;

function TacticalAudioPlayer({ src, isSelf, isDark, theme }: { src: string; isSelf: boolean; isDark: boolean; theme: any }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration || 0);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (audioRef.current && duration > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            const newTime = (clickX / width) * duration;
            audioRef.current.currentTime = newTime;
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            borderRadius: 14,
            background: isSelf ? 'rgba(255,255,255,0.12)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
            minWidth: 200,
            maxWidth: 260,
            marginTop: 4,
            backdropFilter: 'blur(4px)',
            border: isSelf ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${theme.divider}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        }}>
            <audio ref={audioRef} src={src} preload="metadata" />
            
            <Button
                type="text"
                shape="circle"
                size="small"
                icon={isPlaying ? <PauseOutlined style={{ color: isSelf ? '#fff' : rp.red500, fontSize: 12 }} /> : <CaretRightOutlined style={{ color: isSelf ? '#fff' : rp.red500, fontSize: 14, marginLeft: 2 }} />}
                onClick={togglePlay}
                style={{
                    background: isSelf ? 'rgba(255,255,255,0.2)' : 'rgba(220,38,38,0.1)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    minWidth: 30,
                    transition: 'all 0.2s ease',
                }}
                className="rd-action"
            />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div 
                    onClick={handleProgressClick}
                    style={{
                        height: 4,
                        width: '100%',
                        background: isSelf ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                        borderRadius: 2,
                        position: 'relative',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: isSelf ? '#fff' : rp.red500,
                        borderRadius: 2,
                        transition: 'width 0.1s linear',
                    }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.8, color: isSelf ? '#fff' : theme.textSub, fontFamily: rfont.data }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration || 0)}</span>
                </div>
            </div>
        </div>
    );
}


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
                <div style={{ textAlign: 'center', margin: '12px 0' }} key={msg.id} className="rd-fade-up">
                    <Tag style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', borderColor: t.cardBorder, color: t.textSub, borderRadius: 12, padding: '4px 12px', fontSize: 11, border: 'none' }}>
                        {msg.content}
                    </Tag>
                </div>
            );
        }

        let bg = '';
        let borderColor = 'transparent';
        let textColor = '';
        let label = null;
        let shadow = 'none';

        if (isSelf) {
            bg = `linear-gradient(135deg, ${rp.red500} 0%, #B91C1C 100%)`;
            textColor = '#FFFFFF';
            shadow = '0 3px 10px rgba(220,38,38,0.15)';
        } else {
            bg = isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9';
            textColor = isDark ? '#F0F4FF' : '#1E293B';
            shadow = '0 1px 2px rgba(0,0,0,0.02)';
        }

        if (isAlert) {
            bg = isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2';
            borderColor = rp.red500;
            textColor = isDark ? '#F87171' : '#B91C1C';
            label = (
                <Tag 
                    color="error" 
                    icon={<WarningOutlined className="rd-pulse-red" />} 
                    style={{ 
                        fontFamily: rfont.display, 
                        fontWeight: 700, 
                        borderRadius: rr.sm, 
                        fontSize: 9, 
                        letterSpacing: '0.04em',
                        border: 'none',
                        background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                        color: isDark ? '#F87171' : '#B91C1C',
                        marginBottom: 6
                    }}
                >
                    ALERTE TACTIQUE
                </Tag>
            );
            shadow = '0 4px 12px rgba(239, 68, 68, 0.08)';
        }
        if (isDecision) {
            bg = isDark ? 'rgba(34, 197, 94, 0.08)' : '#F0FDF4';
            borderColor = rp.grn500;
            textColor = isDark ? '#4ADE80' : '#15803D';
            label = (
                <Tag 
                    color="success" 
                    icon={<CheckCircleOutlined />} 
                    style={{ 
                        fontFamily: rfont.display, 
                        fontWeight: 700, 
                        borderRadius: rr.sm, 
                        fontSize: 9, 
                        letterSpacing: '0.04em',
                        border: 'none',
                        background: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                        color: isDark ? '#4ADE80' : '#15803D',
                        marginBottom: 6
                    }}
                >
                    DÉCISION OFFICIELLE
                </Tag>
            );
            shadow = '0 4px 12px rgba(34, 197, 94, 0.08)';
        }

        const leftBorderWidth = (isAlert || isDecision) ? '4px' : '0px';
        const leftBorderColor = isAlert ? rp.red500 : (isDecision ? rp.grn500 : 'transparent');

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
                        <TacticalAudioPlayer src={urlMatch[1]} isSelf={isSelf} isDark={isDark} theme={t} />
                    );
                }
            }
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', margin: '8px 0' }} key={msg.id} className="rd-fade-up">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 11, color: t.textSub, fontFamily: rfont.body, fontWeight: 600 }}>{msg.sender_name}</Text>
                    {msg.sent_at && <Text style={{ fontSize: 9, color: t.textSub, opacity: 0.6 }}>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
                </div>
                <div style={{
                    background: bg,
                    border: (isAlert || isDecision) ? `1px solid ${borderColor}` : 'none',
                    borderLeft: (isAlert || isDecision) ? `${leftBorderWidth} solid ${leftBorderColor}` : 'none',
                    padding: '10px 14px',
                    borderRadius: 16,
                    borderBottomRightRadius: isSelf ? 2 : 16,
                    borderBottomLeftRadius: !isSelf ? 2 : 16,
                    maxWidth: '85%',
                    boxShadow: shadow,
                    transition: 'all 0.2s ease',
                }}>
                    {label && <div style={{ marginBottom: 4 }}>{label}</div>}
                    <div style={{ color: textColor, fontFamily: rfont.body, fontSize: 13, lineHeight: '1.4' }}>{renderedContent}</div>
                </div>
            </div >
        );
    };

    const chatContent = (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderBottom: `1px solid ${t.divider}` }} className="rd-scroll">
                {visibleMessages.map(renderBubble)}
                {Object.keys(typingUsers).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '0 4px' }} className="rd-fade-up">
                        <LoadingOutlined style={{ color: t.textSub, fontSize: 11 }} />
                        <Text style={{ fontSize: 11, color: t.textSub, fontStyle: 'italic', fontFamily: rfont.body }}>
                            {Object.values(typingUsers).join(', ')} tape...
                        </Text>
                    </div>
                )}
            </div>
            {canWrite && (
                <div style={{ padding: '12px 16px', background: isDark ? 'rgba(30,41,59,0.95)' : '#FFFFFF', borderTop: `1px solid ${t.divider}` }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: (isStrategicAllowed && inputValue.trim()) ? 10 : 0 }}>
                        <Upload
                            showUploadList={false}
                            beforeUpload={(file) => { handleImageUpload({ file }); return false; }}
                            disabled={isClosed || uploading || isRecording}
                        >
                            <Button 
                                type="text" 
                                shape="circle"
                                disabled={isClosed || uploading || isRecording} 
                                icon={uploading ? <LoadingOutlined style={{ color: rp.red500 }} /> : <CameraOutlined style={{ fontSize: 16, color: t.textSub }} />} 
                                style={{ 
                                    width: 36,
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                                    border: 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                className="rd-action"
                            />
                        </Upload>
                        <Button 
                            type={isRecording ? "primary" : "text"} 
                            danger={isRecording}
                            shape={isRecording ? "round" : "circle"}
                            disabled={isClosed || uploading} 
                            onClick={isRecording ? stopRecording : startRecording}
                            icon={isRecording ? <StopOutlined className="rd-pulse-red" /> : <AudioOutlined style={{ fontSize: 16, color: t.textSub }} />} 
                            style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                width: isRecording ? undefined : 36,
                                height: 36,
                                color: isRecording ? '#fff' : t.textSub,
                                background: isRecording ? '#dc2626' : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                                minWidth: isRecording ? 84 : 36,
                                border: 'none',
                                transition: 'all 0.2s ease',
                            }} 
                            className="rd-action"
                        >
                            {isRecording && <span style={{ fontFamily: rfont.data, fontSize: 11, fontWeight: 700 }}>{Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}</span>}
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
                                flex: 1,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                                transition: 'all 0.3s ease',
                            }}
                        />
                        <Button 
                            type="primary" 
                            shape="circle"
                            danger 
                            disabled={isClosed || isRecording || (!inputValue.trim() && !uploading)} 
                            icon={<SendOutlined />} 
                            onClick={() => handleSend('text')} 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 36,
                                height: 36,
                                minWidth: 36,
                                background: `linear-gradient(135deg, ${rp.red500} 0%, #B91C1C 100%)`,
                                border: 'none',
                                boxShadow: (!inputValue.trim() && !uploading) ? 'none' : '0 3px 8px rgba(220,38,38,0.25)',
                                transition: 'all 0.2s ease',
                            }}
                            className="rd-action"
                        />
                    </div>
                    {isStrategicAllowed && inputValue.trim() && (
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }} className="rd-fade-up">
                            <Button 
                                size="small"
                                danger 
                                disabled={isClosed || isRecording || !inputValue.trim()} 
                                icon={<AlertOutlined />} 
                                onClick={() => handleSend('alert')}
                                style={{ 
                                    borderRadius: 14, 
                                    fontSize: 11, 
                                    fontWeight: 700,
                                    fontFamily: rfont.display,
                                    padding: '4px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    boxShadow: '0 2px 6px rgba(220,38,38,0.15)',
                                }}
                                className="rd-action"
                            >
                                Déclarer Alerte
                            </Button>
                            <Button 
                                size="small"
                                type="primary" 
                                disabled={isClosed || isRecording || !inputValue.trim()} 
                                style={{ 
                                    background: `linear-gradient(135deg, ${rp.grn600} 0%, ${rp.grn500} 100%)`, 
                                    borderColor: 'transparent',
                                    borderRadius: 14, 
                                    fontSize: 11, 
                                    fontWeight: 700, 
                                    fontFamily: rfont.display,
                                    padding: '4px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    boxShadow: '0 2px 6px rgba(34,197,94,0.2)',
                                }} 
                                icon={<AuditOutlined />} 
                                onClick={() => handleSend('decision')}
                                className="rd-action"
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
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, minHeight: 0 }} className="rd-scroll">
            {mediaMessages.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: 40, color: t.textSub, fontFamily: rfont.body }}>Aucun média partagé.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {mediaMessages.map(msg => (
                        <div key={msg.id} style={{ padding: 12, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: 8, border: `1px solid ${t.cardBorder}` }} className="rd-fade-up">
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
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, minHeight: 0 }} className="rd-scroll">
            <List
                itemLayout="horizontal"
                dataSource={participants}
                renderItem={item => (
                    <List.Item
                        className="rd-fade-up"
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
                    <MessageOutlined style={{ color: rp.red500, fontSize: 16 }} />
                    <Text style={{ fontFamily: rfont.display, fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: '-0.02em' }}>Communications & Tactique</Text>
                </Space>
            }
            bodyStyle={{ 
                padding: 0, 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden' 
            }}
            style={{
                borderRadius: rr.lg,
                borderColor: t.cardBorder,
                background: t.cardBg,
                boxShadow: t.cardShadow,
                borderWidth: 2,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 550
            }}
            headStyle={{ borderBottom: `1px solid ${t.divider}`, background: t.cardBg, minHeight: 48 }}
        >
            <style>{`
                .nexus-tabs-full-height {
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    flex: 1 !important;
                }
                .nexus-tabs-full-height > .ant-tabs-nav {
                    margin-bottom: 0 !important;
                    padding: 0 8px !important;
                }
                .nexus-tabs-full-height > .ant-tabs-content-holder {
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    min-height: 0 !important;
                }
                .nexus-tabs-full-height .ant-tabs-content {
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                .nexus-tabs-full-height .ant-tabs-tabpane {
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    min-height: 0 !important;
                }
            `}</style>
            <Tabs 
                defaultActiveKey="1" 
                className="nexus-tabs-full-height"
                items={[
                    { key: '1', label: <span style={{ padding: '0 8px', fontFamily: rfont.display, fontWeight: 600, fontSize: 13 }}><MessageOutlined /> Chat</span>, children: chatContent },
                    { key: '2', label: <span style={{ padding: '0 8px', fontFamily: rfont.display, fontWeight: 600, fontSize: 13 }}><PictureOutlined /> Médias</span>, children: mediaContent },
                    { key: '3', label: <span style={{ padding: '0 8px', fontFamily: rfont.display, fontWeight: 600, fontSize: 13 }}><TeamOutlined /> Participants</span>, children: participantsContent }
                ]}
            />
        </Card>
    );
}
