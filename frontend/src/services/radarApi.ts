import axios from 'axios';
import type { RadarResponse } from '@/types';

const api = axios.create({
    baseURL: '/api/v1',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

export const radarApi = {
    getRadar: () => api.get<RadarResponse>('/radar').then(res => res.data),
};

export default api;
