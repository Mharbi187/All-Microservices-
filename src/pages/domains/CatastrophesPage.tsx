// ============================================================
// NEXUS-AID — Catastrophes (Centre National de Gestion)
// Refactoring complet : 8 onglets — données dynamiques
// Remplace "Moniteur Satellite" par un centre de gestion complet
// ============================================================

import React, { useState } from 'react';
import { Button, Typography, Tag } from 'antd';
import {
    AlertOutlined, TeamOutlined, FileTextOutlined, GlobalOutlined,
    RiseOutlined, ReadOutlined, EnvironmentOutlined, AuditOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores';
import { useAuthStore } from '@/stores';

// Tab components
import CentreNationalTab from './catastrophes/CentreNationalTab';
import TableauBordNationalTab from './catastrophes/TableauBordNationalTab';
import NewsVeilleTab from './catastrophes/NewsVeilleTab';
import RegistreSourcesTab from './catastrophes/RegistreSourcesTab';
import MissionAssignmentTab from './catastrophes/MissionAssignmentTab';
import TeamsManagementTab from './catastrophes/TeamsManagementTab';
import FieldReportTab from './catastrophes/FieldReportTab';
import AuditConformiteTab from './catastrophes/AuditConformiteTab';
import { generateMissionOrderPdf } from './catastrophes/missionOrderPdf';

const { Title, Text } = Typography;

const CatastrophesPage: React.FC = () => {
    const themeMode = useUIStore((s) => s.themeMode);
    const isDark = themeMode === 'dark';
    const user = useAuthStore(s => s.user);
    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const isPresident = user?.roles?.includes('PRESIDENT') || user?.roles?.includes('VICE_PRESIDENT') || isNational;

    const [activeTab, setActiveTab] = useState('centre');

    const ALL_TABS = [
        { key: 'centre', label: 'Centre Catastrophes', icon: <AlertOutlined />, shortLabel: 'Centre', alwaysVisible: true },
        { key: 'tableau', label: 'Tableau de Bord', icon: <RiseOutlined />, shortLabel: 'Bord', alwaysVisible: true },
        { key: 'news', label: 'News & Veille', icon: <ReadOutlined />, shortLabel: 'News', alwaysVisible: true },
        { key: 'sources', label: 'Sources & Contacts', icon: <EnvironmentOutlined />, shortLabel: 'Sources', alwaysVisible: true },
        { key: 'missions', label: 'Missions', icon: <TeamOutlined />, shortLabel: 'Missions', alwaysVisible: true },
        { key: 'teams', label: 'Équipes NDRT/RDRT', icon: <TeamOutlined />, shortLabel: 'Équipes', alwaysVisible: true },
        { key: 'reports', label: 'Rapports', icon: <FileTextOutlined />, shortLabel: 'Rapports', alwaysVisible: true },
        { key: 'audit', label: 'Audit & Conformité', icon: <AuditOutlined />, shortLabel: 'Audit', alwaysVisible: isPresident },
    ];

    const visibleTabs = ALL_TABS.filter(t => t.alwaysVisible);

    const glassStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 28,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.06)',
        overflow: 'hidden',
    };

    return (
        <div style={{ padding: '0 24px 32px 24px', maxWidth: 1600, margin: '0 auto' }}>
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
            >
                {/* Page Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 18,
                        background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, color: '#fff',
                        boxShadow: '0 10px 24px rgba(224,28,46,0.25)',
                        flexShrink: 0,
                    }}>
                        <AlertOutlined />
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                            Centre National des Catastrophes
                        </Title>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                            <Tag color="success" style={{ borderRadius: 6, fontWeight: 700, fontSize: 10 }}>
                                ● EN LIGNE
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {isNational ? 'Vue Nationale' : 'Vue Régionale'} — Nexus-AID CRT
                            </Text>
                        </div>
                    </div>
                </div>

                <div style={glassStyle}>
                    {/* Tab Bar */}
                    <div style={{
                        padding: '14px 20px 0 20px',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'}`,
                        background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.6)',
                        overflowX: 'auto',
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: 4,
                            width: 'max-content',
                            minWidth: '100%',
                        }}>
                            {visibleTabs.map(tab => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '10px 16px',
                                            borderRadius: '12px 12px 0 0',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            fontSize: 12,
                                            fontWeight: isActive ? 800 : 600,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s ease',
                                            background: isActive
                                                ? (isDark ? 'rgba(224,28,46,0.15)' : '#ffffff')
                                                : 'transparent',
                                            color: isActive
                                                ? '#e01c2e'
                                                : (isDark ? 'rgba(255,255,255,0.45)' : '#64748b'),
                                            borderBottom: isActive
                                                ? `2px solid #e01c2e`
                                                : '2px solid transparent',
                                            boxShadow: isActive && !isDark ? '0 -2px 8px rgba(0,0,0,0.04)' : 'none',
                                        }}
                                    >
                                        <span style={{ fontSize: 14 }}>{tab.icon}</span>
                                        <span className="tab-label-full">{tab.label}</span>
                                        <span className="tab-label-short" style={{ display: 'none' }}>{tab.shortLabel}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div style={{ padding: '0 24px', minHeight: 500 }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18 }}
                            >
                                {activeTab === 'centre' && <CentreNationalTab isDark={isDark} />}
                                {activeTab === 'tableau' && <TableauBordNationalTab isDark={isDark} />}
                                {activeTab === 'news' && <NewsVeilleTab isDark={isDark} />}
                                {activeTab === 'sources' && <RegistreSourcesTab isDark={isDark} />}
                                {activeTab === 'missions' && (
                                    <MissionAssignmentTab isDark={isDark} onGeneratePdf={generateMissionOrderPdf} />
                                )}
                                {activeTab === 'teams' && <TeamsManagementTab isDark={isDark} />}
                                {activeTab === 'reports' && <FieldReportTab isDark={isDark} />}
                                {activeTab === 'audit' && isPresident && <AuditConformiteTab isDark={isDark} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            <style>{`
                @media (max-width: 768px) {
                    .tab-label-full { display: none !important; }
                    .tab-label-short { display: inline !important; }
                }
                @media (min-width: 769px) {
                    .tab-label-full { display: inline !important; }
                    .tab-label-short { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default CatastrophesPage;
