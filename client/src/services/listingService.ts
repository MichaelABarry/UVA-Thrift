import { apiFetch } from './api';
import type { CreateListingPayload, Listing } from '../types/listing';

export function createListing(payload: CreateListingPayload) {
    return apiFetch<{ listing: Listing }>('/api/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectedStatus: 201
    });
}
