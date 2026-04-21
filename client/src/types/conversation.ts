export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    senderEmail: string;
    senderInitial: string;
    content: string;
    createdAt: string;
};

export type Conversation = {
    id: string;
    listingId: string | null;
    listingName: string;
    listingImageUrl: string | null;
    listingPrice: number;
    buyerId: string;
    sellerId: string;
    createdAt: string;
    updatedAt: string;
    messages: Message[];
};

export type ConversationSummary = {
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
