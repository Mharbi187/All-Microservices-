// ============================================================
// NEXUS-AID — Audit & Conformité des Missions Catastrophe
// Onglet 6 : Tableau d'audit global — retards, scores, relances
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Col, Progress, Row, Spin, Tag, Tooltip, Typography, message } from 'antd';
import {
    AlertOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, MailOutlined, WarningOutlined, FileTextOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { catastropheService } from '@/services/catastropheService';
import { useAuthStore } from '@/stores';
import type { DisasterMissionDTO, DisasterFieldReportDTO } from '@/types';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface AuditEntry {
    mission: DisasterMissionDTO;
    reports: DisasterFieldReportDTO[];
    auditScore: number;
    checks: {
        hasStartTime: boolean;
        hasEndTime: boolean;
        hasLocation: boolean;
        hasChief: boolean;
        hasVolunteers: boolean;
        hasReport: boolean;
        hasPhotos: boolean;
        durationCalculated: boolean;
    };
    daysSinceCompletion: number | null;
    overdueDays: number | null;
    escalationLevel: 0 | 1 | 2 | 3 | 4;
}

const ESCALATION_CONFIG: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
    0: { label: 'OK', color: '#22c55e', icon: <CheckCircleOutlined /> },
    1: { label: 'J+1 — Rappel Chef', color: '#eab308', icon: <ClockCircleOutlined /> },
    2: { label: 'J+3 — Rappel Régional', color: '#f97316', icon: <WarningOutlined /> },
    3: { label: 'J+7 — Escalade Nationale', color: '#e01c2e', icon: <AlertOutlined /> },
    4: { label: 'J+15 — Direction Générale', color: '#7c3aed', icon: <ExclamationCircleOutlined /> },
};

function computeAuditEntry(mission: DisasterMissionDTO, reports: DisasterFieldReportDTO[]): AuditEntry {
    const now = dayjs();
    const endDt = mission.endDatetime ? dayjs(mission.endDatetime) : null;
    const daysSince = mission.status === 'COMPLETED' && endDt ? now.diff(endDt, 'day') : null;

    const checks = {
        hasStartTime: !!mission.startDatetime,
        hasEndTime: !!mission.endDatetime,
        hasLocation: !!(mission.locationGps?.lat),
        hasChief: !!mission.teamChiefName,
        hasVolunteers: (mission.assignedVolunteers?.length ?? 0) > 0,
        hasReport: reports.some(r => r.status === 'SUBMITTED' || r.status === 'VALIDATED'),
        hasPhotos: false, // Backend doesn't have photo field yet — always false unless we track locally
        durationCalculated: !!(mission.startDatetime && mission.endDatetime),
    };

    const checkKeys = Object.keys(checks) as (keyof typeof checks)[];
    const passed = checkKeys.filter(k => checks[k]).length;
    const auditScore = Math.round((passed / checkKeys.length) * 100);

    const isCompletedWithoutReport = mission.status === 'COMPLETED' && !checks.hasReport;

    let escalationLevel: 0 | 1 | 2 | 3 | 4 = 0;
    if (daysSince !== null && isCompletedWithoutReport) {
        if (daysSince >= 15) escalationLevel = 4;
        else if (daysSince >= 7) escalationLevel = 3;
        else if (daysSince >= 3) escalationLevel = 2;
        else if (daysSince >= 1) escalationLevel = 1;
    }

    return {
        mission,
        reports,
        auditScore,
        checks,
        daysSinceCompletion: daysSince,
        overdueDays: isCompletedWithoutReport ? daysSince : null,
        escalationLevel,
    };
}

interface AuditConformiteTabProps {
    isDark: boolean;
}

