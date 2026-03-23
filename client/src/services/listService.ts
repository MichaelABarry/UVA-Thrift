import { apiFetch } from './api';
import type { CreateListPayload, ItemList, UpdateListPayload } from '../types/list';

export function getLists() {
    return apiFetch<{ lists: ItemList[] }>('/api/lists');
}

export function getList(listId: string) {
    return apiFetch<{ list: ItemList }>(`/api/lists/${listId}`);
}

export function createList(payload: CreateListPayload) {
    return apiFetch<{ list: ItemList }>('/api/lists', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectedStatus: 201
    });
}

export function updateList(listId: string, payload: UpdateListPayload) {
    return apiFetch<{ list: ItemList }>(`/api/lists/${listId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export function deleteList(listId: string) {
    return apiFetch<void>(`/api/lists/${listId}`, {
        method: 'DELETE',
        expectedStatus: 204
    });
}

export function addItemToList(listId: string, listingId: string) {
    return apiFetch<{ list: ItemList }>(`/api/lists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify({ listingId })
    });
}

export function removeItemFromList(listId: string, listingId: string) {
    return apiFetch<{ list: ItemList }>(`/api/lists/${listId}/items/${listingId}`, {
        method: 'DELETE'
    });
}