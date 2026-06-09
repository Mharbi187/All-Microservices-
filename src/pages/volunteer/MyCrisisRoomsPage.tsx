import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Spin, Button, Tag, notification, Empty } from 'antd';
import { MessageOutlined, SafetyOutlined, ClockCircleOutlined, CalendarOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import { crisisApi } from '@/services/crisisApi';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

const { Title, Text, Paragraph } = Typography;
dayjs.locale('fr');

interface VolunteerCrisisRoom {
    room: {
        id: string;
        disaster_id: string;
        disaster_name: string;
        status: string;
        activated_at: string;
        video_call_url: string;
    };
    participants_count: number;
}

export default function MyCrisisRoomsPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<VolunteerCrisisRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        setLoading(true);
        crisisApi.getMyCrisisRooms(user.id)
            .then((data) => {
                setRooms(data);
            })
            .catch(() => {
                notification.error({
                    message: 'Erreur',
                    description: 'Impossible de récupérer vos salles de crise.'
                });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [user?.id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'red';
            case 'inactive': return 'default';
            case 'closed': return 'green';
            case 'standby': return 'orange';
            default: return 'blue';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <Title level={2} className="m-0 flex items-center gap-3">
                    <MessageOutlined className="text-red-600" />
                    Mes Salles de Crise
                </Title>
                <Text type="secondary" className="mt-1 block text-base">
                    Accédez aux espaces de communication tactique pour les interventions auxquelles vous êtes assigné(e).
                </Text>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Spin size="large" />
                </div>
            ) : rooms.length === 0 ? (
                <Card className="text-center p-12 bg-gray-50 border-dashed">
                    <Empty
                        image={<MessageOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                        description={<Text type="secondary">Vous n'avez été invité(e) à aucune salle de crise.</Text>}
                    />
                </Card>
            ) : (
                <Row gutter={[24, 24]}>
                    {rooms.map((item) => (
                        <Col xs={24} md={12} lg={8} key={item.room.id}>
                            <Card
                                hoverable
                                className="h-full flex flex-col shadow-sm border-gray-200"
                                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                actions={[
                                    <Button type="primary" danger icon={<MessageOutlined />} onClick={() => navigate(`/crisis-room/${item.room.id}`)}>
                                        Rejoindre la Discussion
                                    </Button>
                                ]}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <Tag color={getStatusColor(item.room.status)} className="m-0 font-medium px-3 py-1 text-xs rounded-full uppercase">
                                        {item.room.status}
                                    </Tag>
                                    <Text className="text-gray-400 text-xs font-mono">
                                        {item.participants_count} Participant(s)
                                    </Text>
                                </div>

                                <Title level={4} className="mt-0 mb-2 line-clamp-2">
                                    {item.room.disaster_name}
                                </Title>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <CalendarOutlined className="mr-2 text-gray-400" />
                                        <span>Créée le: {item.room.activated_at ? dayjs(item.room.activated_at).format('DD MMM YYYY, HH:mm') : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <SafetyOutlined className="mr-2 text-gray-400" />
                                        <span>Rôle: Membre Intervenant</span>
                                    </div>
                                    {item.room.video_call_url && (
                                        <div className="flex items-center text-sm text-blue-600">
                                            <VideoCameraOutlined className="mr-2" />
                                            <a href={item.room.video_call_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Lien Visioconférence</a>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}
