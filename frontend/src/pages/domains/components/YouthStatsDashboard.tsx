// ============================================================
// NEXUS-AID — Youth BI Dashboard (Interactive Multi-Level)
// Business Intelligence for National, Regional & Local Levels
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card, Col, Row, Typography, Tag, Button, Space,
    Select, Segmented, Table, Avatar, Tooltip, Progress,
    Statistic, DatePicker
} from 'antd';
import { Column, Pie, Radar, Area } from '@ant-design/charts';
import {
    DownloadOutlined, GlobalOutlined, EnvironmentOutlined,
    HomeOutlined, CheckCircleOutlined, StarOutlined,
    BarChartOutlined, FormOutlined, BarsOutlined, ArrowUpOutlined,
    TrophyOutlined, SafetyCertificateOutlined, UserOutlined,
    ClockCircleOutlined, RobotOutlined, TeamOutlined, FireOutlined
} from '@ant-design/icons';
import { Spin } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Color Palette (Croissant Rouge compatible) ─────────────
const PALETTE = {
    primary: '#C8102E',    // Red Crescent primary
    indigo: '#4F46E5',
    violet: '#7C3AED',
    emerald: '#059669',
    amber: '#D97706',
    sky: '#0284C7',
    rose: '#E11D48',
};

// ─── Static Simulation Data (aggregated from real DB structure) ──
const NATIONAL_DATA = {
    kpis: [
        { key: 'volunteers', label: 'Volontaires Jeunes', value: 1247, trend: '+14.2%', icon: <TeamOutlined />, gradient: ['#4F46E5', '#7C3AED'], suffix: '' },
        { key: 'certified', label: 'Certifiés Secourisme', value: 384, trend: '+8.5%', icon: <SafetyCertificateOutlined />, gradient: ['#059669', '#10B981'], suffix: '' },
        { key: 'hours', label: 'Heures Bénévolat', value: 18640, trend: '+22.1%', icon: <ClockCircleOutlined />, gradient: ['#D97706', '#F59E0B'], suffix: 'h' },
        { key: 'projects', label: 'Projets Actifs', value: 47, trend: '+5.3%', icon: <BarsOutlined />, gradient: ['#0284C7', '#38BDF8'], suffix: '' },
    ],
    engagement: [
        { region: 'Grand Tunis', projets: 18, heures: 5420, volontaires: 312 },
        { region: 'Sfax', projets: 12, heures: 3810, volontaires: 198 },
        { region: 'Sousse', projets: 9, heures: 2960, volontaires: 154 },
        { region: 'Kairouan', projets: 5, heures: 1840, volontaires: 98 },
        { region: 'Bizerte', projets: 3, heures: 1420, volontaires: 87 },
        { region: 'Nabeul', projets: 4, heures: 1190, volontaires: 72 },
    ],
    interestRadar: [
        { area: 'Secourisme', score: 90 },
        { area: 'Climat', score: 72 },
        { area: 'Citoyenneté', score: 68 },
        { area: 'Santé', score: 81 },
        { area: 'Leadership', score: 77 },
        { area: 'Numérique', score: 60 },
    ],
    certificationPie: [
        { type: 'S1 - Premiers Secours', value: 210 },
        { type: 'S2 - Équipier', value: 122 },
        { type: 'S3 - Chef Équipe', value: 52 },
        { type: 'Non certifié', value: 863 },
    ],
    trend: [
        { month: 'Janv', inscriptions: 42, certifications: 18 },
        { month: 'Févr', inscriptions: 58, certifications: 24 },
        { month: 'Mars', inscriptions: 71, certifications: 31 },
        { month: 'Avr', inscriptions: 89, certifications: 40 },
        { month: 'Mai', inscriptions: 104, certifications: 52 },
        { month: 'Juin', inscriptions: 97, certifications: 48 },
    ],
    goals: [
        { label: 'Formation des Jeunes', value: 85, color: '#4F46E5' },
        { label: 'Recrutement Volontaires', value: 62, color: '#059669' },
        { label: 'Budget Micro-projets', value: 44, color: '#D97706' },
        { label: 'Couverture Régionale', value: 78, color: '#0284C7' },
    ],
    leaders: [
        { rank: 1, name: 'Yasmine Ben Ali', region: 'Grand Tunis', points: 2840, badge: 'Formatrice', avatar: 'Y' },
        { rank: 2, name: 'Karim Mansouri', region: 'Sfax', points: 2610, badge: 'Coordinateur', avatar: 'K' },
        { rank: 3, name: 'Sarra Hammami', region: 'Sousse', points: 2390, badge: 'Leader', avatar: 'S' },
        { rank: 4, name: 'Ahmed Trabelsi', region: 'Kairouan', points: 2180, badge: 'Secouriste', avatar: 'A' },
        { rank: 5, name: 'Nour Khelifi', region: 'Bizerte', points: 1950, badge: 'Animatrice', avatar: 'N' },
    ],
};

