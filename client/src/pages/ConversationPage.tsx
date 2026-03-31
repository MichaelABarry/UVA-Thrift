import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getConversation, sendMessage } from '../services/conversationService';
import type { Conversation, Message } from '../types/conversation';

const POLL_INTERVAL_MS = 5000;

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

export function ConversationPage() {
    const { user, loading } = useAuth();
    const { conversationId } = useParams();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingConversation, setLoadingConversation] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sharePhone, setSharePhone] = useState(false);
    const [shareVenmo, setShareVenmo] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        async function load() {
            if (!conversationId || !user?.isEmailVerified) {
                setLoadingConversation(false);
                return;
            }

            setLoadingConversation(true);
            setError(null);

            try {
                const response = await getConversation(conversationId);
                setConversation(response.conversation);
                setMessages(response.conversation.messages);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to load conversation.');
            } finally {
                setLoadingConversation(false);
            }
        }

        void load();
    }, [conversationId, user?.isEmailVerified]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const pollMessages = useCallback(async () => {
        if (!conversationId) return;
        try {
            const response = await getConversation(conversationId);
            setMessages(response.conversation.messages);
        } catch {
            // Silently ignore poll failures
        }
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId || !user?.isEmailVerified) return;
        pollRef.current = setInterval(() => { void pollMessages(); }, POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [conversationId, user?.isEmailVerified, pollMessages]);

    async function handleShareContact() {
        if (!conversationId) return;
        const lines: string[] = ['Here is my contact/payment info:'];
        if (sharePhone && user?.phoneNumber) lines.push(`Phone: ${user.phoneNumber}`);
        if (shareVenmo && user?.venmoUsername) lines.push(`Venmo: @${user.venmoUsername}`);
        const content = lines.join('\n');

        setSending(true);
        setSendError(null);
        try {
            const response = await sendMessage(conversationId, content);
            setMessages((prev) => [...prev, response.message]);
            setSharePhone(false);
            setShareVenmo(false);
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Unable to send.');
        } finally {
            setSending(false);
        }
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!conversationId || !messageText.trim()) return;

        setSending(true);
        setSendError(null);

        try {
            const response = await sendMessage(conversationId, messageText.trim());
            setMessages((prev) => [...prev, response.message]);
            setMessageText('');
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Unable to send message.');
        } finally {
            setSending(false);
        }
    }

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page-content">
            <div className="page-container conv-shell">
                <div className="conv-header">
                    <Link className="button button-secondary" to="/messages">
                        ← Back to Messages
                    </Link>
                    {conversation ? (
                        <h1 className="conv-title">{conversation.listingName}</h1>
                    ) : null}
                </div>

                {loadingConversation ? <p className="loading-spinner">Loading conversation...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

                {conversation && !loadingConversation ? (
                    <>
                        <div className="conv-listing-card">
                            {conversation.listingImageUrl ? (
                                <img
                                    className="conv-listing-thumb"
                                    src={conversation.listingImageUrl}
                                    alt={conversation.listingName}
                                />
                            ) : (
                                <div className="conv-listing-thumb-placeholder">No image</div>
                            )}
                            <div className="conv-listing-info">
                                <span className="conv-listing-name">{conversation.listingName}</span>
                                <span className="conv-listing-price">
                                    ${conversation.listingPrice.toFixed(2)}
                                </span>
                            </div>
                            <Link
                                className="button button-secondary"
                                to={`/listings/${conversation.listingId}`}
                            >
                                View Listing
                            </Link>
                        </div>

                        <div
                            className="conv-messages"
                            aria-label="Conversation messages"
                            aria-live="polite"
                        >
                            {messages.length === 0 ? (
                                <p className="conv-no-messages">No messages yet. Say hello!</p>
                            ) : null}
                            {messages.map((msg) => {
                                const isOwn = msg.senderId === user?.id;
                                return (
                                    <div
                                        key={msg.id}
                                        className={`conv-message ${isOwn ? 'conv-message-own' : 'conv-message-other'}`}
                                    >
                                        {!isOwn ? (
                                            <div
                                                className="conv-avatar"
                                                aria-label={`${msg.senderEmail}'s avatar`}
                                            >
                                                {msg.senderInitial}
                                            </div>
                                        ) : null}
                                        <div className="conv-message-body">
                                            {!isOwn ? (
                                                <span className="conv-sender">{msg.senderEmail}</span>
                                            ) : null}
                                            <div className="conv-bubble">{msg.content}</div>
                                            <span className="conv-time">{formatTime(msg.createdAt)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {sendError ? <p className="status status-error">{sendError}</p> : null}

                        <div className="conv-share-widget">
                            <label className={`conv-share-option${!user?.phoneNumber ? ' conv-share-option-disabled' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={sharePhone}
                                    onChange={(e) => setSharePhone(e.target.checked)}
                                    disabled={!user?.phoneNumber || sending}
                                />
                                Phone Number
                                {!user?.phoneNumber ? (
                                    <span className="conv-share-hint">Add in your profile</span>
                                ) : null}
                            </label>
                            <label className={`conv-share-option${!user?.venmoUsername ? ' conv-share-option-disabled' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={shareVenmo}
                                    onChange={(e) => setShareVenmo(e.target.checked)}
                                    disabled={!user?.venmoUsername || sending}
                                />
                                Venmo
                                {!user?.venmoUsername ? (
                                    <span className="conv-share-hint">Add in your profile</span>
                                ) : null}
                            </label>
                            <button
                                className="button button-secondary"
                                type="button"
                                disabled={(!sharePhone && !shareVenmo) || sending}
                                onClick={() => { void handleShareContact(); }}
                            >
                                Share Contact/Payment Information
                            </button>
                        </div>

                        <form className="conv-send-form" onSubmit={handleSend}>
                            <input
                                className="input conv-send-input"
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type a message..."
                                disabled={sending}
                                maxLength={2000}
                            />
                            <button
                                className="button button-accent"
                                type="submit"
                                disabled={sending || !messageText.trim()}
                            >
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </form>
                    </>
                ) : null}
            </div>
        </main>
    );
}
