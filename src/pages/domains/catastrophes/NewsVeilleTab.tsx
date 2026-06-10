// ============================================================
// NEXUS-AID — News & Veille Nationale Catastrophes
// Onglet 3 : Sources recommandées + liens officiels
// ============================================================

import React, { useState } from 'react';
import { Col, Input, Row, Tag, Typography } from 'antd';
import { GlobalOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text, Title, Paragraph } = Typography;

interface NewsSource {
    id: string;
    name: string;
    category: 'international' | 'afrique' | 'national';
    description: string;
    url: string;
    tags: string[];
    color: string;
    flag?: string;
}

const NEWS_SOURCES: NewsSource[] = [
    // INTERNATIONAL
    {
        id: 'undrr', name: 'UNDRR — Nations Unies', category: 'international',
        description: 'Bureau des Nations Unies pour la réduction des risques de catastrophes. Rapports mondiaux, alertes, stratégies de prévention.',
        url: 'https://www.undrr.org', tags: ['ONU', 'Prévention', 'Risques'], color: '#1890ff', flag: '🌐',
    },
    {
        id: 'wmo', name: 'WMO — Météo Mondiale', category: 'international',
        description: 'Organisation Météorologique Mondiale. Alertes météo, prévisions saisonnières, rapports climat extrême.',
        url: 'https://www.wmo.int', tags: ['Météo', 'Climat', 'Alerte'], color: '#1890ff', flag: '🌤️',
    },
    {
        id: 'ifrc', name: 'FICR — Croix-Rouge Internationale', category: 'international',
        description: 'Fédération Internationale des Sociétés de la Croix-Rouge et du Croissant-Rouge. Coordination des réponses aux catastrophes.',
        url: 'https://www.ifrc.org', tags: ['Croix-Rouge', 'Humanitaire', 'Réponse'], color: '#e01c2e', flag: '🔴',
    },
    {
        id: 'reliefweb', name: 'ReliefWeb', category: 'international',
        description: 'Portail humanitaire des Nations Unies. Rapports de terrain, cartes, alertes en temps réel pour toutes les crises mondiales.',
        url: 'https://reliefweb.int', tags: ['Humanitaire', 'Rapports', 'Cartes'], color: '#fa8c16', flag: '📡',
    },
    {
        id: 'copernicus', name: 'Copernicus EMS', category: 'international',
        description: 'Service européen de gestion des urgences par satellite. Cartographie des catastrophes, images satellite temps réel.',
        url: 'https://emergency.copernicus.eu', tags: ['Satellite', 'Cartographie', 'Europe'], color: '#7c3aed', flag: '🛰️',
    },
    {
        id: 'gdacs', name: 'GDACS — Alertes Mondiales', category: 'international',
        description: "Global Disaster Alert and Coordination System. Système d'alerte précoce pour séismes, cyclones, tsunamis et volcans.",
        url: 'https://www.gdacs.org', tags: ['Alerte Précoce', 'Séisme', 'Cyclone'], color: '#e01c2e', flag: '⚠️',
    },
    {
        id: 'ocha', name: 'OCHA — Affaires Humanitaires', category: 'international',
        description: "Bureau de coordination des affaires humanitaires de l'ONU. Plans de réponse, flash appeals, coordinateurs terrain.",
        url: 'https://www.unocha.org', tags: ['Coordination', 'Urgence', 'ONU'], color: '#1890ff', flag: '🤝',
    },

    // AFRIQUE / RÉGIONAL
    {
        id: 'acmad', name: 'ACMAD — Centre Climatique Africain', category: 'afrique',
        description: "Centre africain pour les applications de la météorologie au développement. Prévisions et alertes pour l'Afrique.",
        url: 'https://www.acmad.net', tags: ['Météo', 'Afrique', 'Prévisions'], color: '#22c55e', flag: '🌍',
    },
    {
        id: 'igad', name: 'IGAD — Prévention Catastrophes', category: 'afrique',
        description: "Autorité intergouvernementale pour le développement. Gestion des risques et résilience en Afrique orientale et australe.",
        url: 'https://www.igad.int', tags: ['Résilience', 'Afrique', 'Risques'], color: '#22c55e', flag: '🛡️',
    },
    {
        id: 'dmc', name: 'Centre Météo Régional — Afrique du Nord', category: 'afrique',
        description: "Centre météorologique régional spécialisé pour l'Afrique du Nord. Prévisions saisonnières, événements extrêmes.",
        url: 'https://www.wmo.int/pages/prog/www/DPFS/RSMC-Africa.html', tags: ['Météo', 'Maghreb', 'Régional'], color: '#22c55e', flag: '🌿',
    },

    // NATIONAL (Tunisie)
    {
        id: 'interieur', name: 'Ministère de l\'Intérieur', category: 'national',
        description: "Protection civile, sécurité publique, gestion des crises nationales et coordination des secours en Tunisie.",
        url: 'https://www.interieur.gov.tn', tags: ['Officiel', 'Sécurité', 'Secours'], color: '#dc2626', flag: '🏛️',
    },
    {
        id: 'pc', name: 'Protection Civile Tunisienne', category: 'national',
        description: "Direction Générale de la Protection Civile. Interventions, statistiques d'urgence, coordonner les secours nationaux.",
        url: 'https://www.protection-civile.tn', tags: ['Secours', 'Urgence', 'Pompiers'], color: '#dc2626', flag: '🚒',
    },
    {
        id: 'meteo', name: 'INM — Institut National Météorologie', category: 'national',
        description: "Institut National de la Météorologie de Tunisie. Bulletins météo, alertes précoces, données climatiques nationales.",
        url: 'http://www.meteo.tn', tags: ['Météo', 'Alerte', 'Climat'], color: '#f97316', flag: '⛅',
    },
    {
        id: 'transport', name: 'Ministère des Transports', category: 'national',
        description: "Informations sur les axes routiers coupés, transports d'urgence, accessibilité des zones sinistrées.",
        url: 'https://www.transport.tn', tags: ['Routes', 'Transport', 'Infrastructure'], color: '#64748b', flag: '🛤️',
    },
    {
        id: 'sante', name: 'Ministère de la Santé', category: 'national',
        description: "Coordination médicale nationale, hôpitaux de campagne, dispositifs de santé en situation de catastrophe.",
        url: 'https://www.santetunisie.rns.tn', tags: ['Santé', 'Médical', 'Urgence'], color: '#22c55e', flag: '🏥',
    },
    {
        id: 'agriculture', name: 'Ministère de l\'Agriculture', category: 'national',
        description: "Suivi des sécheresses, inondations agricoles, gestion des ressources hydrauliques et plans de résilience ruraux.",
        url: 'https://www.agriculture.gov.tn', tags: ['Agriculture', 'Eau', 'Sécheresse'], color: '#84cc16', flag: '🌾',
    },
];

