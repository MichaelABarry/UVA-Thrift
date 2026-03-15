import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import {
    createListing,
    deleteListing,
    getListings,
    getMyListing,
    getMyListings,
    updateListing
} from './listingService';

vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

describe('listingService', () => {
    const mockedApiFetch = vi.mocked(apiFetch);

    beforeEach(() => {
        mockedApiFetch.mockReset();
    });

    it('creates a listing with the expected request payload', async () => {
        const payload = {
            name: 'Desk Lamp',
            description: 'Great for dorms',
            price: 18.5,
            categories: ['electronics']
        };

        mockedApiFetch.mockResolvedValue({ listing: { id: '1' } } as never);

        await createListing(payload);

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listings', {
            method: 'POST',
            body: JSON.stringify(payload),
            expectedStatus: 201
        });
    });

    it('retrieves all public listings', async () => {
        mockedApiFetch.mockResolvedValue({ listings: [] } as never);

        await getListings();

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listings');
    });

    it('retrieves the current users listings', async () => {
        mockedApiFetch.mockResolvedValue({ listings: [] } as never);

        await getMyListings();

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listings/mine');
    });

    it('retrieves a single owned listing', async () => {
        mockedApiFetch.mockResolvedValue({ listing: { id: 'listing-1' } } as never);

        await getMyListing('listing-1');

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listings/listing-1');
    });

    it('updates a listing with a PUT request', async () => {
        const payload = {
            name: 'Desk Lamp',
            description: 'Updated description',
            price: 22,
            categories: ['electronics', 'other']
        };

        mockedApiFetch.mockResolvedValue({ listing: { id: 'listing-1' } } as never);

        await updateListing('listing-1', payload);

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listings/listing-1', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    });

    it('deletes a listing with the expected status guard', async () => {
        mockedApiFetch.mockResolvedValue(undefined as never);

        await deleteListing('listing-1');

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listings/listing-1', {
            method: 'DELETE',
            expectedStatus: 204
        });
    });
});
