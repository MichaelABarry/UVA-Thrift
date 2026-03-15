import { apiFetch } from './api';
import type { CreateListingPayload, Listing, UpdateListingPayload } from '../types/listing';

function buildListingFormData(payload: CreateListingPayload | UpdateListingPayload) {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('description', payload.description);
    formData.append('price', String(payload.price));
    formData.append('categories', JSON.stringify(payload.categories));

    if (payload.image) {
        formData.append('image', payload.image);
    }

    return formData;
}

export function createListing(payload: CreateListingPayload) {
    return apiFetch<{ listing: Listing }>('/api/listings', {
        method: 'POST',
        body: buildListingFormData(payload),
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
        body: buildListingFormData(payload)
    });
}

export function deleteListing(listingId: string) {
    return apiFetch<void>(`/api/listings/${listingId}`, {
        method: 'DELETE',
        expectedStatus: 204
    });
}