const CATEGORY_CONFIG = {
    international: { label: 'International', color: '#1890ff', bg: 'rgba(24,144,255,0.1)', border: 'rgba(24,144,255,0.3)' },
    afrique: { label: 'Afrique', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    national: { label: 'National', color: '#e01c2e', bg: 'rgba(224,28,46,0.1)', border: 'rgba(224,28,46,0.3)' },
};

interface NewsVeilleTabProps {
    isDark: boolean;
}

const NewsVeilleTab: React.FC<NewsVeilleTabProps> = ({ isDark }) => {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'international' | 'afrique' | 'national'>('all');

    const filtered = NEWS_SOURCES.filter(s => {
        const matchCat = activeCategory === 'all' || s.category === activeCategory;
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
            || s.tags.some(t => t.toLowerCase().includes(q));
        return matchCat && matchSearch;
    });

    const cardStyle = (color: string): React.CSSProperties => ({
        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        padding: 20,
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderLeft: `4px solid ${color}`,
    });

    return (
        <div style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GlobalOutlined style={{ color: '#e01c2e' }} />
                    Veille Informationnelle & Sources Officielles
                </Title>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <Input
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="Rechercher une source..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: 320, borderRadius: 10, height: 40 }}
                />
                {(['all', 'international', 'afrique', 'national'] as const).map(cat => (
                    <Tag
                        key={cat}
                        color={activeCategory === cat ? (cat === 'all' ? 'default' : CATEGORY_CONFIG[cat].color) : undefined}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                            cursor: 'pointer',
                            borderRadius: 8,
                            padding: '4px 14px',
                            fontWeight: 700,
                            fontSize: 12,
                            background: activeCategory === cat
                                ? (cat === 'all' ? '#e01c2e' : CATEGORY_CONFIG[cat].bg)
                                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                            color: activeCategory === cat
                                ? (cat === 'all' ? '#fff' : CATEGORY_CONFIG[cat].color)
                                : (isDark ? '#94a3b8' : '#64748b'),
                            border: 'none',
                        }}
                    >
                        {cat === 'all' ? 'Toutes' : CATEGORY_CONFIG[cat].label} ({cat === 'all' ? NEWS_SOURCES.length : NEWS_SOURCES.filter(s => s.category === cat).length})
                    </Tag>
                ))}
            </div>

            {/* Category sections */}
            {(['international', 'afrique', 'national'] as const).map(cat => {
                const catSources = filtered.filter(s => s.category === cat);
                if (catSources.length === 0) return null;
                const cfg = CATEGORY_CONFIG[cat];
                return (
                    <div key={cat} style={{ marginBottom: 32 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 16,
                            paddingBottom: 10,
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        }}>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%', background: cfg.color,
                            }} />
                            <Text strong style={{ color: cfg.color, fontSize: 15, letterSpacing: 0.5 }}>
                                {cfg.label}
                            </Text>
                            <Tag style={{ borderRadius: 6, fontSize: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                                {catSources.length} source(s)
                            </Tag>
                        </div>
                        <Row gutter={[16, 16]}>
                            {catSources.map((source, i) => (
                                <Col xs={24} sm={12} lg={8} key={source.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        whileHover={{ y: -4 }}
                                    >
                                        <div
                                            style={cardStyle(source.color)}
                                            onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                                                <span style={{ fontSize: 28, flexShrink: 0 }}>{source.flag}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.3 }}>
                                                        {source.name}
                                                    </Text>
                                                    <a
                                                        href={source.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={e => e.stopPropagation()}
                                                        style={{ fontSize: 11, color: source.color, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}
                                                    >
                                                        <LinkOutlined />
                                                        {source.url.replace('https://', '').replace('http://', '').split('/')[0]}
                                                    </a>
                                                </div>
                                            </div>
                                            <Paragraph
                                                type="secondary"
                                                style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}
                                                ellipsis={{ rows: 2, tooltip: source.description }}
                                            >
                                                {source.description}
                                            </Paragraph>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {source.tags.map(tag => (
                                                    <Tag
                                                        key={tag}
                                                        style={{
                                                            borderRadius: 4,
                                                            fontSize: 10,
                                                            padding: '0 6px',
                                                            background: `${source.color}15`,
                                                            border: `1px solid ${source.color}30`,
                                                            color: source.color,
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {tag}
                                                    </Tag>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                );
            })}

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <GlobalOutlined style={{ fontSize: 40, color: '#94a3b8', marginBottom: 12 }} />
                    <br />
                    <Text type="secondary">Aucune source ne correspond à votre recherche</Text>
                </div>
            )}
        </div>
    );
};

export default NewsVeilleTab;
