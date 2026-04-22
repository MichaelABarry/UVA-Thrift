import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getConversations } from '../services/conversationService';
import type { ConversationSummary } from '../types/conversation';

function formatDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessagesPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!user?.isEmailVerified) {
                setLoadingConversations(false);
                return;
            }

            setLoadingConversations(true);
            setError(null);

            try {
                const response = await getConversations();
                setConversations(response.conversations);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to load messages.');
            } finally {
                setLoadingConversations(false);
            }
        }

        void load();
    }, [user?.isEmailVerified]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page-content">
            <div className="page-container">
                <h1 className="home-heading">Messages</h1>

                {loadingConversations ? <p className="loading-spinner">Loading messages...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

                {!loadingConversations && !error && conversations.length === 0 ? (
                    <div className="empty-state">

                        <h2 className="empty-state-title">No messages yet</h2>
                        <p className="empty-state-body">
                            Browse the marketplace and message a seller to get started.
                        </p>
                    </div>
                ) : null}

                {!loadingConversations && conversations.length > 0 ? (
                    <div className="messages-list" role="list">
                        {conversations.map((conv) => (
                            <button
                                key={conv.id}
                                className="messages-row"
                                type="button"
                                onClick={() => void navigate(`/messages/${conv.id}`)}
                            >
                                <div className="messages-row-thumb">
                                    {conv.listingImageUrl ? (
                                        <img
                                            src={conv.listingImageUrl}
                                            alt={conv.listingName}
                                            className="messages-row-img"
                                        />
                                    ) : (
                                        <div className="messages-row-img-placeholder">No image</div>
                                    )}
                                </div>
                                <div className="messages-row-body">
                                    <div className="messages-row-header">
                                        <span className="messages-row-listing">{conv.listingName}</span>
                                        <span className="messages-row-time">
                                            {formatDate(conv.lastMessageAt ?? conv.updatedAt)}
                                        </span>
                                    </div>
                                    <span className="messages-row-other">{conv.otherPartyEmail}</span>
                                    <p className="messages-row-preview">
                                        {conv.lastMessagePreview ?? 'No messages yet'}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </main>
    );
}
