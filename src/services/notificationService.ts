import api from './api';

export interface DonorNotification {
    id: string;
    type: 'DON_VALIDE' | 'NOUVEAU_BESOIN' | 'MISE_A_JOUR' | 'IMPACT' | 'INFO';
    title: string;
    message: string;
    read: boolean;
    link?: string;
    metadata?: Record<string, string>;
    createdAt: string;
}

const NOTIFICATIONS_API = '/notifications';

export const notificationService = {
    getMyNotifications: async (): Promise<DonorNotification[]> => {
        const response = await api.get<DonorNotification[]>(NOTIFICATIONS_API);
        return response.data;
    },

    getUnreadCount: async (): Promise<{ count: number }> => {
        const response = await api.get<{ count: number }>(`${NOTIFICATIONS_API}/unread-count`);
        return response.data;
    },

    markAsRead: async (id: string): Promise<void> => {
        await api.put(`${NOTIFICATIONS_API}/${id}/read`);
    },

    markAllAsRead: async (): Promise<void> => {
        await api.put(`${NOTIFICATIONS_API}/read-all`);
    },
};

export default notificationService;
