// ============================================================
// NEXUS-AID — Report Service
// Monthly report CRUD and workflow
// ============================================================

import apiClient from './api';
import type { MonthlyReportDTO } from '@/types';

const reportService = {
    getByCommittee: async (committeeId: string): Promise<MonthlyReportDTO[]> => {
        const { data } = await apiClient.get<any>(`/reports/committee/${committeeId}`);
        // Guard: backend may return Spring Page object { content: [] } or plain array
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        return [];
    },

    createDraft: async (payload: Record<string, unknown>): Promise<MonthlyReportDTO> => {
        const { data } = await apiClient.post<MonthlyReportDTO>('/reports/monthly', payload);
        return data;
    },

    validate: async (reportId: string): Promise<string> => {
        const { data } = await apiClient.post<string>(`/reports/${reportId}/validate`);
        return data;
    },

    finalize: async (reportId: string): Promise<string> => {
        const { data } = await apiClient.post<string>(`/reports/${reportId}/finalize`);
        return data;
    },
};

export default reportService;
