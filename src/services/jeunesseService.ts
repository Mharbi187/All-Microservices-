// ============================================================
// NEXUS-AID — Jeunesse API Service
// Centralized service for the Youth domain (RESP_JEUNESSE)
// ============================================================

import apiClient from './api';
import type {
    YouthIntegrationFormDTO,
    YouthFormTemplateDTO,
    YouthFormResponseDTO,
    YouthRecommendationDTO,
    YouthStatsDTO,
    MicroProjectDTO
} from '@/types';

export const jeunesseService = {
    // ----- Integration Forms & Recommendations -----
    
    getForms: async (): Promise<YouthIntegrationFormDTO[]> => {
        try {
            const { data } = await apiClient.get<any>('/jeunesse/forms');
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.content)) return data.content;
            return [];
        } catch (error) {
            console.error('Error fetching youth forms:', error);
            return [];
        }
    },

    submitForm: async (payload: YouthIntegrationFormDTO): Promise<YouthIntegrationFormDTO> => {
        const { data } = await apiClient.post('/jeunesse/forms', payload);
        return data;
    },

    getRecommendation: async (formId: string): Promise<YouthRecommendationDTO | null> => {
        const { data } = await apiClient.get(`/jeunesse/forms/${formId}/recommendation`);
        return data;
    },

    createRecommendation: async (formId: string, payload: YouthRecommendationDTO): Promise<YouthRecommendationDTO> => {
        const { data } = await apiClient.post(`/jeunesse/forms/${formId}/recommendation`, payload);
        return data;
    },

    generateAiRecommendation: async (payload: any): Promise<any> => {
        const { data } = await apiClient.post('/jeunesse/recommendations/generate-ai', payload);
        return data;
    },

    autoGenerateRecommendation: async (formId: string): Promise<YouthRecommendationDTO> => {
        const { data } = await apiClient.post(`/jeunesse/forms/${formId}/auto-recommend`);
        return data;
    },

    // ----- Dynamic Templates (Form Builder) -----

    getTemplates: async (): Promise<YouthFormTemplateDTO[]> => {
        const { data } = await apiClient.get<any>('/jeunesse/templates');
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        return [];
    },

    createTemplate: async (payload: YouthFormTemplateDTO): Promise<YouthFormTemplateDTO> => {
        const { data } = await apiClient.post('/jeunesse/templates', payload);
        return data;
    },

    // ----- Dynamic Responses -----

    getResponsesByTemplate: async (templateId: string): Promise<YouthFormResponseDTO[]> => {
        const { data } = await apiClient.get<any>(`/jeunesse/templates/${templateId}/responses`);
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        return [];
    },

    submitDynamicResponse: async (payload: YouthFormResponseDTO): Promise<YouthFormResponseDTO> => {
        const { data } = await apiClient.post('/jeunesse/responses', payload);
        return data;
    },

    // ----- Micro Projects -----

    getProjects: async (): Promise<MicroProjectDTO[]> => {
        try {
            const { data } = await apiClient.get<any>('/jeunesse/projects');
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.content)) return data.content;
            return [];
        } catch (error) {
            console.error('Error fetching youth projects:', error);
            return [];
        }
    },

    createProject: async (payload: MicroProjectDTO): Promise<MicroProjectDTO> => {
        const { data } = await apiClient.post('/jeunesse/projects', payload);
        return data;
    },

    validateProject: async (projectId: string, approve: boolean): Promise<MicroProjectDTO> => {
        const { data } = await apiClient.post(`/jeunesse/projects/${projectId}/validate`, null, {
            params: { approve }
        });
        return data;
    },

    // ----- General Recommendations -----

    getRecommendations: async (): Promise<YouthRecommendationDTO[]> => {
        const { data } = await apiClient.get<any>('/jeunesse/recommendations');
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        return [];
    },

    publishRecommendation: async (payload: YouthRecommendationDTO): Promise<YouthRecommendationDTO> => {
        const { data } = await apiClient.post('/jeunesse/recommendations/publish', payload);
        return data;
    },

    updateRecommendation: async (id: string, payload: YouthRecommendationDTO): Promise<YouthRecommendationDTO> => {
        const { data } = await apiClient.put(`/jeunesse/recommendations/${id}`, payload);
        return data;
    },

    deleteRecommendation: async (id: string): Promise<void> => {
        await apiClient.delete(`/jeunesse/recommendations/${id}`);
    },

    validateRecommendation: async (recId: string, approve: boolean): Promise<YouthRecommendationDTO> => {
        const { data } = await apiClient.post(`/jeunesse/recommendations/${recId}/validate`, null, {
            params: { approve }
        });
        return data;
    },

    // ----- Statistics -----

    getStats: async (): Promise<YouthStatsDTO> => {
        try {
            const { data } = await apiClient.get('/jeunesse/stats');
            return data;
        } catch (error) {
            console.error('Error fetching youth stats:', error);
            throw error;
        }
    },

    // ----- Configuration & Options -----

    getOptions: async (): Promise<any[]> => {
        const { data } = await apiClient.get<any>('/jeunesse/config/options');
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        return [];
    },

    saveOption: async (payload: any): Promise<any> => {
        const { data } = await apiClient.post('/jeunesse/config/options', payload);
        return data;
    },

    deleteOption: async (id: string): Promise<void> => {
        await apiClient.delete(`/jeunesse/config/options/${id}`);
    }
};

export default jeunesseService;
