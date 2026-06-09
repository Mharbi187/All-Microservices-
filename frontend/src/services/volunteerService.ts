// ============================================================
// NEXUS-AID — Volunteer Service
// Volunteer listing, approval, rejection, promotion
// ============================================================

import apiClient from './api';
import type { CommitteeOverview, VolunteerDTO } from '@/types';

const volunteerService = {
    getVisible: async (): Promise<CommitteeOverview[]> => {
        const { data } = await apiClient.get<CommitteeOverview[]>('/profiles/me/visible-volunteers');
        return data;
    },

    getByCommittee: async (committeeId: string): Promise<VolunteerDTO[]> => {
        const { data } = await apiClient.get<VolunteerDTO[]>(`/profiles/committees/${committeeId}/volunteers`);
        return data;
    },

    getPending: async (committeeId: string): Promise<VolunteerDTO[]> => {
        const { data } = await apiClient.get<VolunteerDTO[]>(`/profiles/committees/${committeeId}/pending-volunteers`);
        return data;
    },

    approve: async (volunteerId: string): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/volunteers/${volunteerId}/approve`);
        return data;
    },

    reject: async (volunteerId: string): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/volunteers/${volunteerId}/reject`);
        return data;
    },

    promote: async (volunteerId: string, payload: { expertiseDomains: string }): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/volunteers/${volunteerId}/promote-to-trainer`, payload);
        return data;
    },
};

export default volunteerService;