const REGIONAL_DATA: Record<string, typeof NATIONAL_DATA> = {
    'Grand Tunis': {
        ...NATIONAL_DATA,
        kpis: [
            { key: 'volunteers', label: 'Volontaires (Région)', value: 312, trend: '+11.3%', icon: <TeamOutlined />, gradient: ['#4F46E5', '#7C3AED'], suffix: '' },
            { key: 'certified', label: 'Certifiés', value: 98, trend: '+6.2%', icon: <SafetyCertificateOutlined />, gradient: ['#059669', '#10B981'], suffix: '' },
            { key: 'hours', label: 'Heures Bénévolat', value: 5420, trend: '+18.4%', icon: <ClockCircleOutlined />, gradient: ['#D97706', '#F59E0B'], suffix: 'h' },
            { key: 'projects', label: 'Projets Actifs', value: 18, trend: '+2.1%', icon: <BarsOutlined />, gradient: ['#0284C7', '#38BDF8'], suffix: '' },
        ],
        engagement: [
            { region: 'Ariana', projets: 7, heures: 2100, volontaires: 118 },
            { region: 'Manouba', projets: 5, heures: 1640, volontaires: 87 },
            { region: 'La Marsa', projets: 4, heures: 1280, volontaires: 72 },
            { region: 'Ben Arous', projets: 2, heures: 400, volontaires: 35 },
        ],
    },
    'Sfax': {
        ...NATIONAL_DATA,
        kpis: [
            { key: 'volunteers', label: 'Volontaires (Région)', value: 198, trend: '+9.7%', icon: <TeamOutlined />, gradient: ['#4F46E5', '#7C3AED'], suffix: '' },
            { key: 'certified', label: 'Certifiés', value: 67, trend: '+5.1%', icon: <SafetyCertificateOutlined />, gradient: ['#059669', '#10B981'], suffix: '' },
            { key: 'hours', label: 'Heures Bénévolat', value: 3810, trend: '+15.2%', icon: <ClockCircleOutlined />, gradient: ['#D97706', '#F59E0B'], suffix: 'h' },
            { key: 'projects', label: 'Projets Actifs', value: 12, trend: '+3.0%', icon: <BarsOutlined />, gradient: ['#0284C7', '#38BDF8'], suffix: '' },
        ],
        engagement: [
            { region: 'Sfax Nord', projets: 5, heures: 1600, volontaires: 84 },
            { region: 'Sfax Sud', projets: 4, heures: 1210, volontaires: 67 },
            { region: 'Sakiet Ezzit', projets: 3, heures: 1000, volontaires: 47 },
        ],
    },
};

// ─── Animation Variants ──────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.10 } } };

// ─── Sub-Components ──────────────────────────────────────────

