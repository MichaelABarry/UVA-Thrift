import { apiFetch } from './api';
import type { Listing } from '../types/listing';

export function getWatchedListings() {
    return apiFetch<{ listings: Listing[] }>('/api/listing-watches');
}

export function createListingWatch(listingId: string) {
    return apiFetch<{ listing: Listing }>('/api/listing-watches', {
        method: 'POST',
        body: JSON.stringify({ listingId }),
        expectedStatus: 201
    });
}

export function deleteListingWatch(listingId: string) {
    return apiFetch<void>(`/api/listing-watches/${listingId}`, {
        method: 'DELETE',
        expectedStatus: 204
    });
}

export function getListingWatchStatus(listingId: string) {
    return apiFetch<{ isWatching: boolean }>(`/api/listing-watches/${listingId}`);
}