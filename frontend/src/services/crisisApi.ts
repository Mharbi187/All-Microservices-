import axios from 'axios';

const API_BASE = '/api/v1';

export const crisisApi = {
    getRoomSummary: async (roomId: string) => {
        const res = await axios.get(`${API_BASE}/crisis-room/${roomId}/summary`);
        return res.data;
    },
    getAvailableTeams: async () => {
        const res = await axios.get(`${API_BASE}/teams/available`);
        return res.data;
    },
    dispatchTeam: async (teamId: string, lat: number, lon: number) => {
        const res = await axios.post(`${API_BASE}/teams/dispatch`, {
            team_id: teamId,
            lat,
            lon
        });
        return res.data;
    },
    getLogistics: async (disasterId: string) => {
        const res = await axios.get(`${API_BASE}/disasters/${disasterId}/logistics`);
        return res.data;
    },
    sendMessage: async (roomId: string, senderId: string, senderName: string, content: string, type: string) => {
        const res = await axios.post(`${API_BASE}/crisis-room/${roomId}/messages`, {
            sender_id: senderId,
            sender_name: senderName,
            content,
            message_type: type
        });
        return res.data;
    },
    createCrisisRoom: async (payload: { disaster_id: string, name: string, severity: string, lead_agency: string }) => {
        const res = await axios.post(`${API_BASE}/crisis-room`, payload);
        return res.data;
    },
    inviteParticipant: async (roomId: string, payload: { user_id: string, name: string, role: string, agency: string }) => {
        const res = await axios.post(`${API_BASE}/crisis-room/${roomId}/participants`, payload);
        return res.data;
    }
};
