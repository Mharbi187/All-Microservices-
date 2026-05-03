// ============================================================
// NEXUS-AID — Volunteer Profile Service
// API calls accessible to the VOLUNTEER role
// ============================================================

import apiClient from './api';

export interface CertificationDTO {
    id: string;
    volunteer?: any;
    diploma: string;
    dateObtained: string;
    dateExpiry?: string;
    status: string;
    certificateUrl?: string;
}

export interface TrainingDTO {
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    location: string;
    trainerId: string;
    participants: string[];
    maxParticipants: number;
    status: string;
    committeeId: string;
}

const volunteerProfileService = {
    /**
     * Get my certifications.
     * Falls back to empty array if endpoint not yet available.
     */
    getMyCertifications: async (volunteerId: string): Promise<CertificationDTO[]> => {
        try {
            const { data } = await apiClient.get<CertificationDTO[]>(`/secourisme/certifications/volunteer/${volunteerId}`);
            return Array.isArray(data) ? data : [];
        } catch {
            // Endpoint may not exist yet — return empty array gracefully
            return [];
        }
    },

    /** Get trainings for my committee */
    getMyTrainings: async (committeeId: string): Promise<TrainingDTO[]> => {
        try {
            const { data } = await apiClient.get<TrainingDTO[]>(`/secourisme/trainings?committeeId=${committeeId}`);
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    },

    /** Update avatar */
    updateAvatar: async (avatarUrl: string, publicId: string): Promise<string> => {
        const { data } = await apiClient.put<string>('/profiles/me/avatar-url', { avatarUrl, publicId });
        return data;
    },
};

export default volunteerProfileService;
