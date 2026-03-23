import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createNotificationPreferenceForUser,
    deleteNotificationPreferenceForUser,
    getNotificationPreferencesForUser,
    notifyUsersAboutNewListing
} from './notificationPreferenceService';
import {
    createNotificationPreference,
    deleteNotificationPreferenceById,
    findNotificationPreferencesByUserId,
    findNotificationRecipientsForListing
} from '../db/queries/notificationPreferenceQueries';
import { sendListingNotificationEmail } from './emailService';

vi.mock('../db/queries/notificationPreferenceQueries', () => ({
    createNotificationPreference: vi.fn(),
    deleteNotificationPreferenceById: vi.fn(),
    findNotificationPreferencesByUserId: vi.fn(),
    findNotificationRecipientsForListing: vi.fn()
}));

vi.mock('./emailService', () => ({
    sendListingNotificationEmail: vi.fn()
}));

function makePreferenceRecord(overrides: Partial<{
    id: string;
    user_id: string;
    keywords: string[];
    categories: string[];
    created_at: string;
    updated_at: string;
}> = {}) {
    return {
        id: 'pref-1',
        user_id: 'user-1',
        keywords: ['lamp', 'desk'],
        categories: ['electronics'],
        created_at: '2026-03-23T12:00:00.000Z',
        updated_at: '2026-03-23T12:00:00.000Z',
        ...overrides
    };
}

describe('notificationPreferenceService', () => {
    const mockedCreateNotificationPreference = vi.mocked(createNotificationPreference);
    const mockedDeleteNotificationPreferenceById = vi.mocked(deleteNotificationPreferenceById);
    const mockedFindNotificationPreferencesByUserId = vi.mocked(findNotificationPreferencesByUserId);
    const mockedFindNotificationRecipientsForListing = vi.mocked(findNotificationRecipientsForListing);
    const mockedSendListingNotificationEmail = vi.mocked(sendListingNotificationEmail);

    beforeEach(() => {
        mockedCreateNotificationPreference.mockReset();
        mockedDeleteNotificationPreferenceById.mockReset();
        mockedFindNotificationPreferencesByUserId.mockReset();
        mockedFindNotificationRecipientsForListing.mockReset();
        mockedSendListingNotificationEmail.mockReset();
    });

    it('creates a normalized notification preference', async () => {
        mockedCreateNotificationPreference.mockResolvedValue(makePreferenceRecord());

        await expect(
            createNotificationPreferenceForUser('user-1', {
                keywords: [' Lamp ', 'desk', 'lamp'],
                categories: ['Electronics', 'electronics']
            })
        ).resolves.toEqual({
            id: 'pref-1',
            userId: 'user-1',
            keywords: ['lamp', 'desk'],
            categories: ['electronics'],
            createdAt: '2026-03-23T12:00:00.000Z',
            updatedAt: '2026-03-23T12:00:00.000Z'
        });

        expect(mockedCreateNotificationPreference).toHaveBeenCalledWith({
            userId: 'user-1',
            keywords: ['lamp', 'desk'],
            categories: ['electronics']
        });
    });

    it('lists notification preferences for a user', async () => {
        mockedFindNotificationPreferencesByUserId.mockResolvedValue([makePreferenceRecord()]);

        await expect(getNotificationPreferencesForUser('user-1')).resolves.toHaveLength(1);
        expect(mockedFindNotificationPreferencesByUserId).toHaveBeenCalledWith('user-1');
    });

    it('deletes an existing notification preference', async () => {
        mockedDeleteNotificationPreferenceById.mockResolvedValue(makePreferenceRecord());

        await expect(deleteNotificationPreferenceForUser('user-1', 'pref-1')).resolves.toBeUndefined();
        expect(mockedDeleteNotificationPreferenceById).toHaveBeenCalledWith('pref-1', 'user-1');
    });

    it('emails all matching recipients for a new listing', async () => {
        mockedFindNotificationRecipientsForListing.mockResolvedValue([
            { user_id: 'user-2', email: 'student1@virginia.edu' },
            { user_id: 'user-3', email: 'student2@virginia.edu' }
        ]);
        mockedSendListingNotificationEmail.mockResolvedValue(undefined);

        await notifyUsersAboutNewListing({
            id: 'listing-1',
            userId: 'user-1',
            name: 'Desk Lamp',
            description: 'Bright lamp for your dorm desk',
            price: 18.99,
            categories: ['electronics'],
            imageUrl: null,
            createdAt: '2026-03-23T12:00:00.000Z'
        });

        expect(mockedFindNotificationRecipientsForListing).toHaveBeenCalledWith({
            listingOwnerUserId: 'user-1',
            listingName: 'desk lamp',
            listingDescription: 'bright lamp for your dorm desk',
            listingCategories: ['electronics']
        });
        expect(mockedSendListingNotificationEmail).toHaveBeenCalledTimes(2);
    });
});