// ============================================================
// NEXUS-AID — Ressources Éducatives (Educational Resources Page)
// Browse educational resources from GET /diffusion/resources
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
    Card, Typography, Tag, Space, Spin, Row, Col, Input, Select, Empty,
    List, Avatar, Button, Tooltip, Badge, Segmented, Alert,
} from 'antd';
import {
    BookOutlined, SearchOutlined, FileTextOutlined, VideoCameraOutlined,
    ReadOutlined, GlobalOutlined, PlayCircleOutlined, DownloadOutlined,
    FilterOutlined, AppstoreOutlined, UnorderedListOutlined, LinkOutlined,
} from '@ant-design/icons';
import { diffusionService } from '@/services/domainServices';
import { useAuthStore } from '@/stores';
import type { EducationalResourceDTO } from '@/types';
import { toRelativeUrl } from '@/utils';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const contentTypeIcons: Record<string, React.ReactNode> = {
    PDF: <FileTextOutlined style={{ color: '#dc2626' }} />,
    VIDEO: <VideoCameraOutlined style={{ color: '#7c3aed' }} />,
    ARTICLE: <ReadOutlined style={{ color: '#2563eb' }} />,
};

const contentTypeColors: Record<string, string> = {
    PDF: 'red',
    VIDEO: 'purple',
    ARTICLE: 'blue',
};

const categoryColors: Record<string, string> = {
    PREMIER_SECOURS: 'volcano',
    DIH: 'geekblue',
    PRINCIPES_FONDAMENTAUX: 'gold',
    SANTE: 'green',
    JEUNESSE: 'cyan',
};

