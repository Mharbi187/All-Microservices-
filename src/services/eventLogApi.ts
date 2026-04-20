import axios from 'axios';

const API_BASE = '/api/v1';

export interface EventLog {
  id: string;
  eventType: string;
  eventSource: string;
  payload: Record<string, any>;
  createdAt: string;
  eventTimestamp: string;
  status: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

/**
 * Service for querying event logs from admin-service (MS3)
 * Provides audit trail and event history for dashboard aggregation
 */
export const eventLogApi = {
  /**
   * Get recent events (last N hours)
   */
  getRecentEvents: async (hours: number = 24, page: number = 0, size: number = 20) => {
    const res = await axios.get(`${API_BASE}/events/recent`, {
      params: { hours, page, size }
    });
    return res.data;
  },

  /**
   * Get events by type
   */
  getEventsByType: async (type: string) => {
    const res = await axios.get(`${API_BASE}/events/by-type`, {
      params: { type }
    });
    return res.data;
  },

  /**
   * Get events by source service
   */
  getEventsBySource: async (source: string) => {
    const res = await axios.get(`${API_BASE}/events/by-source`, {
      params: { source }
    });
    return res.data;
  },

  /**
   * Get events related to an entity
   */
  getEventsByEntity: async (entityId: string, entityType: string) => {
    const res = await axios.get(`${API_BASE}/events/by-entity`, {
      params: { entityId, entityType }
    });
    return res.data;
  },

  /**
   * Get event statistics
   */
  getEventStatistics: async () => {
    const res = await axios.get(`${API_BASE}/events/stats`);
    return res.data;
  }
};
