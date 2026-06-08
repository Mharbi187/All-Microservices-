/**
 * CoreAPIService.js
 * =================
 * Central service for all communication with:
 *   - core-service  (profiles, notifications, calendar, news, interventions)
 *   - admin-service (report filling & submission)
 *
 * All requests are authenticated via JWT Bearer token stored in AsyncStorage.
 * Base URLs automatically switch between dev (Expo Go) and production (APK / Oracle VM).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ─────────────────────────────────────────────────────────────────────────────
//  Environment-aware base URLs
// ─────────────────────────────────────────────────────────────────────────────
const CORE_SERVICE_URL = 'https://nexus-aid.me/api/v1';   // proxied by API Gateway → core-service
const ADMIN_SERVICE_URL = 'https://nexus-aid.me/api/v1/admin'; // proxied by API Gateway → admin-service

const TIMEOUT_MS = 8000;

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: fetch with JWT auth + timeout
// ─────────────────────────────────────────────────────────────────────────────
async function authFetch(url, options = {}) {
    let token = null;
    try {
        token = await SecureStore.getItemAsync('jwt_token');
    } catch (_) { }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    clearTimeout(timer);

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    // Some endpoints return 204 No Content
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 204 || !contentType.includes('application/json')) return null;
    return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
//  CORE SERVICE — Profile
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchMyProfile() {
    return authFetch(`${CORE_SERVICE_URL}/profiles/me`);
}

export async function updateMyProfile(updates) {
    return authFetch(`${CORE_SERVICE_URL}/profiles/me`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  CORE SERVICE — Notifications
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchNotifications() {
    return authFetch(`${CORE_SERVICE_URL}/notifications`);
}

export async function fetchUnreadCount() {
    return authFetch(`${CORE_SERVICE_URL}/notifications/unread-count`);
}

export async function markNotificationRead(id) {
    return authFetch(`${CORE_SERVICE_URL}/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead() {
    return authFetch(`${CORE_SERVICE_URL}/notifications/read-all`, { method: 'PUT' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  CORE SERVICE — Calendar Events
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchUpcomingEvents() {
    return authFetch(`${CORE_SERVICE_URL}/events`);
}

export async function registerForEvent(eventId) {
    return authFetch(`${CORE_SERVICE_URL}/events/${eventId}/register`, { method: 'POST' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  CORE SERVICE — News
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchNews(category = null) {
    const url = category
        ? `${CORE_SERVICE_URL}/news?category=${encodeURIComponent(category)}`
        : `${CORE_SERVICE_URL}/news`;
    return authFetch(url);
}

export async function fetchPublicNews() {
    return authFetch(`${CORE_SERVICE_URL}/news/public`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CORE SERVICE — Interventions
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchMyInterventions(volunteerId) {
    return authFetch(`${CORE_SERVICE_URL}/interventions/volunteer/${volunteerId}`);
}

export async function fetchAllInterventions() {
    return authFetch(`${CORE_SERVICE_URL}/interventions`);
}

export async function fetchInterventionById(id) {
    return authFetch(`${CORE_SERVICE_URL}/interventions/${id}`);
}

export async function fetchInterventionParticipants(id) {
    return authFetch(`${CORE_SERVICE_URL}/interventions/${id}/participants`);
}

export async function startIntervention(id) {
    return authFetch(`${CORE_SERVICE_URL}/interventions/${id}/start`, { method: 'POST' });
}

export async function completeIntervention(id, reportContent, beneficiariesCount) {
    return authFetch(`${CORE_SERVICE_URL}/interventions/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ reportContent, beneficiariesCount }),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  CORE SERVICE — RCP Evaluations (Trainers)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchMyRcpEvaluations() {
    return authFetch(`${CORE_SERVICE_URL}/secourisme/rcp-evaluations/my`);
}

export async function submitRcpEvaluation(evaluationDto) {
    return authFetch(`${CORE_SERVICE_URL}/secourisme/rcp-evaluations`, {
        method: 'POST',
        body: JSON.stringify(evaluationDto),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN SERVICE — Report Filling (Volunteers & Responsables)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchMyReports() {
    return authFetch(`${ADMIN_SERVICE_URL}/reports/my`);
}

export async function fetchAssignedReports() {
    return authFetch(`${ADMIN_SERVICE_URL}/reports/assigned`);
}

export async function fetchReportById(id) {
    return authFetch(`${ADMIN_SERVICE_URL}/reports/${id}`);
}

export async function updateReportData(reportId, filledData) {
    return authFetch(`${ADMIN_SERVICE_URL}/reports/${reportId}/data`, {
        method: 'PUT',
        body: JSON.stringify({ filledData }),
    });
}

export async function submitReport(reportId) {
    return authFetch(`${ADMIN_SERVICE_URL}/reports/${reportId}/submit`, { method: 'POST' });
}

export async function fetchReportsByStatus(status) {
    return authFetch(`${ADMIN_SERVICE_URL}/reports/status/${status}`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Combined singleton-style export
// ─────────────────────────────────────────────────────────────────────────────
export const coreAPI = {
    // Profile
    fetchMyProfile,
    updateMyProfile,
    // Notifications
    fetchNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    // Events
    fetchUpcomingEvents,
    registerForEvent,
    // News
    fetchNews,
    fetchPublicNews,
    // Interventions
    fetchMyInterventions,
    fetchAllInterventions,
    fetchInterventionById,
    fetchInterventionParticipants,
    startIntervention,
    completeIntervention,
    // RCP Evaluations
    fetchMyRcpEvaluations,
    submitRcpEvaluation,
    // Admin Reports
    fetchMyReports,
    fetchAssignedReports,
    fetchReportById,
    updateReportData,
    submitReport,
    fetchReportsByStatus,
};
