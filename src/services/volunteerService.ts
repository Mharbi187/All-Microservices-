// ============================================================
// NEXUS-AID — Volunteer Service
// Volunteer listing, approval, rejection, promotion, trainer management
// ============================================================

import apiClient from './api';
import type { CommitteeOverview, VolunteerDTO } from '@/types';

export interface TrainerDto {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    matricule?: string;
    avatar?: string;
    committeeId?: string;
    committeeName?: string;
    committeeType?: string;
    expertiseDomains: string[];
    promotedAt?: string;
    secourismeExpiringSoon: boolean;
    secourismeExpired: boolean;
}

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

    suspend: async (volunteerId: string): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/volunteers/${volunteerId}/suspend`);
        return data;
    },

    reactivate: async (volunteerId: string): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/volunteers/${volunteerId}/reactivate`);
        return data;
    },

    promote: async (volunteerId: string, payload: { expertiseDomains: string }): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/volunteers/${volunteerId}/promote-to-trainer`, payload);
        return data;
    },

    updateDetails: async (volunteerId: string, payload: { skills?: string; bloodType?: string }): Promise<string> => {
        const { data } = await apiClient.put<string>(`/profiles/volunteers/${volunteerId}/details`, payload);
        return data;
    },

    // ── Trainer management ───────────────────────────────────────────────────
    getTrainers: async (): Promise<TrainerDto[]> => {
        const { data } = await apiClient.get<TrainerDto[]>('/profiles/trainers');
        return data;
    },

    updateTrainer: async (trainerId: string, expertiseDomains: string[]): Promise<TrainerDto> => {
        const { data } = await apiClient.put<TrainerDto>(`/profiles/trainers/${trainerId}`, { expertiseDomains });
        return data;
    },

    removeTrainer: async (trainerId: string): Promise<string> => {
        const { data } = await apiClient.delete<string>(`/profiles/trainers/${trainerId}`);
        return data;
    },

    getDonors: async (): Promise<any[]> => {
        const { data } = await apiClient.get<any[]>('/profiles/donors');
        return data;
    },
};

export default volunteerService;
