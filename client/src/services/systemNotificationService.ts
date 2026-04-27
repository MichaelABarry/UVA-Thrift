import { apiFetch } from './api';

export type SystemNotification = {
    id: string;
    userId: string;
    title: string;
    body: string;
    link: string | null;
    readAt: string | null;
    createdAt: string;
};

type RawNotification = {
    id: string;
    user_id: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
};

function normalize(raw: RawNotification): SystemNotification {
    return {
        id: raw.id,
        userId: raw.user_id,
        title: raw.title,
        body: raw.body,
        link: raw.link,
        readAt: raw.read_at,
        createdAt: raw.created_at,
    };
}

export async function getSystemNotifications(): Promise<SystemNotification[]> {
    const data = await apiFetch<{ notifications: RawNotification[] }>(
        '/api/system-notifications'
    );
    return data.notifications.map(normalize);
}

export function markNotificationRead(notificationId: string): Promise<void> {
    return apiFetch<void>(`/api/system-notifications/${notificationId}/read`, {
        method: 'PATCH',
    });
}

export function markAllNotificationsRead(): Promise<void> {
    return apiFetch<void>('/api/system-notifications/read-all', {
        method: 'PATCH',
        expectedStatus: 204,
    });
}
