// ============================================================
// NEXUS-AID — Complaint Service
// ============================================================

import apiClient from './api';
import type { ComplaintDTO } from '@/types';

const complaintService = {
    getAll: async (): Promise<ComplaintDTO[]> => {
        const { data } = await apiClient.get<ComplaintDTO[]>('/profiles/complaints');
        return data;
    },

    getMine: async (): Promise<ComplaintDTO[]> => {
        const { data } = await apiClient.get<ComplaintDTO[]>('/profiles/complaints/my-complaints');
        return data;
    },

    create: async (payload: { subject: string; description: string; targetCommitteeId: string }): Promise<ComplaintDTO> => {
        const { data } = await apiClient.post<ComplaintDTO>('/profiles/complaints', payload);
        return data;
    },

    updateStatus: async (id: string, newStatus: string): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/complaints/${id}/status?newStatus=${newStatus}`);
        return data;
    },
};

export default complaintService;
