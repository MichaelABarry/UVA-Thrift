import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    addListItem,
    createList,
    deleteList,
    getList,
    listLists,
    removeListItem,
    updateList
} from './listController';
import {
    addItemToListForUser,
    createListForUser,
    deleteListForUser,
    getListForUser,
    getListsForUser,
    removeItemFromListForUser,
    updateListForUser
} from '../services/listService';

vi.mock('../services/listService', () => ({
    addItemToListForUser: vi.fn(),
    createListForUser: vi.fn(),
    deleteListForUser: vi.fn(),
    getListForUser: vi.fn(),
    getListsForUser: vi.fn(),
    removeItemFromListForUser: vi.fn(),
    updateListForUser: vi.fn()
}));

function createResponse() {
    const response = {
        status: vi.fn(),
        json: vi.fn(),
        send: vi.fn()
    };

    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);
    response.send.mockReturnValue(response);

    return response as unknown as Response;
}

describe('listController', () => {
    const mockedAddItemToListForUser = vi.mocked(addItemToListForUser);
    const mockedCreateListForUser = vi.mocked(createListForUser);
    const mockedDeleteListForUser = vi.mocked(deleteListForUser);
    const mockedGetListForUser = vi.mocked(getListForUser);
    const mockedGetListsForUser = vi.mocked(getListsForUser);
    const mockedRemoveItemFromListForUser = vi.mocked(removeItemFromListForUser);
    const mockedUpdateListForUser = vi.mocked(updateListForUser);

    beforeEach(() => {
        mockedAddItemToListForUser.mockReset();
        mockedCreateListForUser.mockReset();
        mockedDeleteListForUser.mockReset();
        mockedGetListForUser.mockReset();
        mockedGetListsForUser.mockReset();
        mockedRemoveItemFromListForUser.mockReset();
        mockedUpdateListForUser.mockReset();
    });

    it('creates a list for the authenticated user', async () => {
        const response = createResponse();
        const list = { id: 'list-1' };

        mockedCreateListForUser.mockResolvedValue(list as never);

        await createList({ user: { id: 'user-1' }, body: { name: 'Dorm Room' } } as Request, response);

        expect(mockedCreateListForUser).toHaveBeenCalledWith('user-1', { name: 'Dorm Room' });
        expect(response.status).toHaveBeenCalledWith(201);
        expect(response.json).toHaveBeenCalledWith({ list });
    });

    it('lists the authenticated users lists', async () => {
        const response = createResponse();
        const lists = [{ id: 'list-1' }];

        mockedGetListsForUser.mockResolvedValue(lists as never);

        await listLists({ user: { id: 'user-1' } } as Request, response);

        expect(mockedGetListsForUser).toHaveBeenCalledWith('user-1');
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({ lists });
    });

    it('retrieves and updates a single list', async () => {
        const response = createResponse();
        const list = { id: 'list-1' };

        mockedGetListForUser.mockResolvedValue(list as never);
        mockedUpdateListForUser.mockResolvedValue(list as never);

        await getList({ user: { id: 'user-1' }, params: { listId: 'list-1' } } as unknown as Request, response);
        await updateList(
            { user: { id: 'user-1' }, params: { listId: 'list-1' }, body: { name: 'Dorm Room' } } as unknown as Request,
            response
        );

        expect(mockedGetListForUser).toHaveBeenCalledWith('user-1', 'list-1');
        expect(mockedUpdateListForUser).toHaveBeenCalledWith('user-1', 'list-1', { name: 'Dorm Room' });
    });

    it('adds and removes list items', async () => {
        const response = createResponse();
        const list = { id: 'list-1' };

        mockedAddItemToListForUser.mockResolvedValue(list as never);
        mockedRemoveItemFromListForUser.mockResolvedValue(list as never);

        await addListItem(
            { user: { id: 'user-1' }, params: { listId: 'list-1' }, body: { listingId: 'listing-1' } } as unknown as Request,
            response
        );
        await removeListItem(
            { user: { id: 'user-1' }, params: { listId: 'list-1', listingId: 'listing-1' } } as unknown as Request,
            response
        );

        expect(mockedAddItemToListForUser).toHaveBeenCalledWith('user-1', 'list-1', { listingId: 'listing-1' });
        expect(mockedRemoveItemFromListForUser).toHaveBeenCalledWith('user-1', 'list-1', 'listing-1');
    });

    it('deletes a list', async () => {
        const response = createResponse();

        mockedDeleteListForUser.mockResolvedValue(undefined);

        await deleteList({ user: { id: 'user-1' }, params: { listId: 'list-1' } } as unknown as Request, response);

        expect(mockedDeleteListForUser).toHaveBeenCalledWith('user-1', 'list-1');
        expect(response.status).toHaveBeenCalledWith(204);
        expect(response.send).toHaveBeenCalled();
    });
});