const KpiCard: React.FC<{
    icon: React.ReactNode; gradient: [string, string]; title: string;
    value: string | number; suffix?: string; trend?: string; delay?: number;
}> = ({ icon, gradient, title, value, suffix, trend, delay = 0 }) => (
    <motion.div variants={fadeUp} transition={{ delay }}
        whileHover={{ y: -6, boxShadow: '0 24px 48px rgba(0,0,0,0.10)' }}
        style={{ height: '100%' }}
    >
        <div style={{
            background: '#ffffff', borderRadius: 24, padding: '28px 24px',
            border: '1px solid rgba(0,0,0,0.05)', height: '100%',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                background: `radial-gradient(circle, ${gradient[0]}18 0%, transparent 70%)`, borderRadius: '50%'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#fff', boxShadow: `0 8px 20px ${gradient[0]}40`
                }}>{icon}</div>
                {trend && (
                    <div style={{ textAlign: 'right' }}>
                        <Tag style={{ borderRadius: 10, margin: 0, border: 'none', background: '#ecfdf5', color: '#059669', fontWeight: 700 }}>
                            <ArrowUpOutlined /> {trend}
                        </Tag>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>vs mois préc.</div>
                    </div>
                )}
            </div>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{title}</Text>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>
                    {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
                </span>
                {suffix && <span style={{ fontSize: 16, color: '#6b7280', fontWeight: 600 }}>{suffix}</span>}
            </div>
        </div>
    </motion.div>
);

const GoalProgress: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <motion.div variants={fadeUp} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>{label}</Text>
            <Text style={{ fontWeight: 700, color }}>{value}%</Text>
        </div>
        <Progress percent={value} strokeColor={color} showInfo={false} size={8} trailColor="rgba(0,0,0,0.06)" />
    </motion.div>
);

// ─── Main Dashboard ──────────────────────────────────────────
interface StatsProps {
    onExport: () => void;
    data: any;
    loading: boolean;
}

