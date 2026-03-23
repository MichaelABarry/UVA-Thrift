import { z } from 'zod';
import {
    addListingToList,
    createList,
    deleteListById,
    findListByIdForUser,
    findListItemsByListIdForUser,
    findListItemsByUserId,
    findListsByUserId,
    removeListingFromList,
    type ListItemRecord,
    type ListRecord,
    updateListById
} from '../db/queries/listQueries';
import { findListingById, type ListingRecord } from '../db/queries/listingQueries';
import { HttpError } from '../utils/httpError';

const listSchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default('')
});

const listItemSchema = z.object({
    listingId: z.string().trim().min(1)
});

function toListingResponse(listing: ListingRecord | ListItemRecord) {
    return {
        id: listing.id,
        userId: listing.user_id,
        name: listing.name,
        description: listing.description,
        price: listing.price_cents / 100,
        categories: listing.categories,
        imageUrl: listing.image_url,
        createdAt: listing.created_at
    };
}

function toListResponse(list: ListRecord, items: Array<ListItemRecord | ListingRecord>) {
    return {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
        items: items.map(toListingResponse)
    };
}

function groupLists(listRecords: ListRecord[], itemRecords: ListItemRecord[]) {
    const grouped = new Map(
        listRecords.map((list) => [
            list.id,
            {
                ...toListResponse(list, []),
                items: [] as ReturnType<typeof toListingResponse>[]
            }
        ])
    );

    itemRecords.forEach((item) => {
        const list = grouped.get(item.list_id);

        if (!list) {
            return;
        }

        list.items.push(toListingResponse(item));
    });

    return listRecords.map((list) => grouped.get(list.id) ?? toListResponse(list, []));
}

export async function createListForUser(userId: string, input: unknown) {
    const parsed = listSchema.parse(input);
    const list = await createList({
        userId,
        name: parsed.name,
        description: parsed.description
    });

    return toListResponse(list, []);
}

export async function getListsForUser(userId: string) {
    const [lists, items] = await Promise.all([
        findListsByUserId(userId),
        findListItemsByUserId(userId)
    ]);

    return groupLists(lists, items);
}

export async function getListForUser(userId: string, listId: string) {
    const list = await findListByIdForUser(listId, userId);

    if (!list) {
        throw new HttpError('List not found.', 404);
    }

    const items = await findListItemsByListIdForUser(listId, userId);
    return toListResponse(list, items);
}

export async function updateListForUser(userId: string, listId: string, input: unknown) {
    const parsed = listSchema.parse(input);
    const list = await updateListById({
        listId,
        userId,
        name: parsed.name,
        description: parsed.description
    });

    if (!list) {
        throw new HttpError('List not found.', 404);
    }

    const items = await findListItemsByListIdForUser(listId, userId);
    return toListResponse(list, items);
}

export async function deleteListForUser(userId: string, listId: string) {
    const list = await deleteListById(listId, userId);

    if (!list) {
        throw new HttpError('List not found.', 404);
    }
}

export async function addItemToListForUser(userId: string, listId: string, input: unknown) {
    const parsed = listItemSchema.parse(input);
    const [list, listing] = await Promise.all([
        findListByIdForUser(listId, userId),
        findListingById(parsed.listingId)
    ]);

    if (!list) {
        throw new HttpError('List not found.', 404);
    }

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    await addListingToList({
        listId,
        userId,
        listingId: parsed.listingId
    });

    return getListForUser(userId, listId);
}

export async function removeItemFromListForUser(userId: string, listId: string, listingId: string) {
    const list = await findListByIdForUser(listId, userId);

    if (!list) {
        throw new HttpError('List not found.', 404);
    }

    const removed = await removeListingFromList({
        listId,
        userId,
        listingId
    });

    if (!removed) {
        throw new HttpError('Item not found in list.', 404);
    }

    return getListForUser(userId, listId);
}