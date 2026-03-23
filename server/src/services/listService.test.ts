import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    addItemToListForUser,
    createListForUser,
    deleteListForUser,
    getListForUser,
    getListsForUser,
    removeItemFromListForUser,
    updateListForUser
} from './listService';
import {
    addListingToList,
    createList,
    deleteListById,
    findListByIdForUser,
    findListItemsByListIdForUser,
    findListItemsByUserId,
    findListsByUserId,
    removeListingFromList,
    updateListById
} from '../db/queries/listQueries';
import { findListingById } from '../db/queries/listingQueries';

vi.mock('../db/queries/listQueries', () => ({
    addListingToList: vi.fn(),
    createList: vi.fn(),
    deleteListById: vi.fn(),
    findListByIdForUser: vi.fn(),
    findListItemsByListIdForUser: vi.fn(),
    findListItemsByUserId: vi.fn(),
    findListsByUserId: vi.fn(),
    removeListingFromList: vi.fn(),
    updateListById: vi.fn()
}));

vi.mock('../db/queries/listingQueries', () => ({
    findListingById: vi.fn()
}));

function makeListRecord(overrides: Partial<{
    id: string;
    user_id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}> = {}) {
    return {
        id: 'list-1',
        user_id: 'user-1',
        name: 'Dorm Room',
        description: 'Incoming semester essentials',
        created_at: '2026-03-20T12:00:00.000Z',
        updated_at: '2026-03-20T12:00:00.000Z',
        ...overrides
    };
}

function makeListItemRecord(overrides: Partial<{
    list_id: string;
    id: string;
    user_id: string;
    name: string;
    description: string;
    price_cents: number;
    categories: string[];
    image_url: string | null;
    image_key: string | null;
    created_at: string;
    updated_at: string;
}> = {}) {
    return {
        list_id: 'list-1',
        id: 'listing-1',
        user_id: 'seller-1',
        name: 'Desk Lamp',
        description: 'Fits on a dorm desk',
        price_cents: 1500,
        categories: ['electronics'],
        image_url: null,
        image_key: null,
        created_at: '2026-03-18T09:00:00.000Z',
        updated_at: '2026-03-18T09:00:00.000Z',
        ...overrides
    };
}

