// ============================================================
// NEXUS-AID — Reporting Zustand Store
// WebSocket real-time notifications + local state for reporting hub
// ============================================================
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ReportNotification, ReportNotificationType } from '@/types/template.types';

interface ReportingState {
  // Notifications
  notifications: ReportNotification[];
  unreadCount: number;
  wsConnected: boolean;

  // Actions
  addNotification: (n: Omit<ReportNotification, 'id' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearNotifications: () => void;
  setWsConnected: (v: boolean) => void;

  // WebSocket lifecycle
  wsRef: WebSocket | null;
  startWs: (userId: string, token: string) => void;
  stopWs: () => void;
}

/** Map backend WS event types to human-readable messages (French) */
function eventToMessage(type: ReportNotificationType, title: string): string {
  switch (type) {
    case 'REPORT_ASSIGNED':   return `Vous avez un rapport à remplir : "${title}"`;
    case 'REPORT_SUBMITTED':  return `Rapport soumis pour validation : "${title}"`;
    case 'REPORT_VALIDATED':  return `Rapport validé : "${title}"`;
    case 'REPORT_FINALIZED':  return `Rapport finalisé : "${title}"`;
    case 'REPORT_ARCHIVED':   return `Rapport archivé : "${title}"`;
    default: return `Mise à jour du rapport : "${title}"`;
  }
}

export const useReportingStore = create<ReportingState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  wsConnected: false,
  wsRef: null,

  addNotification: (n) => {
    const notification: ReportNotification = {
      ...n,
      id: nanoid(),
      read: false,
      message: eventToMessage(n.type, n.reportTitle),
    };
    set((s) => ({
      notifications: [notification, ...s.notifications].slice(0, 50), // max 50 notifs
      unreadCount: s.unreadCount + 1,
    }));
  },

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

  setWsConnected: (v) => set({ wsConnected: v }),

  startWs: (userId: string, token: string) => {
    const existing = get().wsRef;
    if (existing && existing.readyState < 2) return; // already open or connecting

    // Determine WS URL from the same base as the API (swap http->ws)
    const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api')
      .replace(/^http/, 'ws');
    const wsUrl = `${apiBase}/v1/ws/reports?userId=${userId}&token=${encodeURIComponent(token)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      // WebSocket not available — use polling fallback (see useReportPolling hook)
      set({ wsConnected: false, wsRef: null });
      return;
    }

    ws.onopen = () => {
      set({ wsConnected: true, wsRef: ws });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type && data.reportId) {
          get().addNotification({
            type: data.type as ReportNotificationType,
            reportId: data.reportId,
            reportTitle: data.reportTitle || 'Rapport',
            timestamp: data.timestamp || new Date().toISOString(),
            message: data.message || 'Nouvelle notification',
          });
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      set({ wsConnected: false });
    };

    ws.onclose = () => {
      set({ wsConnected: false, wsRef: null });
      // Auto-reconnect after 5s
      setTimeout(() => {
        const { wsRef } = get();
        if (!wsRef || wsRef.readyState > 1) {
          get().startWs(userId, token);
        }
      }, 5000);
    };

    set({ wsRef: ws });
  },

  stopWs: () => {
    const ws = get().wsRef;
    if (ws) {
      ws.onclose = null; // prevent auto-reconnect
      ws.close();
    }
    set({ wsRef: null, wsConnected: false });
  },
}));
