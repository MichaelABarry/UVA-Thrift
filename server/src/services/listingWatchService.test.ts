import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createListingWatchForUser,
    deleteListingWatchForUser,
    getListingWatchStatusForUser,
    getWatchedListingsForUser,
    notifyWatchersAboutListingChange
} from './listingWatchService';
import {
    createListingWatch,
    deleteListingWatch,
    findListingWatch,
    findListingWatchRecipients,
    findWatchedListingsByUserId
} from '../db/queries/listingWatchQueries';
import { findListingById } from '../db/queries/listingQueries';
import { sendWatchedListingChangeEmail } from './emailService';

vi.mock('../db/queries/listingWatchQueries', () => ({
    createListingWatch: vi.fn(),
    deleteListingWatch: vi.fn(),
    findListingWatch: vi.fn(),
    findListingWatchRecipients: vi.fn(),
    findWatchedListingsByUserId: vi.fn()
}));

vi.mock('../db/queries/listingQueries', () => ({
    findListingById: vi.fn()
}));

vi.mock('./emailService', () => ({
    sendWatchedListingChangeEmail: vi.fn()
}));

function makeListingRecord(overrides: Partial<{
    id: string;
    user_id: string;
    name: string;
    description: string;
    price_cents: number;
    categories: string[];
    image_url: string | null;
    image_key: string | null;
    created_at: string;
    updated_at: string;
}> = {}) {
    return {
        id: 'listing-1',
        user_id: 'seller-1',
        name: 'Desk Lamp',
        description: 'Dorm-ready lamp',
        price_cents: 1800,
        categories: ['electronics'],
        image_url: null,
        image_key: null,
        created_at: '2026-03-23T12:00:00.000Z',
        updated_at: '2026-03-23T12:00:00.000Z',
        ...overrides
    };
}

describe('listingWatchService', () => {
    const mockedCreateListingWatch = vi.mocked(createListingWatch);
    const mockedDeleteListingWatch = vi.mocked(deleteListingWatch);
    const mockedFindListingById = vi.mocked(findListingById);
    const mockedFindListingWatch = vi.mocked(findListingWatch);
    const mockedFindListingWatchRecipients = vi.mocked(findListingWatchRecipients);
    const mockedFindWatchedListingsByUserId = vi.mocked(findWatchedListingsByUserId);
    const mockedSendWatchedListingChangeEmail = vi.mocked(sendWatchedListingChangeEmail);

    beforeEach(() => {
        mockedCreateListingWatch.mockReset();
        mockedDeleteListingWatch.mockReset();
        mockedFindListingById.mockReset();
        mockedFindListingWatch.mockReset();
        mockedFindListingWatchRecipients.mockReset();
        mockedFindWatchedListingsByUserId.mockReset();
        mockedSendWatchedListingChangeEmail.mockReset();
    });

    it('creates a watch for an existing listing', async () => {
        mockedFindListingById.mockResolvedValue(makeListingRecord());
        mockedCreateListingWatch.mockResolvedValue({ user_id: 'user-1', listing_id: 'listing-1', created_at: '2026-03-23T12:00:00.000Z' });

        await expect(createListingWatchForUser('user-1', { listingId: 'listing-1' })).resolves.toMatchObject({
            id: 'listing-1',
            userId: 'seller-1'
        });
    });

    it('lists watched listings and watch status', async () => {
        mockedFindWatchedListingsByUserId.mockResolvedValue([makeListingRecord()]);
        mockedFindListingWatch.mockResolvedValue({ user_id: 'user-1', listing_id: 'listing-1', created_at: '2026-03-23T12:00:00.000Z' });

        await expect(getWatchedListingsForUser('user-1')).resolves.toHaveLength(1);
        await expect(getListingWatchStatusForUser('user-1', 'listing-1')).resolves.toEqual({ isWatching: true });
    });

    it('deletes an existing watch', async () => {
        mockedDeleteListingWatch.mockResolvedValue({ user_id: 'user-1', listing_id: 'listing-1', created_at: '2026-03-23T12:00:00.000Z' });

        await expect(deleteListingWatchForUser('user-1', 'listing-1')).resolves.toBeUndefined();
    });

    it('emails watchers when a watched listing changes', async () => {
        mockedFindListingWatchRecipients.mockResolvedValue([{ user_id: 'user-2', email: 'watcher@virginia.edu' }]);
        mockedSendWatchedListingChangeEmail.mockResolvedValue(undefined);

        await notifyWatchersAboutListingChange('updated', {
            id: 'listing-1',
            userId: 'seller-1',
            name: 'Desk Lamp',
            description: 'Dorm-ready lamp',
            price: 18,
            categories: ['electronics'],
            imageUrl: null,
            createdAt: '2026-03-23T12:00:00.000Z'
        }, 'seller-1');

        expect(mockedFindListingWatchRecipients).toHaveBeenCalledWith('listing-1', 'seller-1');
        expect(mockedSendWatchedListingChangeEmail).toHaveBeenCalledWith({
            toEmail: 'watcher@virginia.edu',
            changeType: 'updated',
            listing: expect.objectContaining({ id: 'listing-1' })
        });
    });
});