import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, List, Space, Tag, Typography, notification } from 'antd';
import { ReloadOutlined, RocketOutlined, TeamOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { crisisApi } from '@/services/crisisApi';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from './radarTheme';

const { Text } = Typography;

interface ResponderTeam {
    id: string;
    name: string;
    team_type: string;
    member_count: number;
    base_location_name?: string;
    status?: string;
}

interface RespondersPanelProps {
    targetLat: number;
    targetLon: number;
    targetLabel: string;
}

export default function RespondersPanel({ targetLat, targetLon, targetLabel }: RespondersPanelProps) {
    const [teams, setTeams] = useState<ResponderTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [deployingId, setDeployingId] = useState<string | null>(null);
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const loadTeams = useCallback(async () => {
        try {
            setLoading(true);
            const result = await crisisApi.getAllTeams();
            setTeams(Array.isArray(result) ? result : []);
        } catch {
            notification.error({
                message: 'Flux indisponible',
                description: 'Impossible de charger les intervenants disponibles.',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadTeams(); }, [loadTeams]);

    const availableCount = useMemo(
        () => teams.filter(team => team.status === 'available' || !team.status).length,
        [teams]
    );

    const dispatchTeam = useCallback(async (team: ResponderTeam) => {
        try {
            setDeployingId(team.id);
            await crisisApi.dispatchTeam(team.id, targetLat, targetLon);
            notification.success({
                message: 'Équipe déployée',
                description: `${team.name} déployée vers ${targetLabel}.`,
            });
            setTeams(prev => prev.filter(item => item.id !== team.id));
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Échec du déploiement';
            notification.error({ message: 'Déploiement échoué', description: msg });
        } finally {
            setDeployingId(null);
        }
    }, [targetLat, targetLon, targetLabel]);

    return (
        <div style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: rr.lg,
            boxShadow: t.cardShadow,
            overflow: 'hidden',
            height: '100%',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
        }}>
            {/* Top accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${rp.grn500}, transparent)`,
            }} />

            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${t.divider}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: rr.sm,
                        background: isDark ? `${rp.grn500}18` : `${rp.grn500}0E`,
                        border: `1px solid ${rp.grn500}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: rp.grn500,
                    }}>
                        <TeamOutlined />
                    </div>
                    <div>
                        <Text style={{ fontFamily: rfont.body, fontSize: 14, fontWeight: 700, color: t.text, display: 'block' }}>
                            Disponibilité des Intervenants
                        </Text>
                        <Text style={{ fontFamily: rfont.body, fontSize: 11, color: t.textFaint }}>
                            {availableCount} disponible(s) · {teams.length} total
                        </Text>
                    </div>
                </div>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void loadTeams()}
                    loading={loading}
                    style={{
                        borderRadius: rr.sm,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: t.text,
                    }}
                >
                    Actualiser
                </Button>
            </div>

            {/* Target info */}
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${t.divider}`, flexShrink: 0 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isDark ? `${rp.blu500}10` : rp.blu100,
                    border: `1px solid ${rp.blu500}20`,
                    borderRadius: rr.sm, padding: '8px 12px',
                }}>
                    <EnvironmentOutlined style={{ color: rp.blu500, fontSize: 14 }} />
                    <div>
                        <Text style={{ fontFamily: rfont.body, fontSize: 13, fontWeight: 600, color: rp.blu500 }}>
                            {targetLabel}
                        </Text>
                        <Text style={{ fontFamily: rfont.data, fontSize: 11, color: t.textFaint, marginLeft: 8 }}>
                            ({targetLat.toFixed(3)}, {targetLon.toFixed(3)})
                        </Text>
                    </div>
                </div>
            </div>

            {/* Teams list */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="rd-scroll">
                <List
                    loading={loading}
                    dataSource={teams}
                    locale={{
                        emptyText: (
                            <Text style={{ fontFamily: rfont.body, color: t.textSub }}>
                                Aucune équipe disponible pour le moment
                            </Text>
                        ),
                    }}
                    renderItem={(team, i) => (
                        <motion.div
                            key={team.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <div
                                className="rd-row-hover"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 20px',
                                    borderBottom: `1px solid ${t.divider}`,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: rr.sm,
                                        background: team.team_type === 'NDRT'
                                            ? isDark ? `${rp.red500}18` : `${rp.red500}0E`
                                            : isDark ? `${rp.amb500}18` : `${rp.amb500}0E`,
                                        border: `1px solid ${team.team_type === 'NDRT' ? rp.red500 : rp.amb500}25`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 16,
                                        color: team.team_type === 'NDRT' ? rp.red500 : rp.amb500,
                                    }}>
                                        <TeamOutlined />
                                    </div>
                                    <div>
                                        <Text strong style={{ fontFamily: rfont.body, fontSize: 13, color: t.text, display: 'block' }}>
                                            {team.name}
                                        </Text>
                                        <Space size={6} style={{ marginTop: 4 }}>
                                            <div style={{
                                                background: team.team_type === 'NDRT'
                                                    ? `${rp.red500}15` : `${rp.amb500}15`,
                                                color: team.team_type === 'NDRT' ? rp.red500 : rp.amb500,
                                                border: `1px solid ${team.team_type === 'NDRT' ? rp.red500 : rp.amb500}25`,
                                                borderRadius: rr.pill, padding: '1px 7px',
                                                fontSize: 10, fontWeight: 700, fontFamily: rfont.data,
                                            }}>
                                                {team.team_type}
                                            </div>
                                            {team.status && team.status !== 'available' && (
                                                <div style={{
                                                    background: `#64748b15`,
                                                    color: t.textFaint,
                                                    border: `1px solid #64748b25`,
                                                    borderRadius: rr.pill, padding: '1px 7px',
                                                    fontSize: 10, fontWeight: 700, fontFamily: rfont.data,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {team.status === 'deployed' ? 'Déployée' : team.status === 'resting' ? 'En repos' : team.status === 'training' ? 'Entraînement' : team.status}
                                                </div>
                                            )}
                                            <Text style={{ fontFamily: rfont.body, fontSize: 11, color: t.textFaint }}>
                                                {team.member_count} membres · {team.base_location_name ?? 'Base inconnue'}
                                            </Text>
                                        </Space>
                                    </div>
                                </div>

                        <Button
                            type="primary"
                            icon={<RocketOutlined />}
                            loading={deployingId === team.id}
                            onClick={() => void dispatchTeam(team)}
                            disabled={team.status !== 'available' && team.status !== undefined}
                            style={{
                                background: team.status !== 'available' && team.status !== undefined 
                                    ? t.cardBg 
                                    : `linear-gradient(90deg, ${rp.red600}, ${rp.red500})`,
                                borderColor: team.status !== 'available' && team.status !== undefined 
                                    ? t.divider 
                                    : rp.red600,
                                color: team.status !== 'available' && team.status !== undefined 
                                    ? t.textSub 
                                    : '#fff',
                                borderRadius: rr.sm,
                                fontFamily: rfont.body, fontWeight: 700,
                                boxShadow: team.status !== 'available' && team.status !== undefined 
                                    ? 'none' 
                                    : '0 2px 8px rgba(220,38,38,0.3)',
                            }}
                        >
                            Déployer
                        </Button>
                    </div>
                </motion.div>
                    )}
                />
            </div>
        </div>
    );
}