const YouthStatsDashboard: React.FC<StatsProps> = ({ onExport, data: apiData, loading }) => {
    const [level, setLevel] = useState<'NATIONAL' | 'REGIONAL' | 'LOCAL'>('NATIONAL');
    const [region, setRegion] = useState<string>('Grand Tunis');
    const [localComite, setLocalComite] = useState<string>('Ariana');
    const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
    const [engagementMetric, setEngagementMetric] = useState<'projets' | 'heures' | 'volontaires'>('heures');

    const activeData = level === 'NATIONAL' ? NATIONAL_DATA
        : level === 'REGIONAL' ? (REGIONAL_DATA[region] || NATIONAL_DATA)
        : NATIONAL_DATA;

    // Enrich from real API data when available
    const enrichedKpis = activeData.kpis.map(kpi => {
        if (kpi.key === 'projects' && apiData?.totalProjects) return { ...kpi, value: apiData.totalProjects };
        return kpi;
    });

    const engagementData = activeData.engagement.flatMap(item => [
        { region: item.region, type: 'Heures', value: item.heures },
        { region: item.region, type: 'Volontaires', value: item.volontaires * 10 },
        { region: item.region, type: 'Projets', value: item.projets * 100 },
    ]);

    const trendData = activeData.trend.flatMap(item => [
        { month: item.month, type: 'Inscriptions', value: item.inscriptions },
        { month: item.month, type: 'Certifications', value: item.certifications },
    ]);

    const leaderColumns = [
        {
            title: '#', dataIndex: 'rank', key: 'rank', width: 48,
            render: (r: number) => (
                <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: r === 1 ? 'linear-gradient(135deg, #F59E0B, #FCD34D)' : r === 2 ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)' : r === 3 ? 'linear-gradient(135deg, #92400E, #B45309)' : '#f3f4f6',
                    color: r <= 3 ? '#fff' : '#6b7280', fontWeight: 800, fontSize: 13
                }}>{r <= 3 ? ['🥇', '🥈', '🥉'][r - 1] : r}</div>
            )
        },
        {
            title: 'Volontaire', key: 'name',
            render: (_: any, rec: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar style={{ background: `linear-gradient(135deg, #4F46E5, #7C3AED)`, fontWeight: 700 }}>{rec.avatar}</Avatar>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{rec.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}><EnvironmentOutlined style={{ marginRight: 4 }} />{rec.region}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Points', dataIndex: 'points', key: 'points',
            render: (p: number) => <Statistic value={p} valueStyle={{ fontSize: 16, fontWeight: 800, color: '#4F46E5' }} suffix="pts" />
        },
        {
            title: 'Badge', dataIndex: 'badge', key: 'badge',
            render: (b: string) => (
                <Tag icon={<TrophyOutlined />} color="gold" style={{ borderRadius: 10, fontWeight: 700, padding: '3px 10px' }}>{b}</Tag>
            )
        },
    ];

    if (loading) return (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 20px 40px rgba(79,70,229,0.3)' }}>
                    <RobotOutlined style={{ fontSize: 32, color: '#fff' }} />
                </div>
            </motion.div>
            <Text type="secondary" style={{ fontSize: 16, fontWeight: 600 }}>Chargement du tableau de bord BI...</Text>
        </div>
    );

    return (
        <motion.div id="stats-report-content" variants={stagger} initial="hidden" animate="show">

            {/* ── Level Selector Bar ─────────────────────────── */}
            <motion.div variants={fadeUp} style={{
                background: 'linear-gradient(135deg, rgba(79,70,229,0.06), rgba(124,58,237,0.03))',
                borderRadius: 20, padding: '20px 28px', marginBottom: 28,
                border: '1px solid rgba(79,70,229,0.1)',
                display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                        <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', display: 'block', marginBottom: 8 }}>
                            🏗 Niveau de Pilotage
                        </Text>
                        <Segmented
                            value={level}
                            onChange={(v) => setLevel(v as any)}
                            options={[
                                { label: <><GlobalOutlined /> National</>, value: 'NATIONAL' },
                                { label: <><EnvironmentOutlined /> Régional</>, value: 'REGIONAL' },
                                { label: <><HomeOutlined /> Local</>, value: 'LOCAL' },
                            ]}
                            style={{ background: 'rgba(79,70,229,0.08)', borderRadius: 12 }}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {level === 'REGIONAL' && (
                            <motion.div key="region-sel" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', display: 'block', marginBottom: 8 }}>
                                    🗺 Région
                                </Text>
                                <Select
                                    value={region} onChange={setRegion} style={{ width: 180 }}
                                    options={[
                                        { label: 'Grand Tunis', value: 'Grand Tunis' },
                                        { label: 'Sfax', value: 'Sfax' },
                                        { label: 'Sousse', value: 'Sousse' },
                                        { label: 'Kairouan', value: 'Kairouan' },
                                        { label: 'Nabeul', value: 'Nabeul' },
                                        { label: 'Bizerte', value: 'Bizerte' },
                                    ]}
                                />
                            </motion.div>
                        )}
                        {level === 'LOCAL' && (
                            <motion.div key="local-sel" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', display: 'block', marginBottom: 8 }}>
                                    🏛 Comité Local
                                </Text>
                                <Select
                                    value={localComite} onChange={setLocalComite} style={{ width: 200 }}
                                    options={[
                                        { label: 'Ariana (Local)', value: 'Ariana' },
                                        { label: 'Manouba (Local)', value: 'Manouba' },
                                        { label: 'La Marsa (Local)', value: 'La Marsa' },
                                        { label: 'Ben Arous (Local)', value: 'Ben Arous' },
                                    ]}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <Space wrap>
                    <Select
                        value={period} onChange={setPeriod} style={{ width: 150 }}
                        options={[
                            { label: '📅 Mensuel', value: 'monthly' },
                            { label: '📊 Trimestriel', value: 'quarterly' },
                            { label: '📈 Annuel', value: 'annual' },
                        ]}
                    />
                    <RangePicker picker={period === 'monthly' ? 'month' : period === 'quarterly' ? 'quarter' : 'year'} style={{ borderRadius: 10 }} />
                    <Button
                        type="primary" icon={<DownloadOutlined />} onClick={onExport}
                        style={{ height: 40, borderRadius: 12, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 6px 16px rgba(79,70,229,0.3)' }}
                    >
                        Exporter PDF
                    </Button>
                </Space>
            </motion.div>

            {/* ── Level Context Badge ─────────────────────────── */}
            <motion.div variants={fadeUp} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px',
                    background: level === 'NATIONAL' ? 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(124,58,237,0.06))' : level === 'REGIONAL' ? 'linear-gradient(135deg, rgba(5,150,105,0.1), rgba(16,185,129,0.06))' : 'linear-gradient(135deg, rgba(217,119,6,0.1), rgba(245,158,11,0.06))',
                    borderRadius: 14, border: `1px solid ${level === 'NATIONAL' ? 'rgba(79,70,229,0.2)' : level === 'REGIONAL' ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)'}`
                }}>
                    <div style={{ fontSize: 20 }}>{level === 'NATIONAL' ? '🇹🇳' : level === 'REGIONAL' ? '🗺' : '🏛'}</div>
                    <div>
                        <Text style={{ fontWeight: 800, fontSize: 15 }}>
                            {level === 'NATIONAL' ? 'Vue Nationale — Tunisie' : level === 'REGIONAL' ? `Région : ${region}` : `Comité : ${localComite}`}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            {level === 'NATIONAL' ? 'Supervision stratégique — Toutes les régions' : level === 'REGIONAL' ? 'Coordination de zone — Statistiques agrégées' : 'Gestion de proximité — Données détaillées'}
                        </Text>
                    </div>
                    <Tag color={level === 'NATIONAL' ? 'geekblue' : level === 'REGIONAL' ? 'green' : 'orange'} style={{ borderRadius: 8, fontWeight: 700 }}>
                        {level}
                    </Tag>
                </div>
            </motion.div>

            {/* ── KPI Cards ─────────────────────────────────────── */}
            <motion.div variants={stagger}>
                <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
                    {enrichedKpis.map((kpi, i) => {
                        const { key: kpiKey, ...kpiProps } = kpi;
                        return (
                            <Col key={kpiKey} xs={24} sm={12} xl={6}>
                                <KpiCard delay={i * 0.08} {...kpiProps} gradient={kpiProps.gradient as [string, string]} />
                            </Col>
                        );
                    })}
                </Row>
            </motion.div>

            {/* ── Engagement + Radar ─────────────────────────────── */}
            <Row gutter={[24, 24]} style={{ marginBottom: 28 }}>
                <Col xs={24} lg={16}>
                    <motion.div variants={fadeUp}>
                        <Card variant="borderless" style={{ borderRadius: 24, border: '1px solid rgba(0,0,0,0.04)', height: '100%' }}
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 8, height: 24, borderRadius: 4, background: '#4F46E5' }} />
                                        <span style={{ fontWeight: 800, fontSize: 17 }}>Engagement par {level === 'NATIONAL' ? 'Région' : 'Comité Local'}</span>
                                    </div>
                                    <Segmented
                                        size="small"
                                        value={engagementMetric}
                                        onChange={(v) => setEngagementMetric(v as any)}
                                        options={[
                                            { label: 'Heures', value: 'heures' },
                                            { label: 'Volontaires', value: 'volontaires' },
                                            { label: 'Projets', value: 'projets' },
                                        ]}
                                    />
                                </div>
                            }
                        >
                            <div style={{ height: 340 }}>
                                <Column
                                    data={activeData.engagement.map(item => ({
                                        region: item.region,
                                        value: item[engagementMetric]
                                    }))}
                                    xField="region"
                                    yField="value"
                                    colorField="region"
                                    scale={{ color: { range: ['#4F46E5', '#7C3AED', '#059669', '#D97706', '#0284C7', '#E11D48'] } }}
                                    style={{ radius: [10, 10, 0, 0] }}
                                    axis={{
                                        y: { labelFormatter: (v: any) => `${v.toLocaleString('fr-FR')}`, grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } } },
                                        x: { label: { style: { fontWeight: 600, fontSize: 12 } } }
                                    }}
                                    label={{ text: 'value', style: { fill: '#fff', fontWeight: 700, fontSize: 11 }, position: 'inside' }}
                                    tooltip={{ title: 'region' }}
                                    animate={{ enter: { type: 'growInY', duration: 600 } }}
                                />
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={8}>
                    <motion.div variants={fadeUp} style={{ height: '100%' }}>
                        <Card variant="borderless" style={{ borderRadius: 24, border: '1px solid rgba(0,0,0,0.04)', height: '100%' }}
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <RobotOutlined style={{ color: '#7C3AED', fontSize: 18 }} />
                                    <span style={{ fontWeight: 800, fontSize: 17 }}>Centres d'Intérêt IA</span>
                                </div>
                            }
                        >
                            <div style={{ height: 320 }}>
                                <Radar
                                    data={activeData.interestRadar}
                                    xField="area"
                                    yField="score"
                                    scale={{ y: { domain: [0, 100] } }}
                                    area={{ style: { fill: 'rgba(79,70,229,0.15)' } }}
                                    line={{ style: { stroke: '#4F46E5', lineWidth: 2 } }}
                                    point={{ style: { fill: '#4F46E5', r: 5 } }}
                                    axis={{ x: { label: { style: { fontWeight: 700, fontSize: 11, fill: '#374151' } } } }}
                                />
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ── Trend Line + Certifications Pie ────────────────── */}
            <Row gutter={[24, 24]} style={{ marginBottom: 28 }}>
                <Col xs={24} lg={14}>
                    <motion.div variants={fadeUp}>
                        <Card variant="borderless" style={{ borderRadius: 24, border: '1px solid rgba(0,0,0,0.04)' }}
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <FireOutlined style={{ color: '#E11D48', fontSize: 18 }} />
                                    <span style={{ fontWeight: 800, fontSize: 17 }}>Tendances — Inscriptions & Certifications</span>
                                </div>
                            }
                        >
                            <div style={{ height: 280 }}>
                                <Area
                                    data={trendData}
                                    xField="month"
                                    yField="value"
                                    colorField="type"
                                    scale={{ color: { range: ['#4F46E5', '#059669'] } }}
                                    style={{ fillOpacity: 0.15 }}
                                    shapeField="smooth"
                                    axis={{ y: { grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } } } }}
                                    legend={{ color: { position: 'top-right' } }}
                                    tooltip={{ title: 'month' }}
                                />
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={10}>
                    <motion.div variants={fadeUp}>
                        <Card variant="borderless" style={{ borderRadius: 24, border: '1px solid rgba(0,0,0,0.04)' }}
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <SafetyCertificateOutlined style={{ color: '#059669', fontSize: 18 }} />
                                    <span style={{ fontWeight: 800, fontSize: 17 }}>Niveaux de Certification</span>
                                </div>
                            }
                        >
                            <div style={{ height: 280 }}>
                                <Pie
                                    data={activeData.certificationPie}
                                    angleField="value"
                                    colorField="type"
                                    radius={0.85}
                                    innerRadius={0.6}
                                    scale={{ color: { range: ['#4F46E5', '#7C3AED', '#059669', '#e5e7eb'] } }}
                                    label={{ text: ({ value }: any) => `${value}`, style: { fontWeight: 700 } }}
                                    legend={{ color: { position: 'bottom', layout: { flexDirection: 'column' } } }}
                                    tooltip={{ title: 'type' }}
                                    animate={{ enter: { type: 'waveIn', duration: 600 } }}
                                />
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ── Goals + Leaderboard ────────────────────────────── */}
            <Row gutter={[24, 24]} style={{ marginBottom: 28 }}>
                <Col xs={24} md={10}>
                    <motion.div variants={fadeUp}>
                        <Card variant="borderless" style={{ borderRadius: 24, border: '1px solid rgba(0,0,0,0.04)', height: '100%' }}
                            title={<span style={{ fontWeight: 800, fontSize: 17 }}>🎯 Objectifs Stratégiques</span>}
                        >
                            <motion.div variants={stagger} style={{ marginTop: 8 }}>
                                {activeData.goals.map((g) => (
                                    <GoalProgress key={g.label} {...g} />
                                ))}
                            </motion.div>

                            {/* Performance Summary */}
                            <div style={{ marginTop: 24, padding: '20px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                    <div style={{ padding: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 12 }}>
                                        <StarOutlined style={{ fontSize: 20, color: '#fbbf24' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Score Global : 4.8/5</div>
                                        <div style={{ opacity: 0.7, fontSize: 12, color: '#c7d2fe' }}>Excellente réactivité des comités</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ padding: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 12 }}>
                                        <ClockCircleOutlined style={{ fontSize: 20, color: '#38bdf8' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Délai moyen : 1.2 j</div>
                                        <div style={{ opacity: 0.7, fontSize: 12, color: '#c7d2fe' }}>Traitement recommandations IA</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} md={14}>
                    <motion.div variants={fadeUp}>
                        <Card variant="borderless" style={{ borderRadius: 24, border: '1px solid rgba(0,0,0,0.04)' }}
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <TrophyOutlined style={{ color: '#F59E0B', fontSize: 22 }} />
                                    <span style={{ fontWeight: 800, fontSize: 17 }}>Classement Jeunesse</span>
                                    <Tag color="gold" style={{ borderRadius: 8, fontWeight: 700 }}>Gamification</Tag>
                                </div>
                            }
                        >
                            {level === 'LOCAL' ? (
                                <Table
                                    columns={leaderColumns}
                                    dataSource={activeData.leaders}
                                    rowKey="rank"
                                    pagination={false}
                                    size="small"
                                    rowClassName={(_, index) =>
                                        index === 0 ? 'leader-gold' : index === 1 ? 'leader-silver' : ''
                                    }
                                />
                            ) : (
                                <div style={{ padding: '20px 0' }}>
                                    <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(245,158,11,0.05)', borderRadius: 16, border: '1px dashed rgba(245,158,11,0.3)' }}>
                                        <TrophyOutlined style={{ fontSize: 40, color: '#F59E0B', marginBottom: 12 }} />
                                        <div style={{ fontWeight: 700, fontSize: 15, color: '#92400E', marginBottom: 8 }}>
                                            Vue Locale requise
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                            Sélectionnez le niveau <strong>Local</strong> pour voir le classement individuel des volontaires du comité.
                                        </Text>
                                        <div style={{ marginTop: 16 }}>
                                            <Button
                                                size="small"
                                                onClick={() => setLevel('LOCAL')}
                                                style={{ borderRadius: 10, borderColor: '#F59E0B', color: '#92400E', fontWeight: 700 }}
                                            >
                                                Passer en vue Locale
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Partial ranking (aggregated) */}
                                    <div style={{ marginTop: 20 }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>
                                            Top régions par engagement
                                        </Text>
                                        {activeData.leaders.slice(0, 3).map((l, i) => (
                                            <motion.div key={l.rank} variants={fadeUp} transition={{ delay: i * 0.1 }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                                            >
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{l.avatar}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{l.region || l.name}</div>
                                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{l.points.toLocaleString('fr-FR')} pts cumulés</div>
                                                </div>
                                                <Tag color={i === 0 ? 'gold' : i === 1 ? 'default' : 'orange'} style={{ borderRadius: 8, fontWeight: 700 }}>
                                                    #{i + 1}
                                                </Tag>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ── Audit / SitRep Summary ─────────────────────────── */}
            {(level === 'NATIONAL' || level === 'REGIONAL') && (
                <motion.div variants={fadeUp}>
                    <Card variant="borderless" style={{ borderRadius: 24, border: '1px solid rgba(0,0,0,0.04)', marginBottom: 28 }}
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <BarChartOutlined style={{ color: '#4F46E5', fontSize: 18 }} />
                                <span style={{ fontWeight: 800, fontSize: 17 }}>Traçabilité — Rapports d'Activités (SitReps)</span>
                            </div>
                        }
                    >
                        <Row gutter={[20, 20]}>
                            {[
                                { label: 'Rapports Validés', value: 24, color: '#059669', icon: <CheckCircleOutlined /> },
                                { label: 'En cours de validation', value: 7, color: '#D97706', icon: <ClockCircleOutlined /> },
                                { label: 'Interventions Documentées', value: 41, color: '#4F46E5', icon: <FormOutlined /> },
                                { label: 'Couverture Médiatique', value: 13, color: '#0284C7', icon: <UserOutlined /> },
                            ].map((item) => (
                                <Col key={item.label} xs={12} sm={6}>
                                    <div style={{ textAlign: 'center', padding: '20px 16px', background: `${item.color}08`, borderRadius: 16, border: `1px solid ${item.color}20` }}>
                                        <div style={{ fontSize: 28, color: item.color, marginBottom: 8 }}>{item.icon}</div>
                                        <div style={{ fontSize: 32, fontWeight: 900, color: item.color }}>{item.value}</div>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</Text>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .leader-gold td { background: linear-gradient(90deg, rgba(245,158,11,0.08), transparent) !important; }
                .leader-silver td { background: linear-gradient(90deg, rgba(156,163,175,0.08), transparent) !important; }
                .ant-segmented-item-selected { background: linear-gradient(135deg, #4F46E5, #7C3AED) !important; color: #fff !important; }
                @media (max-width: 768px) {
                    #stats-report-content .ant-card-body { padding: 16px !important; }
                }
            `}} />
        </motion.div>
    );
};

export default YouthStatsDashboard;
