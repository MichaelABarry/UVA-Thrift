import { apiFetch } from './api';
import type { CreateNotificationPreferencePayload, NotificationPreference } from '../types/notificationPreference';

export function getNotificationPreferences() {
    return apiFetch<{ preferences: NotificationPreference[] }>('/api/notification-preferences');
}

export function createNotificationPreference(payload: CreateNotificationPreferencePayload) {
    return apiFetch<{ preference: NotificationPreference }>('/api/notification-preferences', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectedStatus: 201
    });
}

export function deleteNotificationPreference(preferenceId: string) {
    return apiFetch<void>(`/api/notification-preferences/${preferenceId}`, {
        method: 'DELETE',
        expectedStatus: 204
    });
}