const AuditConformiteTab: React.FC<AuditConformiteTabProps> = ({ isDark }) => {
    const user = useAuthStore(s => s.user);
    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const committeeId = user?.committeeId ?? '';

    const [audits, setAudits] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [relancing, setRelancing] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const missions = isNational
                ? await catastropheService.getAllMissions()
                : await catastropheService.getMissionsByCommittee(committeeId);

            const completedMissions = missions.filter(m => m.status === 'COMPLETED' || m.status === 'IN_PROGRESS');

            const auditEntries = await Promise.all(
                completedMissions.map(async (mission) => {
                    let reports: DisasterFieldReportDTO[] = [];
                    if (mission.id) {
                        try {
                            reports = await catastropheService.getFieldReportsByMission(mission.id);
                        } catch { /* ignore */ }
                    }
                    return computeAuditEntry(mission, reports);
                })
            );

            setAudits(auditEntries.sort((a, b) => b.escalationLevel - a.escalationLevel || a.auditScore - b.auditScore));
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, [isNational, committeeId]);

    useEffect(() => { void load(); }, [load]);

    const handleRelance = async (entry: AuditEntry) => {
        if (!entry.mission.id) return;
        setRelancing(entry.mission.id);
        try {
            await catastropheService.notifyVolunteers(entry.mission.id, true);
            message.success(`Relance envoyée au chef de mission ${entry.mission.teamChiefName ?? ''}`);
        } catch {
            message.error('Erreur lors de l\'envoi de la relance');
        } finally {
            setRelancing(null);
        }
    };

    const stats = useMemo(() => ({
        total: audits.length,
        compliant: audits.filter(a => a.auditScore === 100).length,
        overdue: audits.filter(a => a.escalationLevel > 0).length,
        avgScore: audits.length > 0 ? Math.round(audits.reduce((s, a) => s + a.auditScore, 0) / audits.length) : 0,
    }), [audits]);

    const cardStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        padding: 20,
    };

    const CHECK_LABELS: Record<string, string> = {
        hasStartTime: 'Heure début',
        hasEndTime: 'Heure fin',
        hasLocation: 'Localisation GPS',
        hasChief: 'Chef mission',
        hasVolunteers: 'Participants',
        hasReport: 'Rapport terrain',
        hasPhotos: 'Photos chargées',
        durationCalculated: 'Durée calculée',
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
                <Spin size="large" />
                <Text type="secondary" style={{ fontWeight: 600 }}>Calcul des scores d'audit...</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 0' }}>
            <Title level={5} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ color: '#e01c2e' }} />
                Audit & Conformité des Missions
            </Title>

            {/* Summary */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Missions Auditées', value: stats.total, color: '#64748b' },
                    { label: 'Conformes (100%)', value: stats.compliant, color: '#22c55e' },
                    { label: 'Rapports en Retard', value: stats.overdue, color: '#e01c2e' },
                    { label: 'Score Moyen', value: `${stats.avgScore}%`, color: stats.avgScore >= 80 ? '#22c55e' : stats.avgScore >= 60 ? '#eab308' : '#e01c2e' },
                ].map((s, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                            <div style={{ ...cardStyle, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                                <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
                                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</Text>
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {audits.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 60 }}>
                    <CheckCircleOutlined style={{ fontSize: 40, color: '#22c55e', marginBottom: 12 }} />
                    <br />
                    <Text type="secondary">Aucune mission terminée ou en cours à auditer</Text>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {audits.map((entry, i) => {
                        const esc = ESCALATION_CONFIG[entry.escalationLevel];
                        const checkKeys = Object.keys(entry.checks) as (keyof typeof entry.checks)[];
                        return (
                            <motion.div
                                key={entry.mission.id ?? i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                            >
                                <div style={{
                                    ...cardStyle,
                                    borderLeft: `4px solid ${esc.color}`,
                                    padding: 0,
                                    overflow: 'hidden',
                                }}>
                                    <div style={{ padding: '16px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                                    <Tag
                                                        icon={esc.icon}
                                                        color={entry.escalationLevel === 0 ? 'success' : entry.escalationLevel === 1 ? 'warning' : 'error'}
                                                        style={{ borderRadius: 6, fontWeight: 700, fontSize: 11 }}
                                                    >
                                                        {esc.label}
                                                    </Tag>
                                                    {entry.mission.missionNumber && (
                                                        <Tag style={{ borderRadius: 6, fontFamily: 'monospace', fontSize: 11 }}>
                                                            {entry.mission.missionNumber}
                                                        </Tag>
                                                    )}
                                                    <Tag color={entry.mission.status === 'COMPLETED' ? 'success' : 'processing'} style={{ borderRadius: 6, fontSize: 11 }}>
                                                        {entry.mission.status === 'COMPLETED' ? 'Terminée' : 'En cours'}
                                                    </Tag>
                                                </div>

                                                <Text strong style={{ fontSize: 14 }}>{entry.mission.title}</Text>
                                                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                                                    {entry.mission.teamChiefName && (
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            Chef: {entry.mission.teamChiefName}
                                                        </Text>
                                                    )}
                                                    {entry.daysSinceCompletion !== null && (
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            Clôturée il y a {entry.daysSinceCompletion} jour(s)
                                                        </Text>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <Progress
                                                        type="circle"
                                                        percent={entry.auditScore}
                                                        size={64}
                                                        strokeColor={entry.auditScore >= 80 ? '#22c55e' : entry.auditScore >= 60 ? '#eab308' : '#e01c2e'}
                                                        format={pct => <span style={{ fontSize: 13, fontWeight: 800 }}>{pct}%</span>}
                                                    />
                                                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Audit</div>
                                                </div>
                                                {entry.escalationLevel > 0 && (
                                                    <Tooltip title="Envoyer une relance par email au chef de mission">
                                                        <Button
                                                            size="small"
                                                            icon={<MailOutlined />}
                                                            loading={relancing === entry.mission.id}
                                                            onClick={() => void handleRelance(entry)}
                                                            style={{
                                                                borderRadius: 8, fontSize: 11,
                                                                background: '#e01c2e', border: 'none', color: '#fff',
                                                            }}
                                                        >
                                                            Relancer
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>

                                        {/* Checks grid */}
                                        <div style={{
                                            display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12,
                                            paddingTop: 12,
                                            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                                        }}>
                                            {checkKeys.map(k => {
                                                const passed = entry.checks[k];
                                                return (
                                                    <div key={k} style={{
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        background: passed
                                                            ? 'rgba(34,197,94,0.08)'
                                                            : 'rgba(224,28,46,0.06)',
                                                        border: `1px solid ${passed ? 'rgba(34,197,94,0.2)' : 'rgba(224,28,46,0.15)'}`,
                                                        borderRadius: 6,
                                                        padding: '3px 8px',
                                                    }}>
                                                        {passed
                                                            ? <CheckCircleOutlined style={{ fontSize: 10, color: '#22c55e' }} />
                                                            : <ExclamationCircleOutlined style={{ fontSize: 10, color: '#e01c2e' }} />}
                                                        <Text style={{ fontSize: 10, color: passed ? '#22c55e' : '#e01c2e' }}>
                                                            {CHECK_LABELS[k] ?? k}
                                                        </Text>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AuditConformiteTab;
