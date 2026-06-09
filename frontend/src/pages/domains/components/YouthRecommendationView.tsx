import React from 'react';
import { Card, Typography, Divider, Badge, Descriptions, Tag, Space, Button, Row, Col } from 'antd';
import { 
    StarOutlined, 
    RobotOutlined, 
    ThunderboltOutlined, 
    EnvironmentOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface RecommendationViewProps {
    recommendation: any;
    volunteerName: string;
    onClose: () => void;
}

const YouthRecommendationView: React.FC<RecommendationViewProps> = ({ recommendation, volunteerName, onClose }) => {
    if (!recommendation) return null;

    const isAiGenerated = recommendation.status === 'GÉNÉRÉ';

    return (
        <Card 
            variant="borderless" 
            style={{ 
                borderRadius: 28, 
                boxShadow: '0 15px 40px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                background: '#fff'
            }}
            styles={{ body: { padding: 0 } }}
        >
            {/* Header */}
            <div style={{ 
                background: isAiGenerated ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'linear-gradient(135deg, #10B981, #059669)', 
                padding: '32px 32px 40px',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ 
                            width: 52, height: 52, borderRadius: 16, 
                            background: 'rgba(255, 255, 255, 0.2)', 
                            backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            color: '#fff'
                        }}>
                            {isAiGenerated ? <RobotOutlined style={{ fontSize: 24 }} /> : <StarOutlined style={{ fontSize: 24 }} />}
                        </div>
                        <div>
                            <Title level={3} style={{ margin: 0, color: '#fff', fontWeight: 800 }}>
                                Rapport d'Intégration
                            </Title>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                                <EnvironmentOutlined style={{ marginRight: 6 }} />
                                Volontaire : <b>{volunteerName}</b>
                            </Text>
                        </div>
                    </div>
                    
                    <Badge count={isAiGenerated ? "IA ANALYSE" : "MANUEL"} style={{ backgroundColor: isAiGenerated ? '#fff' : '#fff', color: isAiGenerated ? '#4F46E5' : '#10B981', fontWeight: 800 }} />
                </div>
            </div>

            <div style={{ padding: '32px', marginTop: -20, background: '#fff', borderRadius: '32px 32px 0 0', position: 'relative' }}>
                <Descriptions title={<Space><ThunderboltOutlined style={{ color: '#4F46E5' }} /> Résumé du Profil</Space>} bordered column={2}>
                    <Descriptions.Item label="Titre">{recommendation.title}</Descriptions.Item>
                    <Descriptions.Item label="Catégorie"><Tag color="geekblue">{recommendation.category}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Priorité">
                        <Tag color={recommendation.priority === 'HIGH' || recommendation.priority === 'Haute' ? 'red' : 'orange'}>
                            {recommendation.priority}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date">{dayjs(recommendation.dateCreation).format('DD MMMM YYYY')}</Descriptions.Item>
                </Descriptions>

                <Divider />

                <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                        Détails & Analyse
                    </Text>
                    <div style={{ 
                        padding: 20, 
                        background: '#f9fafb', 
                        borderRadius: 16, 
                        border: '1px solid #f3f4f6',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {recommendation.description}
                    </div>
                </div>

                <Row gutter={20}>
                    <Col span={12}>
                        <Text strong style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                            Formations Recommendées (IA)
                        </Text>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {(recommendation.recommendedTrainingIA || []).map((t: string, i: number) => (
                                <Tag key={i} color="blue" icon={<CheckCircleOutlined />} style={{ borderRadius: 8, padding: '4px 12px' }}>{t}</Tag>
                            ))}
                        </Space>
                    </Col>
                    <Col span={12}>
                        <Text strong style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                            Missions Suggérées
                        </Text>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {(recommendation.recommendedMissions || []).map((m: string, i: number) => (
                                <Tag key={i} color="purple" icon={<EnvironmentOutlined />} style={{ borderRadius: 8, padding: '4px 12px' }}>{m}</Tag>
                            ))}
                        </Space>
                    </Col>
                </Row>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 40 }}>
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={onClose}
                        style={{ 
                            borderRadius: 16, 
                            height: 52, 
                            padding: '0 40px', 
                            fontWeight: 700,
                            background: isAiGenerated ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#10B981',
                            border: 'none',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                        }}
                    >
                        Fermer le rapport
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default YouthRecommendationView;
