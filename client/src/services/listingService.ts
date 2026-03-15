import { apiFetch } from './api';
import type { CreateListingPayload, Listing, UpdateListingPayload } from '../types/listing';

export function createListing(payload: CreateListingPayload) {
    return apiFetch<{ listing: Listing }>('/api/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectedStatus: 201
    });
}

export function getListings() {
    return apiFetch<{ listings: Listing[] }>('/api/listings');
}

export function getMyListings() {
    return apiFetch<{ listings: Listing[] }>('/api/listings/mine');
}

export function getMyListing(listingId: string) {
    return apiFetch<{ listing: Listing }>(`/api/listings/${listingId}`);
}

export function updateListing(listingId: string, payload: UpdateListingPayload) {
    return apiFetch<{ listing: Listing }>(`/api/listings/${listingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function deleteListing(listingId: string) {
    return apiFetch<void>(`/api/listings/${listingId}`, {
        method: 'DELETE',
        expectedStatus: 204
    });
}
