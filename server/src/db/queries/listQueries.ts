import { pool } from '../pool';

export type ListRecord = {
    id: string;
    user_id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
};

export type ListItemRecord = {
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
};

export async function createList(input: {
    userId: string;
    name: string;
    description: string;
}) {
    const result = await pool.query<ListRecord>(
        `INSERT INTO lists (user_id, name, description)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [input.userId, input.name, input.description]
    );

    return result.rows[0];
}

export async function findListsByUserId(userId: string) {
    const result = await pool.query<ListRecord>(
        `SELECT * FROM lists
        WHERE user_id = $1
        ORDER BY updated_at DESC, created_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function findListByIdForUser(listId: string, userId: string) {
    const result = await pool.query<ListRecord>(
        `SELECT * FROM lists
        WHERE id = $1 AND user_id = $2`,
        [listId, userId]
    );

    return result.rows[0] ?? null;
}

export async function updateListById(input: {
    listId: string;
    userId: string;
    name: string;
    description: string;
}) {
    const result = await pool.query<ListRecord>(
        `UPDATE lists
        SET name = $3,
            description = $4,
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
        [input.listId, input.userId, input.name, input.description]
    );

    return result.rows[0] ?? null;
}

export async function deleteListById(listId: string, userId: string) {
    const result = await pool.query<ListRecord>(
        `DELETE FROM lists
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
        [listId, userId]
    );

    return result.rows[0] ?? null;
}

export async function findListItemsByUserId(userId: string) {
    const result = await pool.query<ListItemRecord>(
        `SELECT li.list_id,
                ls.id,
                ls.user_id,
                ls.name,
                ls.description,
                ls.price_cents,
                ls.categories,
                ls.image_url,
                ls.image_key,
                ls.created_at,
                ls.updated_at
        FROM lists l
        JOIN list_items li ON li.list_id = l.id
        JOIN listings ls ON ls.id = li.listing_id
        WHERE l.user_id = $1
        ORDER BY li.created_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function findListItemsByListIdForUser(listId: string, userId: string) {
    const result = await pool.query<ListItemRecord>(
        `SELECT li.list_id,
                ls.id,
                ls.user_id,
                ls.name,
                ls.description,
                ls.price_cents,
                ls.categories,
                ls.image_url,
                ls.image_key,
                ls.created_at,
                ls.updated_at
        FROM lists l
        JOIN list_items li ON li.list_id = l.id
        JOIN listings ls ON ls.id = li.listing_id
        WHERE l.id = $1 AND l.user_id = $2
        ORDER BY li.created_at DESC`,
        [listId, userId]
    );

    return result.rows;
}

export async function addListingToList(input: {
    listId: string;
    userId: string;
    listingId: string;
}) {
    await pool.query(
        `WITH inserted AS (
            INSERT INTO list_items (list_id, listing_id)
            SELECT l.id, $3
            FROM lists l
            WHERE l.id = $1 AND l.user_id = $2
            ON CONFLICT (list_id, listing_id) DO NOTHING
            RETURNING list_id
        )
        UPDATE lists
        SET updated_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND EXISTS (SELECT 1 FROM inserted)`,
        [input.listId, input.userId, input.listingId]
    );
}

export async function removeListingFromList(input: {
    listId: string;
    userId: string;
    listingId: string;
}) {
    const result = await pool.query<{ list_id: string }>(
        `WITH deleted AS (
            DELETE FROM list_items li
            USING lists l
            WHERE li.list_id = l.id
              AND l.id = $1
              AND l.user_id = $2
              AND li.listing_id = $3
            RETURNING li.list_id
        )
        UPDATE lists
        SET updated_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND EXISTS (SELECT 1 FROM deleted)
        RETURNING id AS list_id`,
        [input.listId, input.userId, input.listingId]
    );

    return (result.rowCount ?? 0) > 0;
}