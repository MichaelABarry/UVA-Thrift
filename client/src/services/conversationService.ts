import { apiFetch } from './api';
import type { Conversation, ConversationSummary, Message } from '../types/conversation';

export function createOrGetConversation(listingId: string) {
    return apiFetch<{ conversation: Conversation }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ listingId })
    });
}

export function getConversations() {
    return apiFetch<{ conversations: ConversationSummary[] }>('/api/conversations');
}

export function getConversation(conversationId: string) {
    return apiFetch<{ conversation: Conversation }>(`/api/conversations/${conversationId}`);
}

export function sendMessage(conversationId: string, content: string) {
    return apiFetch<{ message: Message }>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
        expectedStatus: 201
    });
}
