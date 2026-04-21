import { z } from 'zod';
import {
    findOrCreateConversation,
    findConversationById,
    findConversationsByUserId,
    findMessagesByConversationId,
    createMessage,
    type ConversationRecord,
    type ConversationSummaryRecord,
    type MessageWithSenderRecord
} from '../db/queries/conversationQueries';
import { findListingById } from '../db/queries/listingQueries';
import { HttpError } from '../utils/httpError';

type MessageResponse = {
    id: string;
    conversationId: string;
    senderId: string;
    senderEmail: string;
    senderInitial: string;
    content: string;
    createdAt: string;
};

type ConversationResponse = {
    id: string;
    listingId: string | null;
    listingName: string;
    listingImageUrl: string | null;
    listingPrice: number;
    buyerId: string;
    sellerId: string;
    createdAt: string;
    updatedAt: string;
    messages: MessageResponse[];
};

type ConversationSummaryResponse = {
    id: string;
    listingId: string | null;
    listingName: string;
    listingImageUrl: string | null;
    listingPrice: number;
    otherPartyEmail: string;
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
    updatedAt: string;
};

const createConversationSchema = z.object({
    listingId: z.string().uuid()
});

const sendMessageSchema = z.object({
    content: z.string().trim().min(1).max(2000)
});

function toMessageResponse(record: MessageWithSenderRecord): MessageResponse {
    return {
        id: record.id,
        conversationId: record.conversation_id,
        senderId: record.sender_id,
        senderEmail: record.sender_email,
        senderInitial: record.sender_email.charAt(0).toUpperCase(),
        content: record.content,
        createdAt: record.created_at
    };
}

function toConversationResponse(
    conv: ConversationRecord,
    listingName: string,
    listingImageUrl: string | null,
    listingPriceCents: number,
    messages: MessageWithSenderRecord[]
): ConversationResponse {
    return {
        id: conv.id,
        listingId: conv.listing_id,
        listingName,
        listingImageUrl,
        listingPrice: listingPriceCents / 100,
        buyerId: conv.buyer_id,
        sellerId: conv.seller_id,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        messages: messages.map(toMessageResponse)
    };
}

function toConversationSummaryResponse(record: ConversationSummaryRecord): ConversationSummaryResponse {
    return {
        id: record.id,
        listingId: record.listing_id,
        listingName: record.listing_name ?? 'Deleted listing',
        listingImageUrl: record.listing_image_url,
        listingPrice: (record.listing_price_cents ?? 0) / 100,
        otherPartyEmail: record.other_party_email,
        lastMessagePreview: record.last_message_content
            ? record.last_message_content.slice(0, 80)
            : null,
        lastMessageAt: record.last_message_at,
        updatedAt: record.updated_at
    };
}

export async function getOrCreateConversation(
    buyerId: string,
    input: unknown
): Promise<ConversationResponse> {
    const parsed = createConversationSchema.parse(input);
    const listing = await findListingById(parsed.listingId);

    if (!listing) {
        throw new HttpError('Listing not found.', 404);
    }

    if (listing.user_id === buyerId) {
        throw new HttpError('You cannot message your own listing.', 400);
    }

    const conversation = await findOrCreateConversation(parsed.listingId, buyerId, listing.user_id);
    const messages = await findMessagesByConversationId(conversation.id);

    return toConversationResponse(
        conversation,
        listing.name,
        listing.image_url,
        listing.price_cents,
        messages
    );
}

export async function getConversationForUser(
    userId: string,
    conversationId: string
): Promise<ConversationResponse> {
    const conversation = await findConversationById(conversationId);

    if (!conversation) {
        throw new HttpError('Conversation not found.', 404);
    }

    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        throw new HttpError('Forbidden.', 403);
    }

    const listing = conversation.listing_id
        ? await findListingById(conversation.listing_id)
        : null;
    const messages = await findMessagesByConversationId(conversationId);

    return toConversationResponse(
        conversation,
        listing?.name ?? 'Deleted listing',
        listing?.image_url ?? null,
        listing?.price_cents ?? 0,
        messages
    );
}

export async function listConversationsForUser(userId: string): Promise<ConversationSummaryResponse[]> {
    const summaries = await findConversationsByUserId(userId);
    return summaries.map(toConversationSummaryResponse);
}

export async function sendMessageToConversation(
    userId: string,
    conversationId: string,
    input: unknown
): Promise<MessageResponse> {
    const parsed = sendMessageSchema.parse(input);
    const conversation = await findConversationById(conversationId);

    if (!conversation) {
        throw new HttpError('Conversation not found.', 404);
    }

    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        throw new HttpError('Forbidden.', 403);
    }

    const message = await createMessage(conversationId, userId, parsed.content);
    return toMessageResponse(message);
}
