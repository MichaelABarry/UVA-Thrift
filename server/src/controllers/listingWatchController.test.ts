import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createListingWatch,
    deleteListingWatch,
    getListingWatchStatus,
    listWatchedListings
} from './listingWatchController';
import {
    createListingWatchForUser,
    deleteListingWatchForUser,
    getListingWatchStatusForUser,
    getWatchedListingsForUser
} from '../services/listingWatchService';

vi.mock('../services/listingWatchService', () => ({
    createListingWatchForUser: vi.fn(),
    deleteListingWatchForUser: vi.fn(),
    getListingWatchStatusForUser: vi.fn(),
    getWatchedListingsForUser: vi.fn()
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

describe('listingWatchController', () => {
    const mockedCreateListingWatchForUser = vi.mocked(createListingWatchForUser);
    const mockedDeleteListingWatchForUser = vi.mocked(deleteListingWatchForUser);
    const mockedGetListingWatchStatusForUser = vi.mocked(getListingWatchStatusForUser);
    const mockedGetWatchedListingsForUser = vi.mocked(getWatchedListingsForUser);

    beforeEach(() => {
        mockedCreateListingWatchForUser.mockReset();
        mockedDeleteListingWatchForUser.mockReset();
        mockedGetListingWatchStatusForUser.mockReset();
        mockedGetWatchedListingsForUser.mockReset();
    });

    it('lists watched listings', async () => {
        const response = createResponse();
        const listings = [{ id: 'listing-1' }];
        mockedGetWatchedListingsForUser.mockResolvedValue(listings as never);

        await listWatchedListings({ user: { id: 'user-1' } } as Request, response);

        expect(response.json).toHaveBeenCalledWith({ listings });
    });

    it('creates a watch', async () => {
        const response = createResponse();
        const listing = { id: 'listing-1' };
        mockedCreateListingWatchForUser.mockResolvedValue(listing as never);

        await createListingWatch({ user: { id: 'user-1' }, body: { listingId: 'listing-1' } } as Request, response);

        expect(response.status).toHaveBeenCalledWith(201);
        expect(response.json).toHaveBeenCalledWith({ listing });
    });

    it('returns watch status and deletes watches', async () => {
        const response = createResponse();
        mockedGetListingWatchStatusForUser.mockResolvedValue({ isWatching: true });
        mockedDeleteListingWatchForUser.mockResolvedValue(undefined);

        await getListingWatchStatus({ user: { id: 'user-1' }, params: { listingId: 'listing-1' } } as unknown as Request, response);
        await deleteListingWatch({ user: { id: 'user-1' }, params: { listingId: 'listing-1' } } as unknown as Request, response);

        expect(response.json).toHaveBeenCalledWith({ isWatching: true });
        expect(response.status).toHaveBeenLastCalledWith(204);
    });
});