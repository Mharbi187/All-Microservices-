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
    
    getForms: async (committeeId?: string): Promise<YouthIntegrationFormDTO[]> => {
        try {
            const { data } = await apiClient.get<any>('/jeunesse/forms', { params: { committeeId } });
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

    simulateFormAndRecommendation: async (): Promise<YouthRecommendationDTO> => {
        const { data } = await apiClient.post('/jeunesse/forms/simulate');
        return data;
    },

    // ----- Dynamic Templates (Form Builder) -----

    getTemplates: async (committeeId?: string): Promise<YouthFormTemplateDTO[]> => {
        const { data } = await apiClient.get<any>('/jeunesse/templates', { params: { committeeId } });
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        return [];
    },

    createTemplate: async (payload: YouthFormTemplateDTO): Promise<YouthFormTemplateDTO> => {
        const { data } = await apiClient.post('/jeunesse/templates', payload);
        return data;
    },

    updateTemplate: async (id: string, payload: YouthFormTemplateDTO): Promise<YouthFormTemplateDTO> => {
        const { data } = await apiClient.put(`/jeunesse/templates/${id}`, payload);
        return data;
    },

    validateTemplate: async (templateId: string, approve: boolean): Promise<YouthFormTemplateDTO> => {
        const { data } = await apiClient.post(`/jeunesse/templates/${templateId}/validate`, null, {
            params: { approve }
        });
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

    getProjects: async (committeeId?: string): Promise<MicroProjectDTO[]> => {
        try {
            const { data } = await apiClient.get<any>('/jeunesse/projects', { params: { committeeId } });
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

    getRecommendations: async (committeeId?: string): Promise<YouthRecommendationDTO[]> => {
        const { data } = await apiClient.get<any>('/jeunesse/recommendations', { params: { committeeId } });
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

    getStats: async (committeeId?: string): Promise<YouthStatsDTO> => {
        try {
            const { data } = await apiClient.get('/jeunesse/stats', { params: { committeeId } });
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
