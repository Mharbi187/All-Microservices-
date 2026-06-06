// ============================================================
// NEXUS-AID — Évaluations RCP : Onglet Gestionnaire de Comité
// Visible pour PRESIDENT_LOCAL, VP_LOCAL, RESP_SECOURISME
// Permet de consulter toutes les évaluations du comité
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Table, Tag, Button, Drawer, Typography, Space, Avatar,
    Spin, Empty, Row, Col, Statistic, Tooltip, Badge, Tabs, Image
} from 'antd';
import {
    EyeOutlined, FilePdfOutlined, HeartOutlined, UserOutlined,
    CalendarOutlined, TrophyOutlined, WarningOutlined, CheckCircleOutlined,
    CloseCircleOutlined, FileTextOutlined, CameraOutlined, StarOutlined,
    BarChartOutlined, RobotOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import { rcpService } from '@/services/domainServices';
import type { RcpEvaluationDTO } from '@/types';
import { exportRcpToPdf } from '@/utils/rcpPdfExporter';

const { Title, Text, Paragraph } = Typography;

const CONCORDANCE_COLORS: Record<string, string> = { EXCELLENT: 'success', BON: 'success', MOYEN: 'warning', FAIBLE: 'error' };
const DECISION_LABELS: Record<string, { color: string; label: string; icon?: React.ReactNode }> = {
    PRET:                   { color: 'success', label: 'Prêt', icon: <CheckCircleOutlined /> },
    AMELIORATIONS_MINEURES: { color: 'warning', label: 'Amél. mineures', icon: <WarningOutlined /> },
    AMELIORATIONS_MAJEURES: { color: 'orange',  label: 'Amél. majeures', icon: <WarningOutlined /> },
    NON_RECOMMANDE:         { color: 'error',   label: 'Non recommandé', icon: <CloseCircleOutlined /> },
};
const LEVEL_LABELS: Record<string, string> = {
    DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire',
    AVANCE: 'Avancé', PROFESSIONNEL: 'Professionnel',
};
const SCORE_CRITERIA = [
    'handPosition', 'compressionDepth', 'frequency', 'chestRelease', 'ventilation',
    'ratio', 'interruptions', 'fatigue', 'reactivity', 'globalQuality'
];
const CRITERIA_LABELS: Record<string, string> = {
    handPosition: 'Position des mains', compressionDepth: 'Profondeur',
    frequency: 'Fréquence', chestRelease: 'Décompression', ventilation: 'Insufflations',
    ratio: 'Ratio 30:2', interruptions: 'Interruptions', fatigue: 'Résistance fatigue',
    reactivity: 'Réactivité IA', globalQuality: 'Qualité globale',
};

import { useAuthStore } from '@/stores';

interface Props { committeeId: string; isDark: boolean; }

const RcpEvaluationsTab: React.FC<Props> = ({ committeeId, isDark }) => {
    const user = useAuthStore((s) => s.user);
    const [evaluations, setEvaluations] = useState<RcpEvaluationDTO[]>([]);
    const [loading, setLoading]         = useState(true);
    const [selected, setSelected]       = useState<RcpEvaluationDTO | null>(null);
    const [drawerOpen, setDrawerOpen]   = useState(false);

    const roles = user?.roles || [];
    const isPresident = roles.some(r => ['PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'].includes(r));
    const isVicePresident = roles.some(r => ['VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'].includes(r));
    const isRespSecourisme = roles.some(r => r === 'RESP_SECOURISME');
    const isManager = isRespSecourisme || isPresident || isVicePresident || user?.type === 'ADMIN';

    useEffect(() => {
        setLoading(true);
        const fetchPromise = isManager
            ? (committeeId ? rcpService.getByCommittee(committeeId) : Promise.resolve([]))
            : rcpService.getMyEvaluations();

        fetchPromise
            .then(setEvaluations)
            .catch(() => setEvaluations([]))
            .finally(() => setLoading(false));
    }, [committeeId, isManager]);

    const handleView = (record: RcpEvaluationDTO) => {
        setSelected(record);
        setDrawerOpen(true);
    };

    // ---- Stats summary ----
    const totalEvals    = evaluations.length;
    const avgIa         = evaluations.filter(e => e.scoreIa).length
        ? evaluations.reduce((s, e) => s + (e.scoreIa || 0), 0) / evaluations.filter(e => e.scoreIa).length
        : 0;
    const readyCount    = evaluations.filter(e => e.trainerDecision === 'PRET').length;
    const excellentCount = evaluations.filter(e => e.concordanceLevel === 'EXCELLENT').length;

    const glassBox = {
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        borderRadius: 16,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        padding: 20,
    };

    const columns: ColumnsType<RcpEvaluationDTO> = [
        {
            title: 'PARTICIPANT', key: 'participant',
            width: 200,
            render: (_, r) => {
                const getLevelBadge = (lvl?: string) => {
                    if (!lvl) return '—';
                    const config: Record<string, { status: "success" | "processing" | "warning" | "error"; text: string }> = {
                        DEBUTANT: { status: 'success', text: 'Débutant' },
                        INTERMEDIAIRE: { status: 'processing', text: 'Intermédiaire' },
                        AVANCE: { status: 'warning', text: 'Avancé' },
                        PROFESSIONNEL: { status: 'error', text: 'Professionnel' },
                    };
                    const cfg = config[lvl];
                    return cfg ? <Badge status={cfg.status} text={cfg.text} style={{ fontSize: 11 }} /> : lvl;
                };
                return (
                    <Space size={12}>
                        <Avatar icon={<UserOutlined />} style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff' }} />
                        <div>
                            <Text strong style={{ display: 'block' }}>{r.participantName || 'Anonyme'}</Text>
                            {getLevelBadge(r.participantLevel)}
                        </div>
                    </Space>
                );
            },
        },
        {
            title: 'FORMATEUR', dataIndex: 'trainerName', key: 'trainer',
            width: 150,
            render: (n) => <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{n}</Text>,
        },
        {
            title: 'DATE', dataIndex: 'evaluationDate', key: 'date',
            width: 130,
            render: (d) => (
                <Space size={6} style={{ whiteSpace: 'nowrap' }}>
                    <CalendarOutlined style={{ color: '#ef4444' }} />
                    <Text style={{ whiteSpace: 'nowrap' }}>{d ? new Date(d).toLocaleDateString('fr-FR') : '—'}</Text>
                </Space>
            ),
        },
        {
            title: 'SCORE IA / FORMATEUR', key: 'scores',
            width: 180,
            render: (_, r) => {
                const ia = r.scoreIa;
                const fm = r.scoreTrainer;
                return (
                    <Space size={8}>
                        {ia !== undefined && <Tag color="blue" icon={<RobotOutlined />} style={{ borderRadius: 8, fontWeight: 700 }}> {Number(ia).toFixed(1)}</Tag>}
                        {fm !== undefined && <Tag color="red" icon={<UserOutlined />} style={{ borderRadius: 8, fontWeight: 700 }}> {Number(fm).toFixed(1)}</Tag>}
                    </Space>
                );
            },
        },
        {
            title: 'CONCORDANCE', dataIndex: 'concordanceLevel', key: 'concordance',
            width: 130,
            render: (c) => c ? (
                <Tag color={CONCORDANCE_COLORS[c] || 'default'} style={{ borderRadius: 8, fontWeight: 600 }}>{c}</Tag>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'DÉCISION', dataIndex: 'trainerDecision', key: 'decision',
            width: 160,
            render: (d) => {
                const cfg = DECISION_LABELS[d];
                return cfg ? <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 8, fontWeight: 600 }}>{cfg.label}</Tag> : <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'ACTIONS', key: 'actions',
            width: 100,
            render: (_, r) => (
                <Space>
                    <Tooltip title="Voir le détail">
                        <Button
                            icon={<EyeOutlined />}
                            type="primary"
                            size="small"
                            onClick={() => handleView(r)}
                            style={{ borderRadius: 8, background: '#ef4444', borderColor: '#ef4444' }}
                        />
                    </Tooltip>
                    <Tooltip title="Télécharger PDF">
                        <Button
                            icon={<FilePdfOutlined />}
                            size="small"
                            onClick={() => exportRcpToPdf(r)}
                            style={{ borderRadius: 8 }}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

    if (!evaluations.length) return (
        <Empty
            image={<HeartOutlined style={{ fontSize: 64, color: '#ef4444' }} />}
            description={<><Title level={5}>Aucune évaluation RCP</Title><Text type="secondary">Les évaluations soumises par les formateurs apparaîtront ici.</Text></>}
            style={{ padding: '60px 0' }}
        />
    );

    return (
        <div>
            {/* Stats row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total évaluations', value: totalEvals, icon: <HeartOutlined />, color: '#ef4444' },
                    { label: 'Score IA moyen', value: avgIa.toFixed(1) + '/10', icon: <TrophyOutlined />, color: '#3b82f6' },
                    { label: 'Participants prêts', value: readyCount, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { label: 'Concordance excellente', value: excellentCount, icon: <TrophyOutlined />, color: '#8b5cf6' },
                ].map((stat, i) => (
                    <Col xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                            <div style={glassBox}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</Text>
                                        <Title level={3} style={{ margin: '4px 0 0', color: stat.color }}>{stat.value}</Title>
                                    </div>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, fontSize: 18 }}>
                                        {stat.icon}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={evaluations}
                rowKey="id"
                pagination={{ pageSize: 8, hideOnSinglePage: true }}
                className="premium-table"
                scroll={{ x: 1000 }}
            />

            {/* Detail Drawer */}
            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={680}
                title={
                    <Space size={12}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <HeartOutlined />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Détail de l'évaluation RCP</div>
                            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>{selected?.participantName || 'Participant anonyme'}</div>
                        </div>
                    </Space>
                }
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button icon={<FilePdfOutlined />} onClick={() => selected && exportRcpToPdf(selected)} style={{ borderRadius: 10 }}>Télécharger PDF</Button>
                        <Button onClick={() => setDrawerOpen(false)} style={{ borderRadius: 10 }}>Fermer</Button>
                    </div>
                }
            >
                {selected && (
                    <div style={{ paddingBottom: 24 }}>
                        {/* Info générale */}
                        <div style={{ ...glassBox, marginBottom: 16 }}>
                            <Title level={5} style={{ marginBottom: 16 }}>
                                <FileTextOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Informations du test
                            </Title>
                            <Row gutter={[12, 12]}>
                                {[
                                    { label: 'Formateur', value: selected.trainerName },
                                    { label: 'Centre', value: selected.trainerCenter || '—' },
                                    { label: 'Date', value: selected.evaluationDate ? new Date(selected.evaluationDate).toLocaleDateString('fr-FR') : '—' },
                                    { label: 'Heure', value: selected.evaluationTime || '—' },
                                    { label: 'Version IA', value: selected.aiVersion || '—' },
                                    { label: 'Essais', value: selected.totalAttempts?.toString() || '1' },
                                    { label: 'Participant', value: selected.participantName || '—' },
                                    { label: 'Niveau', value: selected.participantLevel ? LEVEL_LABELS[selected.participantLevel] : '—' },
                                ].map(item => (
                                    <Col xs={12} key={item.label}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.label}</Text>
                                        <Text strong style={{ fontSize: 13 }}>{item.value}</Text>
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        {/* Photos */}
                        {(selected.photoParticipant || selected.photoCardiacPosition || selected.photoAiScreenshot) && (
                            <div style={{ ...glassBox, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 16 }}>
                                    <CameraOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Photos du test
                                </Title>
                                <Row gutter={[12, 12]}>
                                    {[
                                        { label: 'Participant', src: selected.photoParticipant },
                                        { label: 'Position', src: selected.photoCardiacPosition },
                                        { label: 'Screenshot IA', src: selected.photoAiScreenshot },
                                    ].filter(p => p.src).map(photo => (
                                        <Col xs={8} key={photo.label}>
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{photo.label}</Text>
                                            <Image src={photo.src} alt={photo.label} style={{ borderRadius: 12, width: '100%', maxHeight: 120, objectFit: 'cover' }} />
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}

                        {/* Scores */}
                        {selected.scores && Object.keys(selected.scores).length > 0 && (
                            <div style={{ ...glassBox, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 16 }}>
                                    <StarOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Scores par critère
                                </Title>
                                {SCORE_CRITERIA.filter(k => (selected.scores || {})[k] !== undefined).map(key => {
                                     const score = (selected.scores || {})[key] as number;
                                    const comment = (selected.comments || {})[key] as string;
                                    const scoreColors: Record<number, string> = {
                                        1: '#ef4444', 2: '#f87171', 3: '#f97316', 4: '#fb923c', 5: '#eab308',
                                        6: '#fde047', 7: '#a3e635', 8: '#84cc16', 9: '#22c55e', 10: '#10b981'
                                    };
                                    return (
                                        <div key={key} style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderLeft: `3px solid ${scoreColors[score] || '#e2e8f0'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong style={{ fontSize: 13 }}>{CRITERIA_LABELS[key] || key}</Text>
                                                <Tag style={{ borderRadius: 8, fontWeight: 700, background: scoreColors[score], color: '#fff', border: 'none' }}>{score}/10</Tag>
                                            </div>
                                            {comment && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{comment}</Text>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Résultats */}
                        <div style={{ ...glassBox, marginBottom: 16 }}>
                            <Title level={5} style={{ marginBottom: 16 }}>
                                <BarChartOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Résultats
                            </Title>
                            <Row gutter={[12, 12]}>
                                {[
                                    { label: 'Score IA', value: selected.scoreIa !== undefined ? `${Number(selected.scoreIa).toFixed(1)}/10` : '—', color: '#3b82f6' },
                                    { label: 'Score Formateur', value: selected.scoreTrainer !== undefined ? `${Number(selected.scoreTrainer).toFixed(1)}/10` : '—', color: '#ef4444' },
                                    { label: 'Écart', value: selected.concordanceGap !== undefined ? `${Number(selected.concordanceGap).toFixed(1)} pts` : '—', color: '#6b7280' },
                                    { label: 'Concordance', value: selected.concordanceLevel || '—', color: selected.concordanceLevel ? { EXCELLENT: '#10b981', BON: '#22c55e', MOYEN: '#f59e0b', FAIBLE: '#ef4444' }[selected.concordanceLevel] : '#6b7280' },
                                ].map(item => (
                                    <Col xs={12} key={item.label}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.label}</Text>
                                        <Text strong style={{ fontSize: 16, color: item.color }}>{item.value}</Text>
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        {/* Recommandations */}
                        {selected.recommendations && (selected.recommendations.high?.length || selected.recommendations.medium?.length || selected.recommendations.low?.length) ? (
                            <div style={{ ...glassBox, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    <FileTextOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Recommandations d'amélioration
                                </Title>
                                {['high', 'medium', 'low'].map(lvl => {
                                    const items = selected.recommendations?.[lvl as 'high' | 'medium' | 'low'] || [];
                                    if (!items.length) return null;
                                    const config: Record<string, { color: string; label: string }> = {
                                        high: { color: 'red', label: 'Priorité Haute' },
                                        medium: { color: 'gold', label: 'Priorité Moyenne' },
                                        low: { color: 'green', label: 'Priorité Basse' }
                                    };
                                    return (
                                        <div key={lvl} style={{ marginBottom: 10 }}>
                                            <Tag color={config[lvl]?.color} style={{ borderRadius: 6, marginBottom: 6, fontWeight: 600 }}>
                                                {config[lvl]?.label}
                                            </Tag>
                                            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
                                                {items.map((item, index) => <li key={index} style={{ marginBottom: 4 }}>{item}</li>)}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}

                        {/* Décision */}
                        {selected.trainerDecision && (
                            <div style={{ ...glassBox, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    <CheckCircleOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Décision du formateur
                                </Title>
                                {(() => {
                                    const cfg = DECISION_LABELS[selected.trainerDecision];
                                    return cfg ? <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 10, padding: '4px 14px', fontSize: 14, fontWeight: 600 }}>{cfg.label}</Tag> : null;
                                })()}
                                {selected.trainerFinalComments && (
                                    <Paragraph style={{ marginTop: 12, fontSize: 13 }}>{selected.trainerFinalComments}</Paragraph>
                                )}
                                {selected.trainerSignature && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>Signé : {selected.trainerSignature}</Text>
                                )}
                            </div>
                        )}

                        {/* Problems */}
                        {(selected.problemsEncountered || []).length > 0 && (
                            <div style={{ ...glassBox }}>
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    <WarningOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Problèmes signalés
                                </Title>
                                <Space wrap>
                                    {(selected.problemsEncountered || []).map(p => (
                                        <Tag key={p} color="warning" style={{ borderRadius: 8 }}>{p.replace(/_/g, ' ')}</Tag>
                                    ))}
                                </Space>
                                {selected.problemDescription && (
                                    <Paragraph style={{ marginTop: 12, fontSize: 13 }}>{selected.problemDescription}</Paragraph>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default RcpEvaluationsTab;
