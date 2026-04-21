import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import {
    createListing,
    deleteListing,
    getListingDetails,
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
        const image = new File(['lamp'], 'lamp.png', { type: 'image/png' });
        const payload = {
            name: 'Desk Lamp',
            description: 'Great for dorms',
            price: 18.5,
            categories: ['electronics'],
            condition: 'Used - Good',
			expirationDays: 30,
            image
        };

        mockedApiFetch.mockResolvedValue({ listing: { id: '1' } } as never);

        await createListing(payload);

        expect(mockedApiFetch).toHaveBeenCalledTimes(1);
        expect(mockedApiFetch.mock.calls[0]?.[0]).toBe('/api/listings');
        expect(mockedApiFetch.mock.calls[0]?.[1]?.method).toBe('POST');
        expect(mockedApiFetch.mock.calls[0]?.[1]?.expectedStatus).toBe(201);
        expect(mockedApiFetch.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);

        const formData = mockedApiFetch.mock.calls[0]?.[1]?.body as FormData;
        expect(formData.get('name')).toBe('Desk Lamp');
        expect(formData.get('description')).toBe('Great for dorms');
        expect(formData.get('price')).toBe('18.5');
        expect(formData.get('categories')).toBe('["electronics"]');
        expect(formData.get('condition')).toBe('Used - Good');
        expect(formData.get('image')).toBe(image);
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

    it('retrieves a single marketplace listing detail', async () => {
        mockedApiFetch.mockResolvedValue({ listing: { id: 'listing-1' } } as never);

        await getListingDetails('listing-1');

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listings/details/listing-1');
    });

    it('updates a listing with a PUT request', async () => {
        const image = new File(['lamp'], 'lamp.png', { type: 'image/png' });
        const payload = {
            name: 'Desk Lamp',
            description: 'Updated description',
            price: 22,
            categories: ['electronics', 'other'],
            condition: 'Like New',
			expirationDays: 30,
            image
        };

        mockedApiFetch.mockResolvedValue({ listing: { id: 'listing-1' } } as never);

        await updateListing('listing-1', payload);

        expect(mockedApiFetch).toHaveBeenCalledTimes(1);
        expect(mockedApiFetch.mock.calls[0]?.[0]).toBe('/api/listings/listing-1');
        expect(mockedApiFetch.mock.calls[0]?.[1]?.method).toBe('PUT');
        expect(mockedApiFetch.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);

        const formData = mockedApiFetch.mock.calls[0]?.[1]?.body as FormData;
        expect(formData.get('name')).toBe('Desk Lamp');
        expect(formData.get('description')).toBe('Updated description');
        expect(formData.get('price')).toBe('22');
        expect(formData.get('categories')).toBe('["electronics","other"]');
        expect(formData.get('condition')).toBe('Like New');
        expect(formData.get('image')).toBe(image);
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
