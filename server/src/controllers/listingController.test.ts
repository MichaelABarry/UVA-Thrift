import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createListing,
    deleteMyListing,
    getMyListing,
    listListings,
    listMyListings,
    updateMyListing
} from './listingController';
import {
    createListingForUser,
    deleteListingForUser,
    getAllListings,
    getListingForUser,
    getListingsForUser,
    updateListingForUser
} from '../services/listingService';

vi.mock('../services/listingService', () => ({
    createListingForUser: vi.fn(),
    deleteListingForUser: vi.fn(),
    getAllListings: vi.fn(),
    getListingForUser: vi.fn(),
    getListingsForUser: vi.fn(),
    updateListingForUser: vi.fn()
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

describe('listingController', () => {
    const mockedCreateListingForUser = vi.mocked(createListingForUser);
    const mockedDeleteListingForUser = vi.mocked(deleteListingForUser);
    const mockedGetAllListings = vi.mocked(getAllListings);
    const mockedGetListingForUser = vi.mocked(getListingForUser);
    const mockedGetListingsForUser = vi.mocked(getListingsForUser);
    const mockedUpdateListingForUser = vi.mocked(updateListingForUser);

    beforeEach(() => {
        mockedCreateListingForUser.mockReset();
        mockedDeleteListingForUser.mockReset();
        mockedGetAllListings.mockReset();
        mockedGetListingForUser.mockReset();
        mockedGetListingsForUser.mockReset();
        mockedUpdateListingForUser.mockReset();
    });

    it('rejects unauthenticated create requests', async () => {
        const response = createResponse();

        await expect(createListing({ body: {} } as Request, response)).rejects.toMatchObject({
            message: 'Unauthorized.',
            statusCode: 401
        });
    });

    it('creates a listing for the authenticated user', async () => {
        const response = createResponse();
        const listing = { id: 'listing-1' };
        const file = { originalname: 'lamp.png' } as Express.Multer.File;

        mockedCreateListingForUser.mockResolvedValue(listing as never);

        await createListing({ user: { id: 'user-1' }, body: { name: 'Desk Lamp' }, file } as Request, response);

        expect(mockedCreateListingForUser).toHaveBeenCalledWith('user-1', { name: 'Desk Lamp' }, file);
        expect(response.status).toHaveBeenCalledWith(201);
        expect(response.json).toHaveBeenCalledWith({ listing });
    });

    it('lists all public listings', async () => {
        const response = createResponse();
        const listings = [{ id: 'listing-1' }];

        mockedGetAllListings.mockResolvedValue(listings as never);

        await listListings({} as Request, response);

        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({ listings });
    });

    it('lists the current users listings', async () => {
        const response = createResponse();
        const listings = [{ id: 'listing-1' }];

        mockedGetListingsForUser.mockResolvedValue(listings as never);

        await listMyListings({ user: { id: 'user-1' } } as Request, response);

        expect(mockedGetListingsForUser).toHaveBeenCalledWith('user-1');
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({ listings });
    });

    it('retrieves a single owned listing', async () => {
        const response = createResponse();
        const listing = { id: 'listing-1' };

        mockedGetListingForUser.mockResolvedValue(listing as never);

        await getMyListing({ user: { id: 'user-1' }, params: { listingId: 'listing-1' } } as unknown as Request, response);

        expect(mockedGetListingForUser).toHaveBeenCalledWith('user-1', 'listing-1');
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({ listing });
    });

    it('updates a single owned listing', async () => {
        const response = createResponse();
        const listing = { id: 'listing-1' };
        const body = { name: 'Updated Lamp' };
        const file = { originalname: 'lamp.png' } as Express.Multer.File;

        mockedUpdateListingForUser.mockResolvedValue(listing as never);

        await updateMyListing(
            { user: { id: 'user-1' }, params: { listingId: 'listing-1' }, body, file } as unknown as Request,
            response
        );

        expect(mockedUpdateListingForUser).toHaveBeenCalledWith('user-1', 'listing-1', body, file);
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({ listing });
    });

    it('deletes a single owned listing', async () => {
        const response = createResponse();

        mockedDeleteListingForUser.mockResolvedValue(undefined);

        await deleteMyListing({ user: { id: 'user-1' }, params: { listingId: 'listing-1' } } as unknown as Request, response);

        expect(mockedDeleteListingForUser).toHaveBeenCalledWith('user-1', 'listing-1');
        expect(response.status).toHaveBeenCalledWith(204);
        expect(response.send).toHaveBeenCalled();
    });
});
