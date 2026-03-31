import { pool } from '../pool';

export type ConversationRecord = {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    created_at: string;
    updated_at: string;
};

export type MessageRecord = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
};

export type MessageWithSenderRecord = MessageRecord & {
    sender_email: string;
};

export type ConversationSummaryRecord = ConversationRecord & {
    listing_name: string;
    listing_image_url: string | null;
    listing_price_cents: number;
    other_party_email: string;
    last_message_content: string | null;
    last_message_at: string | null;
};

export async function findOrCreateConversation(
    listingId: string,
    buyerId: string,
    sellerId: string
): Promise<ConversationRecord> {
    const result = await pool.query<ConversationRecord>(
        `INSERT INTO conversations (listing_id, buyer_id, seller_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (listing_id, buyer_id) DO UPDATE SET updated_at = NOW()
        RETURNING *`,
        [listingId, buyerId, sellerId]
    );

    return result.rows[0];
}

export async function findConversationById(conversationId: string) {
    const result = await pool.query<ConversationRecord>(
        `SELECT * FROM conversations WHERE id = $1`,
        [conversationId]
    );

    return result.rows[0] ?? null;
}

export async function findConversationsByUserId(userId: string) {
    const result = await pool.query<ConversationSummaryRecord>(
        `SELECT
            c.*,
            l.name        AS listing_name,
            l.image_url   AS listing_image_url,
            l.price_cents AS listing_price_cents,
            CASE
                WHEN c.buyer_id = $1 THEN u_seller.email
                ELSE u_buyer.email
            END AS other_party_email,
            m.content     AS last_message_content,
            m.created_at  AS last_message_at
        FROM conversations c
        JOIN listings l        ON l.id = c.listing_id
        JOIN users u_buyer     ON u_buyer.id  = c.buyer_id
        JOIN users u_seller    ON u_seller.id = c.seller_id
        LEFT JOIN LATERAL (
            SELECT content, created_at
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC
            LIMIT 1
        ) m ON TRUE
        WHERE c.buyer_id = $1 OR c.seller_id = $1
        ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
        [userId]
    );

    return result.rows;
}

export async function findMessagesByConversationId(conversationId: string) {
    const result = await pool.query<MessageWithSenderRecord>(
        `SELECT ms.*, u.email AS sender_email
        FROM messages ms
        JOIN users u ON u.id = ms.sender_id
        WHERE ms.conversation_id = $1
        ORDER BY ms.created_at ASC`,
        [conversationId]
    );

    return result.rows;
}

export async function createMessage(
    conversationId: string,
    senderId: string,
    content: string
): Promise<MessageWithSenderRecord> {
    const result = await pool.query<MessageWithSenderRecord>(
        `WITH inserted AS (
            INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING *
        ),
        _update AS (
            UPDATE conversations SET updated_at = NOW() WHERE id = $1
        )
        SELECT i.*, u.email AS sender_email
        FROM inserted i
        JOIN users u ON u.id = i.sender_id`,
        [conversationId, senderId, content]
    );

    return result.rows[0];
}
