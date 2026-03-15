import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createListingForUser,
    deleteListingForUser,
    getAllListings,
    getListingForUser,
    getListingsForUser,
    updateListingForUser
} from './listingService';
import {
    createListing,
    deleteListingById,
    findAllListings,
    findListingByIdForUser,
    findListingsByUserId,
    updateListingById
} from '../db/queries/listingQueries';

vi.mock('../db/queries/listingQueries', () => ({
    createListing: vi.fn(),
    deleteListingById: vi.fn(),
    findAllListings: vi.fn(),
    findListingByIdForUser: vi.fn(),
    findListingsByUserId: vi.fn(),
    updateListingById: vi.fn()
}));

function makeListingRecord(overrides: Partial<{
    id: string;
    user_id: string;
    name: string;
    description: string;
    price_cents: number;
    categories: string[];
    created_at: string;
    updated_at: string;
}> = {}) {
    return {
        id: 'listing-1',
        user_id: 'user-1',
        name: 'Desk Lamp',
        description: 'Dorm ready lamp',
        price_cents: 1899,
        categories: ['electronics'],
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
        ...overrides
    };
}

describe('server listingService', () => {
    const mockedCreateListing = vi.mocked(createListing);
    const mockedDeleteListingById = vi.mocked(deleteListingById);
    const mockedFindAllListings = vi.mocked(findAllListings);
    const mockedFindListingByIdForUser = vi.mocked(findListingByIdForUser);
    const mockedFindListingsByUserId = vi.mocked(findListingsByUserId);
    const mockedUpdateListingById = vi.mocked(updateListingById);

    beforeEach(() => {
        mockedCreateListing.mockReset();
        mockedDeleteListingById.mockReset();
        mockedFindAllListings.mockReset();
        mockedFindListingByIdForUser.mockReset();
        mockedFindListingsByUserId.mockReset();
        mockedUpdateListingById.mockReset();
    });

    it('creates a listing with normalized categories and price in cents', async () => {
        mockedCreateListing.mockResolvedValue(
            makeListingRecord({ price_cents: 1999, categories: ['electronics', 'other'] })
        );

        const result = await createListingForUser('user-1', {
            name: 'Desk Lamp',
            description: 'Dorm ready lamp',
            price: 19.99,
            categories: ['Electronics', 'electronics', 'Other']
        });

        expect(mockedCreateListing).toHaveBeenCalledWith({
            userId: 'user-1',
            name: 'Desk Lamp',
            description: 'Dorm ready lamp',
            priceCents: 1999,
            categories: ['electronics', 'other']
        });
        expect(result).toEqual({
            id: 'listing-1',
            userId: 'user-1',
            name: 'Desk Lamp',
            description: 'Dorm ready lamp',
            price: 19.99,
            categories: ['electronics', 'other'],
            createdAt: '2026-03-15T12:00:00.000Z'
        });
    });

    it('maps public listings into API responses', async () => {
        mockedFindAllListings.mockResolvedValue([
            makeListingRecord(),
            makeListingRecord({ id: 'listing-2', price_cents: 2500, categories: ['furniture'] })
        ]);

        const result = await getAllListings();

        expect(result).toEqual([
            {
                id: 'listing-1',
                userId: 'user-1',
                name: 'Desk Lamp',
                description: 'Dorm ready lamp',
                price: 18.99,
                categories: ['electronics'],
                createdAt: '2026-03-15T12:00:00.000Z'
            },
            {
                id: 'listing-2',
                userId: 'user-1',
                name: 'Desk Lamp',
                description: 'Dorm ready lamp',
                price: 25,
                categories: ['furniture'],
                createdAt: '2026-03-15T12:00:00.000Z'
            }
        ]);
    });

    it('retrieves the current users listings', async () => {
        mockedFindListingsByUserId.mockResolvedValue([makeListingRecord()]);

        const result = await getListingsForUser('user-1');

        expect(mockedFindListingsByUserId).toHaveBeenCalledWith('user-1');
        expect(result).toHaveLength(1);
        expect(result[0]?.userId).toBe('user-1');
    });

    it('retrieves a single owned listing and throws when it is missing', async () => {
        mockedFindListingByIdForUser.mockResolvedValueOnce(makeListingRecord());
        mockedFindListingByIdForUser.mockResolvedValueOnce(null as never);

        await expect(getListingForUser('user-1', 'listing-1')).resolves.toMatchObject({
            id: 'listing-1',
            userId: 'user-1'
        });
        await expect(getListingForUser('user-1', 'missing')).rejects.toMatchObject({
            message: 'Listing not found.',
            statusCode: 404
        });
    });

    it('updates a listing and throws when the record is missing', async () => {
        mockedUpdateListingById.mockResolvedValueOnce(
            makeListingRecord({
                name: 'Updated Lamp',
                description: 'Better bulb included',
                price_cents: 2400,
                categories: ['electronics', 'other']
            })
        );
        mockedUpdateListingById.mockResolvedValueOnce(null as never);

        await expect(
            updateListingForUser('user-1', 'listing-1', {
                name: 'Updated Lamp',
                description: 'Better bulb included',
                price: 24,
                categories: ['Electronics', 'Other', 'electronics']
            })
        ).resolves.toEqual({
            id: 'listing-1',
            userId: 'user-1',
            name: 'Updated Lamp',
            description: 'Better bulb included',
            price: 24,
            categories: ['electronics', 'other'],
            createdAt: '2026-03-15T12:00:00.000Z'
        });

        expect(mockedUpdateListingById).toHaveBeenNthCalledWith(1, {
            listingId: 'listing-1',
            userId: 'user-1',
            name: 'Updated Lamp',
            description: 'Better bulb included',
            priceCents: 2400,
            categories: ['electronics', 'other']
        });

        await expect(
            updateListingForUser('user-1', 'missing', {
                name: 'Updated Lamp',
                description: 'Better bulb included',
                price: 24,
                categories: ['electronics']
            })
        ).rejects.toMatchObject({
            message: 'Listing not found.',
            statusCode: 404
        });
    });

    it('deletes a listing and throws when the record is missing', async () => {
        mockedDeleteListingById.mockResolvedValueOnce(makeListingRecord());
        mockedDeleteListingById.mockResolvedValueOnce(null as never);

        await expect(deleteListingForUser('user-1', 'listing-1')).resolves.toBeUndefined();
        expect(mockedDeleteListingById).toHaveBeenNthCalledWith(1, 'listing-1', 'user-1');

        await expect(deleteListingForUser('user-1', 'missing')).rejects.toMatchObject({
            message: 'Listing not found.',
            statusCode: 404
        });
    });
});
