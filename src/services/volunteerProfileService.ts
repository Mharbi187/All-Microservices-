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
    /** Get my certifications - uses profiles domain (secourisme endpoint does not exist) */
    getMyCertifications: async (volunteerId: string): Promise<CertificationDTO[]> => {
        // NOTE: Backend endpoint /certifications is not yet implemented in core-service/profiles
        // Returning empty array to avoid 500 error spam in console
        return [];
    },

    /** Get trainings for my committee (not yet implemented in backend) */
    getMyTrainings: async (committeeId: string): Promise<TrainingDTO[]> => {
        // NOTE: Backend endpoint /trainings is not yet implemented in core-service/secourisme
        return [];
    },

    /** Update avatar */
    updateAvatar: async (avatarUrl: string, publicId: string): Promise<string> => {
        const { data } = await apiClient.put<string>('/profiles/me/avatar-url', { avatarUrl, publicId });
        return data;
    },
};

export default volunteerProfileService;
