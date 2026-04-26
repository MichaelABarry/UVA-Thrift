import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getConversationForUser,
    listConversationsForUser,
    sendMessageToConversation
} from './conversationService';
import {
    createMessage,
    findConversationById,
    findConversationsByUserId,
    findMessagesByConversationId
} from '../db/queries/conversationQueries';
import { findListingByIdIncludingDeleted } from '../db/queries/listingQueries';

vi.mock('../db/queries/conversationQueries', () => ({
    createMessage: vi.fn(),
    findConversationById: vi.fn(),
    findConversationsByUserId: vi.fn(),
    findMessagesByConversationId: vi.fn(),
    findOrCreateConversation: vi.fn()
}));

vi.mock('../db/queries/listingQueries', () => ({
    findListingById: vi.fn(),
    findListingByIdIncludingDeleted: vi.fn()
}));

function makeConversationRecord(overrides: Partial<{
    id: string;
    listing_id: string | null;
    buyer_id: string;
    seller_id: string;
    created_at: string;
    updated_at: string;
}> = {}) {
    return {
        id: 'conversation-1',
        listing_id: 'listing-1',
        buyer_id: 'user-1',
        seller_id: 'seller-1',
        created_at: '2026-04-01T12:00:00.000Z',
        updated_at: '2026-04-01T12:30:00.000Z',
        ...overrides
    };
}

function makeListingRecord(overrides: Partial<{
    id: string;
    user_id: string;
    name: string;
    description: string;
    price_cents: number;
    categories: string[];
    condition: string;
    image_url: string | null;
    image_key: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
	expires_at: string;
}> = {}) {
    return {
        id: 'listing-1',
        user_id: 'seller-1',
        name: 'Desk Lamp',
        description: 'Dorm ready lamp',
        price_cents: 1899,
        categories: ['electronics'],
        condition: 'good',
        image_url: 'https://bucket.s3.amazonaws.com/listings/lamp.png',
        image_key: 'listings/lamp.png',
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
        deleted_at: null,
		expires_at: '2026-06-15T12:00:00.000Z',
        ...overrides
    };
}

describe('conversationService', () => {
    const mockedCreateMessage = vi.mocked(createMessage);
    const mockedFindConversationById = vi.mocked(findConversationById);
    const mockedFindConversationsByUserId = vi.mocked(findConversationsByUserId);
    const mockedFindListingByIdIncludingDeleted = vi.mocked(findListingByIdIncludingDeleted);
    const mockedFindMessagesByConversationId = vi.mocked(findMessagesByConversationId);

    beforeEach(() => {
        mockedCreateMessage.mockReset();
        mockedFindConversationById.mockReset();
        mockedFindConversationsByUserId.mockReset();
        mockedFindListingByIdIncludingDeleted.mockReset();
        mockedFindMessagesByConversationId.mockReset();
    });

    it('marks a conversation as closed while preserving deleted listing details', async () => {
        mockedFindConversationById.mockResolvedValueOnce(makeConversationRecord());
        mockedFindListingByIdIncludingDeleted.mockResolvedValueOnce(
            makeListingRecord({ deleted_at: '2026-04-10T09:00:00.000Z' })
        );
        mockedFindMessagesByConversationId.mockResolvedValueOnce([]);

        await expect(getConversationForUser('user-1', 'conversation-1')).resolves.toMatchObject({
            id: 'conversation-1',
            listingId: 'listing-1',
            listingName: 'Desk Lamp',
            listingPrice: 18.99,
            isClosed: true,
            messages: []
        });
    });

    it('marks a conversation summary as closed for a soft-deleted listing', async () => {
        mockedFindConversationsByUserId.mockResolvedValueOnce([
            {
                ...makeConversationRecord(),
                listing_name: 'Desk Lamp',
                listing_image_url: 'https://bucket.s3.amazonaws.com/listings/lamp.png',
                listing_price_cents: 1899,
                listing_deleted_at: '2026-04-10T09:00:00.000Z',
                other_party_email: 'seller@example.com',
                last_message_content: 'Still available?',
                last_message_at: '2026-04-01T12:15:00.000Z'
            }
        ]);

        await expect(listConversationsForUser('user-1')).resolves.toEqual([
            {
                id: 'conversation-1',
                listingId: 'listing-1',
                listingName: 'Desk Lamp',
                listingImageUrl: 'https://bucket.s3.amazonaws.com/listings/lamp.png',
                listingPrice: 18.99,
                isClosed: true,
                otherPartyEmail: 'seller@example.com',
                lastMessagePreview: 'Still available?',
                lastMessageAt: '2026-04-01T12:15:00.000Z',
                updatedAt: '2026-04-01T12:30:00.000Z'
            }
        ]);
    });

    it('rejects sending a message after the listing has been removed', async () => {
        mockedFindConversationById.mockResolvedValueOnce(makeConversationRecord());
        mockedFindListingByIdIncludingDeleted.mockResolvedValueOnce(
            makeListingRecord({ deleted_at: '2026-04-10T09:00:00.000Z' })
        );

        await expect(
            sendMessageToConversation('user-1', 'conversation-1', { content: 'Is pickup today?' })
        ).rejects.toMatchObject({
            message: 'This listing has been removed. This conversation is closed.',
            statusCode: 409
        });

        expect(mockedCreateMessage).not.toHaveBeenCalled();
    });
});