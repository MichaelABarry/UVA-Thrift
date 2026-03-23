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
    findListingById,
    findListingByIdForUser,
    findListingsByUserId,
    updateListingById
} from '../db/queries/listingQueries';
import { notifyUsersAboutNewListing } from './notificationPreferenceService';
import { deleteListingImage, uploadListingImage } from './storageService';

vi.mock('../db/queries/listingQueries', () => ({
    createListing: vi.fn(),
    deleteListingById: vi.fn(),
    findAllListings: vi.fn(),
    findListingById: vi.fn(),
    findListingByIdForUser: vi.fn(),
    findListingsByUserId: vi.fn(),
    updateListingById: vi.fn()
}));

vi.mock('./notificationPreferenceService', () => ({
    notifyUsersAboutNewListing: vi.fn()
}));

vi.mock('./storageService', () => ({
    deleteListingImage: vi.fn(),
    uploadListingImage: vi.fn()
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
        user_id: 'user-1',
        name: 'Desk Lamp',
        description: 'Dorm ready lamp',
        price_cents: 1899,
        categories: ['electronics'],
        image_url: null,
        image_key: null,
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
        ...overrides
    };
}

describe('server listingService', () => {
    const mockedCreateListing = vi.mocked(createListing);
    const mockedDeleteListingById = vi.mocked(deleteListingById);
    const mockedFindAllListings = vi.mocked(findAllListings);
    const mockedFindListingById = vi.mocked(findListingById);
    const mockedFindListingByIdForUser = vi.mocked(findListingByIdForUser);
    const mockedFindListingsByUserId = vi.mocked(findListingsByUserId);
    const mockedNotifyUsersAboutNewListing = vi.mocked(notifyUsersAboutNewListing);
    const mockedUpdateListingById = vi.mocked(updateListingById);
    const mockedDeleteListingImage = vi.mocked(deleteListingImage);
    const mockedUploadListingImage = vi.mocked(uploadListingImage);

    beforeEach(() => {
        mockedCreateListing.mockReset();
        mockedDeleteListingById.mockReset();
        mockedFindAllListings.mockReset();
        mockedFindListingById.mockReset();
        mockedFindListingByIdForUser.mockReset();
        mockedFindListingsByUserId.mockReset();
        mockedNotifyUsersAboutNewListing.mockReset();
        mockedUpdateListingById.mockReset();
        mockedDeleteListingImage.mockReset();
        mockedUploadListingImage.mockReset();
    });

    it('creates a listing with normalized categories, price in cents, and an uploaded image', async () => {
        const file = { originalname: 'lamp.png' } as Express.Multer.File;
        mockedUploadListingImage.mockResolvedValue({
            imageKey: 'listings/lamp.png',
            imageUrl: 'https://bucket.s3.amazonaws.com/listings/lamp.png'
        });
        mockedCreateListing.mockResolvedValue(
            makeListingRecord({
                price_cents: 1999,
                categories: ['electronics', 'other'],
                image_key: 'listings/lamp.png',
                image_url: 'https://bucket.s3.amazonaws.com/listings/lamp.png'
            })
        );

        const result = await createListingForUser('user-1', {
            name: 'Desk Lamp',
            description: 'Dorm ready lamp',
            price: 19.99,
            categories: ['Electronics', 'electronics', 'Other']
        }, file);

        expect(mockedUploadListingImage).toHaveBeenCalledWith(file);
        expect(mockedCreateListing).toHaveBeenCalledWith({
            userId: 'user-1',
            name: 'Desk Lamp',
            description: 'Dorm ready lamp',
            priceCents: 1999,
            categories: ['electronics', 'other'],
            imageKey: 'listings/lamp.png',
            imageUrl: 'https://bucket.s3.amazonaws.com/listings/lamp.png'
        });
        expect(mockedNotifyUsersAboutNewListing).toHaveBeenCalledWith({
            id: 'listing-1',
            userId: 'user-1',
            name: 'Desk Lamp',
            description: 'Dorm ready lamp',
            price: 19.99,
            categories: ['electronics', 'other'],
            imageUrl: 'https://bucket.s3.amazonaws.com/listings/lamp.png',
            createdAt: '2026-03-15T12:00:00.000Z'
        });
        expect(result).toEqual({
            id: 'listing-1',
            userId: 'user-1',
            name: 'Desk Lamp',
            description: 'Dorm ready lamp',
            price: 19.99,
            categories: ['electronics', 'other'],
            imageUrl: 'https://bucket.s3.amazonaws.com/listings/lamp.png',
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
                imageUrl: null,
                createdAt: '2026-03-15T12:00:00.000Z'
            },
            {
                id: 'listing-2',
                userId: 'user-1',
                name: 'Desk Lamp',
                description: 'Dorm ready lamp',
                price: 25,
                categories: ['furniture'],
                imageUrl: null,
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

    it('retrieves a single public listing and throws when it is missing', async () => {
        mockedFindListingById.mockResolvedValueOnce(makeListingRecord());
        mockedFindListingById.mockResolvedValueOnce(null as never);

        await expect(import('./listingService').then(({ getListingById }) => getListingById('listing-1'))).resolves.toMatchObject({
            id: 'listing-1',
            userId: 'user-1'
        });
        await expect(import('./listingService').then(({ getListingById }) => getListingById('missing'))).rejects.toMatchObject({
            message: 'Listing not found.',
            statusCode: 404
        });
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

    it('updates a listing, replaces the old image, and throws when the record is missing', async () => {
        const file = { originalname: 'lamp.png' } as Express.Multer.File;
        mockedFindListingByIdForUser.mockResolvedValueOnce(
            makeListingRecord({ image_key: 'listings/old.png', image_url: 'https://bucket.s3.amazonaws.com/listings/old.png' })
        );
        mockedUploadListingImage.mockResolvedValueOnce({
            imageKey: 'listings/new.png',
            imageUrl: 'https://bucket.s3.amazonaws.com/listings/new.png'
        });
        mockedUpdateListingById.mockResolvedValueOnce(
            makeListingRecord({
                name: 'Updated Lamp',
                description: 'Better bulb included',
                price_cents: 2400,
                categories: ['electronics', 'other'],
                image_key: 'listings/new.png',
                image_url: 'https://bucket.s3.amazonaws.com/listings/new.png'
            })
        );
        mockedFindListingByIdForUser.mockResolvedValueOnce(null as never);
        mockedUpdateListingById.mockResolvedValueOnce(null as never);

        await expect(
            updateListingForUser('user-1', 'listing-1', {
                name: 'Updated Lamp',
                description: 'Better bulb included',
                price: 24,
                categories: ['Electronics', 'Other', 'electronics']
            }, file)
        ).resolves.toEqual({
            id: 'listing-1',
            userId: 'user-1',
            name: 'Updated Lamp',
            description: 'Better bulb included',
            price: 24,
            categories: ['electronics', 'other'],
            imageUrl: 'https://bucket.s3.amazonaws.com/listings/new.png',
            createdAt: '2026-03-15T12:00:00.000Z'
        });

        expect(mockedUpdateListingById).toHaveBeenNthCalledWith(1, {
            listingId: 'listing-1',
            userId: 'user-1',
            name: 'Updated Lamp',
            description: 'Better bulb included',
            priceCents: 2400,
            categories: ['electronics', 'other'],
            imageKey: 'listings/new.png',
            imageUrl: 'https://bucket.s3.amazonaws.com/listings/new.png'
        });
        expect(mockedDeleteListingImage).toHaveBeenCalledWith('listings/old.png');

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

    it('deletes a listing, removes its image, and throws when the record is missing', async () => {
        mockedDeleteListingById.mockResolvedValueOnce(
            makeListingRecord({ image_key: 'listings/lamp.png', image_url: 'https://bucket.s3.amazonaws.com/listings/lamp.png' })
        );
        mockedDeleteListingById.mockResolvedValueOnce(null as never);

        await expect(deleteListingForUser('user-1', 'listing-1')).resolves.toBeUndefined();
        expect(mockedDeleteListingById).toHaveBeenNthCalledWith(1, 'listing-1', 'user-1');
        expect(mockedDeleteListingImage).toHaveBeenCalledWith('listings/lamp.png');

        await expect(deleteListingForUser('user-1', 'missing')).rejects.toMatchObject({
            message: 'Listing not found.',
            statusCode: 404
        });
    });
});
