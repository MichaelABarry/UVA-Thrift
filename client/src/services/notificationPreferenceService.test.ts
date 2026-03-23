import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import {
    createNotificationPreference,
    deleteNotificationPreference,
    getNotificationPreferences
} from './notificationPreferenceService';

vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

describe('notificationPreferenceService', () => {
    const mockedApiFetch = vi.mocked(apiFetch);

    beforeEach(() => {
        mockedApiFetch.mockReset();
    });

    it('retrieves all notification preferences', async () => {
        mockedApiFetch.mockResolvedValue({ preferences: [] } as never);

        await getNotificationPreferences();

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/notification-preferences');
    });

    it('creates a notification preference', async () => {
        mockedApiFetch.mockResolvedValue({ preference: { id: 'pref-1' } } as never);

        await createNotificationPreference({ keywords: ['lamp'], categories: ['electronics'] });

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/notification-preferences', {
            method: 'POST',
            body: JSON.stringify({ keywords: ['lamp'], categories: ['electronics'] }),
            expectedStatus: 201
        });
    });

    it('deletes a notification preference', async () => {
        mockedApiFetch.mockResolvedValue(undefined as never);

        await deleteNotificationPreference('pref-1');

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/notification-preferences/pref-1', {
            method: 'DELETE',
            expectedStatus: 204
        });
    });
});