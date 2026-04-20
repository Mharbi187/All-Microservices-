import type { RadarResponse } from '@/types';
import apiClient from '@/services/api';

export const radarApi = {
    // Reuse shared authenticated client so Gateway-protected radar routes receive JWT.
    getRadar: () => apiClient.get<RadarResponse>('/radar').then((res) => res.data),
};
