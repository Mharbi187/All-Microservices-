// ============================================================
// NEXUS-AID — Tableau de Bord National des Catastrophes
// Onglet 2 : KPIs + Graphiques (recharts) — données dynamiques
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Col, Row, Spin, Statistic, Typography } from 'antd';
import {
    AlertOutlined, CheckCircleOutlined, ClockCircleOutlined,
    RiseOutlined, TeamOutlined, FieldTimeOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { catastropheService } from '@/services/catastropheService';
import { useAuthStore } from '@/stores';
import type { DisasterMissionDTO } from '@/types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const COLORS_PIE = ['#e01c2e', '#fa8c16', '#1890ff', '#52c41a', '#722ed1'];

const TYPE_LABELS: Record<string, string> = {
    SECOURS: 'Secours',
    EVACUATION: 'Évacuation',
    MEDICAL: 'Médical',
    LOGISTIQUE: 'Logistique',
    SURVEILLANCE: 'Surveillance',
};

interface TableauBordNationalTabProps {
    isDark: boolean;
}

const TableauBordNationalTab: React.FC<TableauBordNationalTabProps> = ({ isDark }) => {
    const user = useAuthStore(s => s.user);
    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const committeeId = user?.committeeId ?? '';

    const [missions, setMissions] = useState<DisasterMissionDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = isNational
                    ? await catastropheService.getAllMissions()
                    : await catastropheService.getMissionsByCommittee(committeeId);
                setMissions(data);
            } catch { /* ignore */ } finally {
                setLoading(false);
            }
        };
        void load();
    }, [isNational, committeeId]);

    // ── Computed KPIs ──────────────────────────────────────────
    const kpis = useMemo(() => {
        const active = missions.filter(m => m.status === 'IN_PROGRESS').length;
        const planned = missions.filter(m => m.status === 'PLANNED').length;
        const completed = missions.filter(m => m.status === 'COMPLETED').length;
        const cancelled = missions.filter(m => m.status === 'CANCELLED').length;
        const totalVols = missions.reduce((a, m) => a + (m.assignedVolunteers?.length ?? 0), 0);

        // Avg intervention duration (hours)
        const durations = missions
            .filter(m => m.startDatetime && m.endDatetime && m.status === 'COMPLETED')
            .map(m => dayjs(m.endDatetime).diff(dayjs(m.startDatetime), 'hour', true));
        const avgHours = durations.length > 0
            ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
            : '—';

        return { active, planned, completed, cancelled, totalVols, avgHours, total: missions.length };
    }, [missions]);

    // ── Chart: Missions by type ────────────────────────────────
    const byTypeData = useMemo(() => {
        const counts: Record<string, number> = {};
        missions.forEach(m => { counts[m.missionType] = (counts[m.missionType] ?? 0) + 1; });
        return Object.entries(counts).map(([type, count]) => ({
            name: TYPE_LABELS[type] ?? type,
            value: count,
        }));
    }, [missions]);

    // ── Chart: Missions by committee/region ───────────────────
    const byCommitteeData = useMemo(() => {
        const counts: Record<string, number> = {};
        missions.forEach(m => {
            const key = m.committeeName ?? m.committeeId ?? 'Inconnu';
            counts[key] = (counts[key] ?? 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name: name.replace('Comité ', '').replace('Régional', 'Rég.'), count }));
    }, [missions]);

    // ── Chart: Monthly evolution ───────────────────────────────
    const monthlyData = useMemo(() => {
        const months: Record<string, { month: string; total: number; completed: number }> = {};
        missions.forEach(m => {
            const month = dayjs(m.startDatetime).format('MMM YYYY');
            if (!months[month]) months[month] = { month, total: 0, completed: 0 };
            months[month].total++;
            if (m.status === 'COMPLETED') months[month].completed++;
        });
        return Object.values(months).sort((a, b) => {
            const da = dayjs(a.month, 'MMM YYYY');
            const db = dayjs(b.month, 'MMM YYYY');
            return da.isBefore(db) ? -1 : 1;
        }).slice(-6);
    }, [missions]);

    const cardStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        padding: 20,
        height: '100%',
    };

    const tooltipStyle = {
        contentStyle: {
            background: isDark ? '#1e293b' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 10,
            color: isDark ? '#e2e8f0' : '#1e293b',
        },
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
                <Spin size="large" />
                <Text type="secondary" style={{ fontWeight: 600 }}>Chargement du Tableau de Bord...</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 0' }}>
            <Title level={5} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiseOutlined style={{ color: '#e01c2e' }} />
                Tableau de Bord {isNational ? 'National' : 'Régional'}
            </Title>

            {/* KPI Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
                {[
                    { label: 'Total Missions', value: kpis.total, icon: <AlertOutlined />, color: '#64748b', suffix: '' },
                    { label: 'En Cours', value: kpis.active, icon: <AlertOutlined />, color: '#e01c2e', suffix: '' },
                    { label: 'Planifiées', value: kpis.planned, icon: <ClockCircleOutlined />, color: '#1890ff', suffix: '' },
                    { label: 'Terminées', value: kpis.completed, icon: <CheckCircleOutlined />, color: '#22c55e', suffix: '' },
                    { label: 'Volontaires', value: kpis.totalVols, icon: <TeamOutlined />, color: '#7c3aed', suffix: '' },
                    { label: 'Durée Moy.', value: kpis.avgHours, icon: <FieldTimeOutlined />, color: '#f97316', suffix: 'h' },
                ].map((kpi, i) => (
                    <Col xs={12} sm={8} lg={4} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <div style={{
                                ...cardStyle,
                                textAlign: 'center',
                                borderTop: `3px solid ${kpi.color}`,
                                padding: 16,
                            }}>
                                <span style={{ color: kpi.color, fontSize: 22 }}>{kpi.icon}</span>
                                <Statistic
                                    value={kpi.value}
                                    suffix={kpi.suffix}
                                    valueStyle={{ fontSize: 28, fontWeight: 900, color: kpi.color }}
                                />
                                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{kpi.label}</Text>
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]}>
                {/* Pie Chart — by type */}
                <Col xs={24} lg={10}>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                        <div style={cardStyle}>
                            <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 14 }}>
                                Répartition par Type de Mission
                            </Text>
                            {byTypeData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Text type="secondary">Aucune donnée disponible</Text>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={byTypeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={100}
                                            dataKey="value"
                                            paddingAngle={3}
                                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {byTypeData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS_PIE[idx % COLORS_PIE.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...tooltipStyle} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </motion.div>
                </Col>

                {/* Bar Chart — by region */}
                <Col xs={24} lg={14}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                        <div style={cardStyle}>
                            <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 14 }}>
                                Missions par Région / Comité
                            </Text>
                            {byCommitteeData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Text type="secondary">Aucune donnée disponible</Text>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={byCommitteeData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                                            angle={-30}
                                            textAnchor="end"
                                            interval={0}
                                            height={50}
                                        />
                                        <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Bar dataKey="count" name="Missions" fill="#e01c2e" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </motion.div>
                </Col>

                {/* Line Chart — monthly trend */}
                <Col xs={24}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <div style={cardStyle}>
                            <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 14 }}>
                                Évolution Mensuelle des Missions
                            </Text>
                            {monthlyData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Text type="secondary">Pas assez de données pour le graphique mensuel</Text>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                                        <XAxis dataKey="month" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                                        <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" name="Total" stroke="#e01c2e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="completed" name="Terminées" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </motion.div>
                </Col>
            </Row>
        </div>
    );
};

export default TableauBordNationalTab;
