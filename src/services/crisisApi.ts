import apiClient from '@/services/api';

export interface SimulationScenario {
    id: string;
    name: string;
    description: string;
    disaster_count: number;
    high_risk_count: number;
}

export interface SimulationPhase {
    status: 'success' | 'error';
    error?: string;
    [key: string]: any;
}

export interface FullSimulationResult {
    success: boolean;
    scenario: string;
    scenario_name: string;
    crisis_room_id: string | null;
    phases: Record<string, SimulationPhase>;
}

export const crisisApi = {
    // ─── Simulation ───────────────────────────────────
    getScenarios: async (): Promise<{ scenarios: SimulationScenario[] }> => {
        const res = await apiClient.get('/simulation/scenarios');
        return res.data;
    },
    triggerFullSimulation: async (scenario: string): Promise<FullSimulationResult> => {
        const res = await apiClient.post('/simulation/full', { scenario });
        return res.data;
    },
    triggerSimulation: async () => {
        const res = await apiClient.post('/simulation/trigger', {
            wilaya_name: 'Jendouba',
            disaster_type: 'WILDFIRE',
            risk_score: 0.95,
            lat: 36.9542,
            lon: 8.7589
        });
        return res.data;
    },
    resetSimulation: async () => {
        const res = await apiClient.post('/simulation/reset');
        return res.data;
    },

    // ─── Crisis Room ──────────────────────────────────
    getRoomSummary: async (roomId: string) => {
        const res = await apiClient.get(`/crisis-room/${roomId}/summary`);
        return res.data;
    },
    getActiveRooms: async () => {
        const res = await apiClient.get('/crisis-room/active');
        return res.data;
    },
    closeCrisisRoom: async (roomId: string, payload: { closed_by: string, final_report: string }) => {
        const res = await apiClient.post(`/crisis-room/${roomId}/close`, payload);
        return res.data;
    },
    getAvailableTeams: async () => {
        const res = await apiClient.get('/teams/available');
        return res.data;
    },
    getAllTeams: async () => {
        const res = await apiClient.get('/teams/all');
        return res.data;
    },
    getMyCrisisRooms: async (userId: string) => {
        const res = await apiClient.get(`/volunteers/${userId}/crisis-rooms`);
        return res.data;
    },
    dispatchTeam: async (teamId: string, lat: number, lon: number, roomId?: string) => {
        const res = await apiClient.post('/teams/dispatch', {
            team_id: teamId,
            room_id: roomId || "",
            lat,
            lon
        });
        return res.data;
    },
    getLogistics: async (disasterId: string) => {
        const res = await apiClient.get(`/disasters/${disasterId}/logistics`);
        return res.data;
    },
    sendMessage: async (roomId: string, senderId: string, senderName: string, content: string, type: string) => {
        const res = await apiClient.post(`/crisis-room/${roomId}/messages`, {
            sender_id: senderId,
            sender_name: senderName,
            content,
            message_type: type
        });
        return res.data;
    },
    createCrisisRoom: async (payload: { disaster_id: string, name: string, severity: string, lead_agency: string }) => {
        const res = await apiClient.post('/crisis-room', payload);
        return res.data;
    },
    inviteParticipant: async (roomId: string, payload: { user_id: string, name: string, role: string, agency: string }) => {
        const res = await apiClient.post(`/crisis-room/${roomId}/participants`, payload);
        return res.data;
    },
    removeParticipant: async (roomId: string, userId: string) => {
        const res = await apiClient.delete(`/crisis-room/${roomId}/participants/${userId}`);
        return res.data;
    },
    updateParticipantRole: async (roomId: string, userId: string, role: string) => {
        const res = await apiClient.put(`/crisis-room/${roomId}/participants/${userId}/role`, { role });
        return res.data;
    }
};
