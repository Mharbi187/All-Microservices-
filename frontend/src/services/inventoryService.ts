// ============================================================
// NEXUS-AID — Inventory Service
// Stock management, movements, and alerts
// ============================================================

import apiClient from './api';
import type { InventoryItemDTO, StockMovementDTO, StockAlertDTO, StockMovementResponse } from '@/types';

const inventoryService = {
    getByCommittee: async (committeeId: string): Promise<InventoryItemDTO[]> => {
        const { data } = await apiClient.get<InventoryItemDTO[]>(`/inventory/committees/${committeeId}`);
        return data;
    },

    create: async (payload: { name: string; category: string; initialQuantity: number; minThreshold: number; committeeId: string }): Promise<InventoryItemDTO> => {
        const { data } = await apiClient.post<InventoryItemDTO>('/inventory', payload);
        return data;
    },

    update: async (itemId: string, payload: { name: string; category: string; minThreshold: number }): Promise<InventoryItemDTO> => {
        const { data } = await apiClient.put<InventoryItemDTO>(`/inventory/${itemId}`, payload);
        return data;
    },

    delete: async (itemId: string): Promise<void> => {
        await apiClient.delete(`/inventory/${itemId}`);
    },

    stockIn: async (itemId: string, payload: StockMovementDTO): Promise<unknown> => {
        const { data } = await apiClient.post(`/inventory/${itemId}/movement/in`, payload);
        return data;
    },

    stockOut: async (itemId: string, payload: StockMovementDTO): Promise<unknown> => {
        const { data } = await apiClient.post(`/inventory/${itemId}/movement/out`, payload);
        return data;
    },

    getMovements: async (itemId: string): Promise<StockMovementResponse[]> => {
        const { data } = await apiClient.get<StockMovementResponse[]>(`/inventory/${itemId}/movements`);
        return data;
    },

    getAlerts: async (): Promise<StockAlertDTO[]> => {
        const { data } = await apiClient.get<StockAlertDTO[]>('/inventory/alerts');
        return data;
    },

    getAlertsByItem: async (itemId: string): Promise<StockAlertDTO[]> => {
        const { data } = await apiClient.get<StockAlertDTO[]>(`/inventory/alerts/item/${itemId}`);
        return data;
    },

    triggerAlert: async (itemId: string, type: string, severity: string): Promise<unknown> => {
        const { data } = await apiClient.post(`/inventory/alerts/trigger?itemId=${itemId}&type=${type}&severity=${severity}`);
        return data;
    },

    resolveAlert: async (alertId: string): Promise<unknown> => {
        const { data } = await apiClient.post(`/inventory/alerts/${alertId}/resolve`);
        return data;
    },
};

export default inventoryService;
