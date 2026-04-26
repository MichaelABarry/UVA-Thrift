export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    senderEmail: string;
    senderName: string | null;
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
    isClosed: boolean;
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
    isClosed: boolean;
    otherPartyEmail: string;
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
    updatedAt: string;
};
