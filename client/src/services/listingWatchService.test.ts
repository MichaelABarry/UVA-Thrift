import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import {
    createListingWatch,
    deleteListingWatch,
    getListingWatchStatus,
    getWatchedListings
} from './listingWatchService';

vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

describe('listingWatchService', () => {
    const mockedApiFetch = vi.mocked(apiFetch);

    beforeEach(() => {
        mockedApiFetch.mockReset();
    });

    it('retrieves watched listings', async () => {
        mockedApiFetch.mockResolvedValue({ listings: [] } as never);

        await getWatchedListings();

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listing-watches');
    });

    it('creates and deletes a listing watch', async () => {
        mockedApiFetch.mockResolvedValue({ listing: { id: 'listing-1' } } as never);

        await createListingWatch('listing-1');
        await deleteListingWatch('listing-1');

        expect(mockedApiFetch).toHaveBeenNthCalledWith(1, '/api/listing-watches', {
            method: 'POST',
            body: JSON.stringify({ listingId: 'listing-1' }),
            expectedStatus: 201
        });
        expect(mockedApiFetch).toHaveBeenNthCalledWith(2, '/api/listing-watches/listing-1', {
            method: 'DELETE',
            expectedStatus: 204
        });
    });

    it('retrieves watch status for a listing', async () => {
        mockedApiFetch.mockResolvedValue({ isWatching: true } as never);

        await getListingWatchStatus('listing-1');

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/listing-watches/listing-1');
    });
});