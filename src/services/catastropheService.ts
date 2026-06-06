// ============================================================
// NEXUS-AID — Catastrophe Service
// NDRT/RDRT mission management, team members, field reports
// ============================================================

import apiClient from './api';
import type {
    DisasterMissionDTO,
    DisasterTeamMemberDTO,
    DisasterFieldReportDTO,
} from '@/types';

const BASE = '/catastrophe';

export const catastropheService = {
    // ─── Missions ─────────────────────────────────────────────────────────────

    /** Get all missions (national view) */
    getAllMissions: async (): Promise<DisasterMissionDTO[]> => {
        const { data } = await apiClient.get<DisasterMissionDTO[]>(`${BASE}/missions`);
        return data;
    },

    /** Get missions for a specific committee */
    getMissionsByCommittee: async (committeeId: string): Promise<DisasterMissionDTO[]> => {
        const { data } = await apiClient.get<DisasterMissionDTO[]>(
            `${BASE}/missions/committee/${committeeId}`
        );
        return data;
    },

    /** Get missions assigned to the current user */
    getMyMissions: async (): Promise<DisasterMissionDTO[]> => {
        const { data } = await apiClient.get<DisasterMissionDTO[]>(`${BASE}/missions/my-missions`);
        return data;
    },

    /** Get a specific mission by ID */
    getMissionById: async (missionId: string): Promise<DisasterMissionDTO> => {
        const { data } = await apiClient.get<DisasterMissionDTO>(`${BASE}/missions/${missionId}`);
        return data;
    },

    /** Create a new disaster mission */
    createMission: async (payload: DisasterMissionDTO): Promise<DisasterMissionDTO> => {
        const { data } = await apiClient.post<DisasterMissionDTO>(`${BASE}/missions`, {
            ...payload,
            locationGps: payload.locationGps ?? null,
            startDatetime: payload.startDatetime,
            endDatetime: payload.endDatetime ?? null,
        });
        return data;
    },

    /** Update an existing mission */
    updateMission: async (missionId: string, payload: Partial<DisasterMissionDTO>): Promise<DisasterMissionDTO> => {
        const { data } = await apiClient.put<DisasterMissionDTO>(`${BASE}/missions/${missionId}`, payload);
        return data;
    },

    /** Update mission status */
    updateStatus: async (missionId: string, status: string): Promise<DisasterMissionDTO> => {
        const { data } = await apiClient.put<DisasterMissionDTO>(
            `${BASE}/missions/${missionId}/status`,
            null,
            { params: { status } }
        );
        return data;
    },

    /** Assign a report template to a mission */
    assignTemplate: async (missionId: string, templateId: string, deadline?: string): Promise<DisasterMissionDTO> => {
        const params = new URLSearchParams({ templateId });
        if (deadline) params.append('deadline', deadline);
        const { data } = await apiClient.put<DisasterMissionDTO>(`${BASE}/missions/${missionId}/template?${params.toString()}`);
        return data;
    },

    /** Notify all assigned volunteers (platform + email) */
    notifyVolunteers: async (missionId: string, sendEmail = true): Promise<void> => {
        await apiClient.post(`${BASE}/missions/${missionId}/notify`, null, {
            params: { sendEmail },
        });
    },

    // ─── Team Members ─────────────────────────────────────────────────────────

    /**
     * Get approved volunteers (NDRT/RDRT roster).
     * committeeId = null → national view (all committees)
     */
    getTeamMembers: async (committeeId?: string): Promise<DisasterTeamMemberDTO[]> => {
        const { data } = await apiClient.get<DisasterTeamMemberDTO[]>(`${BASE}/team-members`, {
            params: committeeId ? { committeeId } : {},
        });
        return data;
    },

    getAvailableVolunteers: async (committeeId?: string): Promise<any[]> => {
        const { data } = await apiClient.get<any[]>(`${BASE}/team-members/available`, {
            params: committeeId ? { committeeId } : {},
        });
        return data;
    },

    addTeamMember: async (volunteerId: string, teamType: string, specialty: string): Promise<DisasterTeamMemberDTO> => {
        const { data } = await apiClient.post<DisasterTeamMemberDTO>(`${BASE}/team-members`, {
            volunteerId,
            teamType,
            specialty,
        });
        return data;
    },

    updateTeamMemberStatus: async (id: string, status: string): Promise<DisasterTeamMemberDTO> => {
        const { data } = await apiClient.patch<DisasterTeamMemberDTO>(
            `${BASE}/team-members/${id}/status`,
            null,
            { params: { status } }
        );
        return data;
    },

    deleteTeamMember: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE}/team-members/${id}`);
    },

    // ─── Field Reports ─────────────────────────────────────────────────────────

    /** Get all field reports for a mission */
    getFieldReportsByMission: async (missionId: string): Promise<DisasterFieldReportDTO[]> => {
        const { data } = await apiClient.get<DisasterFieldReportDTO[]>(
            `${BASE}/missions/${missionId}/reports`
        );
        return data;
    },

    /** Get my own field reports (volunteer view) */
    getMyFieldReports: async (): Promise<DisasterFieldReportDTO[]> => {
        const { data } = await apiClient.get<DisasterFieldReportDTO[]>(`${BASE}/my-reports`);
        return data;
    },

    /** Submit a field report for a mission */
    submitFieldReport: async (
        missionId: string,
        report: DisasterFieldReportDTO
    ): Promise<DisasterFieldReportDTO> => {
        const { data } = await apiClient.post<DisasterFieldReportDTO>(
            `${BASE}/missions/${missionId}/reports`,
            report
        );
        return data;
    },

    /** Validate a submitted field report */
    validateFieldReport: async (reportId: string, notes?: string): Promise<DisasterFieldReportDTO> => {
        const { data } = await apiClient.put<DisasterFieldReportDTO>(
            `${BASE}/reports/${reportId}/validate`,
            null,
            { params: { notes: notes ?? '' } }
        );
        return data;
    },
};

export default catastropheService;
