// ============================================================
// NEXUS-AID — Committee Service
// Committee CRUD, hierarchy, governance API calls
// Conformément au décret-loi n° 88-2011 et statuts CRT
// ============================================================

import apiClient from './api';
import type { Committee, CommitteeOverview, CommitteeGovernance } from '@/types';

const committeeService = {
    getAll: async (): Promise<Committee[]> => {
        const { data } = await apiClient.get<Committee[]>('/management/committees');
        return data;
    },

    getHierarchy: async (): Promise<CommitteeOverview[]> => {
        const { data } = await apiClient.get<CommitteeOverview[]>('/management/committees/hierarchy/overview');
        return data;
    },

    create: async (payload: { name: string; type: string; region: string; parentId?: string }): Promise<Committee> => {
        const { data } = await apiClient.post<Committee>('/management/committees', payload);
        return data;
    },

    /** Agrément institutionnel — Approbation par le Comité Central */
    approve: async (committeeId: string): Promise<Committee> => {
        const { data } = await apiClient.post<Committee>(`/management/committees/${committeeId}/approve`);
        return data;
    },

    /** Informations de gouvernance (statut, mandats, rôles manquants) */
    getGovernance: async (committeeId: string): Promise<CommitteeGovernance> => {
        const { data } = await apiClient.get<CommitteeGovernance>(`/management/committees/${committeeId}/governance`);
        return data;
    },

    proposeRole: async (committeeId: string, payload: { volunteerId: string; title: string; reason?: string }): Promise<string> => {
        const { data } = await apiClient.post<string>(`/management/committees/${committeeId}/roles`, payload);
        return data;
    },

    /** Approbation ou rejet d'une proposition de rôle */
    validateRole: async (roleId: string, approve: boolean, reason?: string): Promise<string> => {
        const { data } = await apiClient.post<string>(
            `/management/committees/roles/${roleId}/validate`, 
            null, 
            { params: { approve, reason } }
        );
        return data;
    },

    /** Liste des propositions de rôles en attente */
    getPendingRoles: async (): Promise<any[]> => {
        const { data } = await apiClient.get<any[]>('/management/committees/roles/pending');
        return data;
    },

    /** Journal d'Audit Hiérarchique */
    getAuditLogs: async (): Promise<any[]> => {
        const { data } = await apiClient.get<any[]>('/management/committees/audit-logs');
        return data;
    },

    /** Révocation d'un rôle */
    revokeRole: async (committeeId: string, title: string, reason?: string): Promise<string> => {
        const { data } = await apiClient.delete<string>(
            `/management/committees/${committeeId}/roles/${title}`,
            { params: { reason } }
        );
        return data;
    },
};

export default committeeService;
