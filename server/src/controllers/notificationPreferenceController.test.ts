import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createNotificationPreference,
    deleteNotificationPreference,
    listNotificationPreferences
} from './notificationPreferenceController';
import {
    createNotificationPreferenceForUser,
    deleteNotificationPreferenceForUser,
    getNotificationPreferencesForUser
} from '../services/notificationPreferenceService';

vi.mock('../services/notificationPreferenceService', () => ({
    createNotificationPreferenceForUser: vi.fn(),
    deleteNotificationPreferenceForUser: vi.fn(),
    getNotificationPreferencesForUser: vi.fn()
}));

function createResponse() {
    const response = {
        status: vi.fn(),
        json: vi.fn(),
        send: vi.fn()
    };

    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);
    response.send.mockReturnValue(response);

    return response as unknown as Response;
}

describe('notificationPreferenceController', () => {
    const mockedCreateNotificationPreferenceForUser = vi.mocked(createNotificationPreferenceForUser);
    const mockedDeleteNotificationPreferenceForUser = vi.mocked(deleteNotificationPreferenceForUser);
    const mockedGetNotificationPreferencesForUser = vi.mocked(getNotificationPreferencesForUser);

    beforeEach(() => {
        mockedCreateNotificationPreferenceForUser.mockReset();
        mockedDeleteNotificationPreferenceForUser.mockReset();
        mockedGetNotificationPreferencesForUser.mockReset();
    });

    it('creates a notification preference', async () => {
        const response = createResponse();
        const preference = { id: 'pref-1' };
        mockedCreateNotificationPreferenceForUser.mockResolvedValue(preference as never);

        await createNotificationPreference({ user: { id: 'user-1' }, body: { keywords: ['lamp'] } } as Request, response);

        expect(mockedCreateNotificationPreferenceForUser).toHaveBeenCalledWith('user-1', { keywords: ['lamp'] });
        expect(response.status).toHaveBeenCalledWith(201);
        expect(response.json).toHaveBeenCalledWith({ preference });
    });

    it('lists notification preferences', async () => {
        const response = createResponse();
        const preferences = [{ id: 'pref-1' }];
        mockedGetNotificationPreferencesForUser.mockResolvedValue(preferences as never);

        await listNotificationPreferences({ user: { id: 'user-1' } } as Request, response);

        expect(mockedGetNotificationPreferencesForUser).toHaveBeenCalledWith('user-1');
        expect(response.json).toHaveBeenCalledWith({ preferences });
    });

    it('deletes a notification preference', async () => {
        const response = createResponse();
        mockedDeleteNotificationPreferenceForUser.mockResolvedValue(undefined);

        await deleteNotificationPreference(
            { user: { id: 'user-1' }, params: { preferenceId: 'pref-1' } } as unknown as Request,
            response
        );

        expect(mockedDeleteNotificationPreferenceForUser).toHaveBeenCalledWith('user-1', 'pref-1');
        expect(response.status).toHaveBeenCalledWith(204);
    });
});