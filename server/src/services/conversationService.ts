import { z } from 'zod';
import {
    findOrCreateConversation,
    findConversationById,
    findConversationsByUserId,
    findMessagesByConversationId,
    countMessagesFromSender,
    createMessage,
    type ConversationRecord,
    type ConversationSummaryRecord,
    type MessageWithSenderRecord
} from '../db/queries/conversationQueries';
import { findListingById, findListingByIdIncludingDeleted } from '../db/queries/listingQueries';
import { findUserById } from '../db/queries/userQueries';
import { HttpError } from '../utils/httpError';
import { sendNewMessageNotificationEmail } from './emailService';

type MessageResponse = {
    id: string;
    conversationId: string;
    senderId: string;
    senderEmail: string;
    senderName: string | null;
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
    isClosed: boolean;
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
    isClosed: boolean;
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
    const senderName = record.sender_display_name ?? null;
    const displayForInitial = senderName ?? record.sender_email;
    return {
        id: record.id,
        conversationId: record.conversation_id,
        senderId: record.sender_id,
        senderEmail: record.sender_email,
        senderName,
        senderInitial: displayForInitial.charAt(0).toUpperCase(),
        content: record.content,
        createdAt: record.created_at
    };
}

function toConversationResponse(
    conv: ConversationRecord,
    listingName: string,
    listingImageUrl: string | null,
    listingPriceCents: number,
    isClosed: boolean,
    messages: MessageWithSenderRecord[]
): ConversationResponse {
    return {
        id: conv.id,
        listingId: conv.listing_id,
        listingName,
        listingImageUrl,
        listingPrice: listingPriceCents / 100,
        isClosed,
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
        isClosed: !record.listing_id || Boolean(record.listing_deleted_at) || !record.listing_name,
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
        false,
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
        ? await findListingByIdIncludingDeleted(conversation.listing_id)
        : null;
    const messages = await findMessagesByConversationId(conversationId);
    const isClosed = !conversation.listing_id || !listing || Boolean(listing.deleted_at);

    return toConversationResponse(
        conversation,
        listing?.name ?? 'Deleted listing',
        listing?.image_url ?? null,
        listing?.price_cents ?? 0,
        isClosed,
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

    const listing = conversation.listing_id
        ? await findListingByIdIncludingDeleted(conversation.listing_id)
        : null;

    if (!conversation.listing_id || !listing || listing.deleted_at) {
        throw new HttpError('This listing has been removed. This conversation is closed.', 409);
    }

    const senderMessageCount = await countMessagesFromSender(conversationId, userId);
    const message = await createMessage(conversationId, userId, parsed.content);

    if (senderMessageCount === 0) {
        const recipientId = userId === conversation.buyer_id
            ? conversation.seller_id
            : conversation.buyer_id;
        const recipient = await findUserById(recipientId);
        if (recipient) {
            const senderName = message.sender_display_name ?? message.sender_email;
            void sendNewMessageNotificationEmail(
                recipient.email,
                senderName,
                listing.name,
                conversationId
            );
        }
    }

    return toMessageResponse(message);
}