const ResourcesPage: React.FC = () => {
    const { user } = useAuthStore();
    const [resources, setResources] = useState<EducationalResourceDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isApproved = user?.status === 'APPROVED';

    useEffect(() => {
        if (isApproved) loadData();
        else setLoading(false);
    }, [isApproved]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await diffusionService.getResources();
            setResources(data);
        } catch (err) {
            console.error('Failed to load resources:', err);
        } finally {
            setLoading(false);
        }
    };

    // Unique categories and types
    const categories = useMemo(() => {
        const cats = [...new Set(resources.map((r) => r.category).filter(Boolean))];
        return cats;
    }, [resources]);

    const contentTypes = useMemo(() => {
        const types = [...new Set(resources.map((r) => r.contentType).filter(Boolean))];
        return types;
    }, [resources]);

    // Filtered resources
    const filtered = useMemo(() => {
        return resources.filter((r) => {
            const matchSearch = searchTerm === '' ||
                r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.topic?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCategory = filterCategory === 'ALL' || r.category === filterCategory;
            const matchType = filterType === 'ALL' || r.contentType === filterType;
            return matchSearch && matchCategory && matchType;
        });
    }, [resources, searchTerm, filterCategory, filterType]);

    if (!isApproved) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
                <Alert
                    message="Accès restreint"
                    description="Vous devez être approuvé par le président de votre comité pour accéder à cette section. Votre demande est en cours de traitement."
                    type="warning"
                    showIcon
                    style={{ borderRadius: 12 }}
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Chargement des ressources...">
                    <div style={{ width: 1, height: 1 }} />
                </Spin>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <Card
                style={{
                    borderRadius: 16,
                    marginBottom: 24,
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%)',
                    border: 'none',
                }}
            >
                <Row align="middle" gutter={24}>
                    <Col>
                        <BookOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.9 }} />
                    </Col>
                    <Col flex={1}>
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>Bibliothèque de Ressources</Title>
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                            Accédez aux supports de formation, vidéos et articles éducatifs
                        </Text>
                    </Col>
                    <Col>
                        <Badge count={resources.length} style={{ backgroundColor: '#fff', color: '#1e40af' }}>
                            <Tag style={{ fontSize: 16, padding: '4px 16px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                                Ressources
                            </Tag>
                        </Badge>
                    </Col>
                </Row>
            </Card>

            {/* Filters */}
            <Card style={{ borderRadius: 12, marginBottom: 24 }}>
                <Row gutter={16} align="middle">
                    <Col xs={24} sm={8}>
                        <Search
                            placeholder="Rechercher..."
                            prefix={<SearchOutlined />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Select
                            style={{ width: '100%' }}
                            value={filterCategory}
                            onChange={setFilterCategory}
                            options={[
                                { label: 'Toutes catégories', value: 'ALL' },
                                ...categories.map((c) => ({ label: c, value: c })),
                            ]}
                            placeholder="Catégorie"
                        />
                    </Col>
                    <Col xs={12} sm={5}>
                        <Select
                            style={{ width: '100%' }}
                            value={filterType}
                            onChange={setFilterType}
                            options={[
                                { label: 'Tous types', value: 'ALL' },
                                ...contentTypes.map((t) => ({ label: t, value: t })),
                            ]}
                            placeholder="Type"
                        />
                    </Col>
                    <Col flex={1} style={{ textAlign: 'right' }}>
                        <Segmented
                            options={[
                                { value: 'grid', icon: <AppstoreOutlined /> },
                                { value: 'list', icon: <UnorderedListOutlined /> },
                            ]}
                            value={viewMode}
                            onChange={(val) => setViewMode(val as 'grid' | 'list')}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Content */}
            {filtered.length === 0 ? (
                <Card style={{ borderRadius: 12 }}>
                    <Empty description="Aucune ressource ne correspond à vos filtres" />
                </Card>
            ) : viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                    {filtered.map((resource) => (
                        <Col xs={24} sm={12} lg={8} xl={6} key={resource.id || resource.title}>
                            <Card
                                hoverable
                                style={{
                                    borderRadius: 16,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--bg-secondary)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    overflow: 'hidden',
                                }}
                                styles={{
                                    body: {
                                        padding: 24,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flex: 1,
                                    }
                                }}
                            >
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <Avatar
                                        size={56}
                                        style={{
                                            backgroundColor:
                                                resource.contentType === 'PDF' ? '#fef2f2' :
                                                resource.contentType === 'VIDEO' ? '#f5f3ff' : '#eff6ff',
                                            border: '1px solid rgba(0,0,0,0.03)',
                                        }}
                                        icon={contentTypeIcons[resource.contentType || ''] || <BookOutlined style={{ color: '#6b7280' }} />}
                                    />
                                </div>
                                <Title 
                                    level={5} 
                                    style={{ 
                                        margin: '0 0 12px', 
                                        textAlign: 'center', 
                                        fontSize: 15, 
                                        fontWeight: 700,
                                        lineHeight: 1.4,
                                        minHeight: 42,
                                    }} 
                                    ellipsis={{ rows: 2 }}
                                >
                                    {resource.title}
                                </Title>
                                <Space wrap style={{ justifyContent: 'center', width: '100%', marginBottom: 16 }}>
                                    <Tag color={contentTypeColors[resource.contentType || ''] || 'default'} style={{ borderRadius: 6, fontWeight: 600 }}>
                                        {resource.contentType}
                                    </Tag>
                                    {resource.category && (
                                        <Tag color={categoryColors[resource.category] || 'default'} style={{ borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                                            {resource.category}
                                        </Tag>
                                    )}
                                </Space>
                                
                                <div style={{ flex: 1 }} />
                                
                                {resource.topic && (
                                    <Text 
                                        type="secondary" 
                                        style={{ 
                                            fontSize: 13, 
                                            display: 'block', 
                                            textAlign: 'center', 
                                            marginBottom: 8,
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        {resource.topic}
                                    </Text>
                                )}
                                {resource.language && (
                                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                        <Tag icon={<GlobalOutlined />} style={{ borderRadius: 6, fontSize: 11, padding: '2px 8px' }}>
                                            {resource.language}
                                        </Tag>
                                    </div>
                                )}
                                {resource.fileUrl && (
                                    <Button
                                        type="primary"
                                        icon={<LinkOutlined />}
                                        href={toRelativeUrl(resource.fileUrl)}
                                        target="_blank"
                                        style={{
                                            width: '100%',
                                            borderRadius: 10,
                                            background: 'linear-gradient(135deg, #e01c2e 0%, #c0152a 100%)',
                                            borderColor: '#e01c2e',
                                            fontWeight: 700,
                                            height: 40,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(224, 28, 46, 0.15)',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                        }}
                                    >
                                        Ouvrir
                                    </Button>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : (
                <Card style={{ borderRadius: 12 }}>
                    <List
                        dataSource={filtered}
                        renderItem={(resource) => (
                            <List.Item
                                actions={resource.fileUrl ? [
                                    <Button
                                        type="link"
                                        icon={<LinkOutlined />}
                                        href={toRelativeUrl(resource.fileUrl)}
                                        target="_blank"
                                        key="open"
                                    >
                                        Ouvrir
                                    </Button>,
                                ] : undefined}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Avatar
                                            size={44}
                                            style={{
                                                backgroundColor:
                                                    resource.contentType === 'PDF' ? '#fef2f2' :
                                                    resource.contentType === 'VIDEO' ? '#f5f3ff' : '#eff6ff',
                                            }}
                                            icon={contentTypeIcons[resource.contentType || ''] || <BookOutlined />}
                                        />
                                    }
                                    title={<Text strong>{resource.title}</Text>}
                                    description={
                                        <Space>
                                            <Tag color={contentTypeColors[resource.contentType || ''] || 'default'}>{resource.contentType}</Tag>
                                            {resource.category && <Tag color={categoryColors[resource.category] || 'default'}>{resource.category}</Tag>}
                                            {resource.topic && <Text type="secondary" style={{ fontSize: 12 }}>{resource.topic}</Text>}
                                            {resource.language && <Tag icon={<GlobalOutlined />} style={{ fontSize: 10 }}>{resource.language}</Tag>}
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </Card>
            )}
        </div>
    );
};

export default ResourcesPage;
