import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import {
    addItemToList,
    createList,
    deleteList,
    getList,
    getLists,
    removeItemFromList,
    updateList
} from './listService';

vi.mock('./api', () => ({
    apiFetch: vi.fn()
}));

describe('listService', () => {
    const mockedApiFetch = vi.mocked(apiFetch);

    beforeEach(() => {
        mockedApiFetch.mockReset();
    });

    it('retrieves all lists for the current user', async () => {
        mockedApiFetch.mockResolvedValue({ lists: [] } as never);

        await getLists();

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/lists');
    });

    it('retrieves a single list', async () => {
        mockedApiFetch.mockResolvedValue({ list: { id: 'list-1' } } as never);

        await getList('list-1');

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/lists/list-1');
    });

    it('creates a list', async () => {
        mockedApiFetch.mockResolvedValue({ list: { id: 'list-1' } } as never);

        await createList({ name: 'Dorm Room', description: 'Incoming semester essentials' });

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/lists', {
            method: 'POST',
            body: JSON.stringify({ name: 'Dorm Room', description: 'Incoming semester essentials' }),
            expectedStatus: 201
        });
    });

    it('updates a list', async () => {
        mockedApiFetch.mockResolvedValue({ list: { id: 'list-1' } } as never);

        await updateList('list-1', { name: 'Apartment Setup', description: 'Bigger space now' });

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/lists/list-1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Apartment Setup', description: 'Bigger space now' })
        });
    });

    it('deletes a list', async () => {
        mockedApiFetch.mockResolvedValue(undefined as never);

        await deleteList('list-1');

        expect(mockedApiFetch).toHaveBeenCalledWith('/api/lists/list-1', {
            method: 'DELETE',
            expectedStatus: 204
        });
    });

    it('adds and removes items from a list', async () => {
        mockedApiFetch.mockResolvedValue({ list: { id: 'list-1' } } as never);

        await addItemToList('list-1', 'listing-1');
        await removeItemFromList('list-1', 'listing-1');

        expect(mockedApiFetch).toHaveBeenNthCalledWith(1, '/api/lists/list-1/items', {
            method: 'POST',
            body: JSON.stringify({ listingId: 'listing-1' })
        });
        expect(mockedApiFetch).toHaveBeenNthCalledWith(2, '/api/lists/list-1/items/listing-1', {
            method: 'DELETE'
        });
    });
});