describe('listService', () => {
    const mockedAddListingToList = vi.mocked(addListingToList);
    const mockedCreateList = vi.mocked(createList);
    const mockedDeleteListById = vi.mocked(deleteListById);
    const mockedFindListByIdForUser = vi.mocked(findListByIdForUser);
    const mockedFindListItemsByListIdForUser = vi.mocked(findListItemsByListIdForUser);
    const mockedFindListItemsByUserId = vi.mocked(findListItemsByUserId);
    const mockedFindListsByUserId = vi.mocked(findListsByUserId);
    const mockedFindListingById = vi.mocked(findListingById);
    const mockedRemoveListingFromList = vi.mocked(removeListingFromList);
    const mockedUpdateListById = vi.mocked(updateListById);

    beforeEach(() => {
        mockedAddListingToList.mockReset();
        mockedCreateList.mockReset();
        mockedDeleteListById.mockReset();
        mockedFindListByIdForUser.mockReset();
        mockedFindListItemsByListIdForUser.mockReset();
        mockedFindListItemsByUserId.mockReset();
        mockedFindListsByUserId.mockReset();
        mockedFindListingById.mockReset();
        mockedRemoveListingFromList.mockReset();
        mockedUpdateListById.mockReset();
    });

    it('creates a list for the current user', async () => {
        mockedCreateList.mockResolvedValue(makeListRecord());

        await expect(
            createListForUser('user-1', { name: 'Dorm Room', description: 'Incoming semester essentials' })
        ).resolves.toEqual({
            id: 'list-1',
            userId: 'user-1',
            name: 'Dorm Room',
            description: 'Incoming semester essentials',
            createdAt: '2026-03-20T12:00:00.000Z',
            updatedAt: '2026-03-20T12:00:00.000Z',
            items: []
        });
    });

    it('groups list items under each list for the current user', async () => {
        mockedFindListsByUserId.mockResolvedValue([
            makeListRecord(),
            makeListRecord({ id: 'list-2', name: 'Kitchen', description: 'Shared apartment gear' })
        ]);
        mockedFindListItemsByUserId.mockResolvedValue([
            makeListItemRecord(),
            makeListItemRecord({ list_id: 'list-2', id: 'listing-2', name: 'Microwave', price_cents: 3500 })
        ]);

        await expect(getListsForUser('user-1')).resolves.toEqual([
            {
                id: 'list-1',
                userId: 'user-1',
                name: 'Dorm Room',
                description: 'Incoming semester essentials',
                createdAt: '2026-03-20T12:00:00.000Z',
                updatedAt: '2026-03-20T12:00:00.000Z',
                items: [
                    {
                        id: 'listing-1',
                        userId: 'seller-1',
                        name: 'Desk Lamp',
                        description: 'Fits on a dorm desk',
                        price: 15,
                        categories: ['electronics'],
                        imageUrl: null,
                        createdAt: '2026-03-18T09:00:00.000Z'
                    }
                ]
            },
            {
                id: 'list-2',
                userId: 'user-1',
                name: 'Kitchen',
                description: 'Shared apartment gear',
                createdAt: '2026-03-20T12:00:00.000Z',
                updatedAt: '2026-03-20T12:00:00.000Z',
                items: [
                    {
                        id: 'listing-2',
                        userId: 'seller-1',
                        name: 'Microwave',
                        description: 'Fits on a dorm desk',
                        price: 35,
                        categories: ['electronics'],
                        imageUrl: null,
                        createdAt: '2026-03-18T09:00:00.000Z'
                    }
                ]
            }
        ]);
    });

    it('retrieves a single list for the current user', async () => {
        mockedFindListByIdForUser.mockResolvedValue(makeListRecord());
        mockedFindListItemsByListIdForUser.mockResolvedValue([makeListItemRecord()]);

        await expect(getListForUser('user-1', 'list-1')).resolves.toMatchObject({
            id: 'list-1',
            userId: 'user-1',
            items: [{ id: 'listing-1' }]
        });
    });

    it('updates a list for the current user', async () => {
        mockedUpdateListById.mockResolvedValue(makeListRecord({ name: 'Apartment Setup', description: 'Bigger space now' }));
        mockedFindListItemsByListIdForUser.mockResolvedValue([makeListItemRecord()]);

        await expect(
            updateListForUser('user-1', 'list-1', { name: 'Apartment Setup', description: 'Bigger space now' })
        ).resolves.toMatchObject({
            id: 'list-1',
            name: 'Apartment Setup',
            description: 'Bigger space now'
        });
    });

    it('adds a listing to a list and returns the updated list', async () => {
        mockedFindListByIdForUser.mockResolvedValue(makeListRecord());
        mockedFindListingById.mockResolvedValue(makeListItemRecord() as never);
        mockedAddListingToList.mockResolvedValue(undefined);
        mockedFindListItemsByListIdForUser.mockResolvedValue([makeListItemRecord()]);

        await expect(addItemToListForUser('user-1', 'list-1', { listingId: 'listing-1' })).resolves.toMatchObject({
            id: 'list-1',
            items: [{ id: 'listing-1' }]
        });

        expect(mockedAddListingToList).toHaveBeenCalledWith({
            listId: 'list-1',
            userId: 'user-1',
            listingId: 'listing-1'
        });
    });

    it('removes a listing from a list and throws when the item is not present', async () => {
        mockedFindListByIdForUser.mockResolvedValue(makeListRecord());
        mockedRemoveListingFromList.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        mockedFindListItemsByListIdForUser.mockResolvedValue([]);

        await expect(removeItemFromListForUser('user-1', 'list-1', 'listing-1')).resolves.toMatchObject({
            id: 'list-1',
            items: []
        });

        await expect(removeItemFromListForUser('user-1', 'list-1', 'missing')).rejects.toMatchObject({
            message: 'Item not found in list.',
            statusCode: 404
        });
    });

    it('deletes a list for the current user', async () => {
        mockedDeleteListById.mockResolvedValue(makeListRecord());

        await expect(deleteListForUser('user-1', 'list-1')).resolves.toBeUndefined();
        expect(mockedDeleteListById).toHaveBeenCalledWith('list-1', 'user-1');
    });
});