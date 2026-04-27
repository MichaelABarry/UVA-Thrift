import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getConversations } from '../services/conversationService';
import type { ConversationSummary } from '../types/conversation';
import { formatConversationPreview } from '../utils/conversationContent';
import {
    getSystemNotifications,
	markNotificationRead,
    markAllNotificationsRead,
    type SystemNotification,
} from '../services/systemNotificationService';

function formatDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessagesPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [error, setError] = useState<string | null>(null);
	const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(true);

    useEffect(() => {
        async function load() {
            if (!user?.isEmailVerified) {
                setLoadingConversations(false);
				setLoadingNotifications(false);	
                return;
            }

            setLoadingConversations(true);
			setLoadingNotifications(true);
            setError(null);

            try {
                const [convResponse, notifList] = await Promise.all([
                    getConversations(),
                    getSystemNotifications(),
                ]);
                setConversations(convResponse.conversations);
                setNotifications(notifList);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to load messages.');
            } finally {
                setLoadingConversations(false);
				setLoadingNotifications(false);
            }
        }

        void load();
    }, [user?.isEmailVerified]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }
	
	// Dismiss a single notification (mark as read + remove from view)
	async function handleDismiss(notificationId: string) {
        await markNotificationRead(notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }

	// Clear all — marks all read and removes all from view
    async function handleClearAll() {
        await markAllNotificationsRead();
        setNotifications([]);
    }

    const visibleNotifications = notifications.filter((n) => !n.readAt);

    return (
        <main className="page-content">
            <div className="page-container">
                <h1 className="home-heading">Messages</h1>

                {loadingConversations || loadingNotifications ? (
                    <p className="loading-spinner">Loading messages...</p>
                ) : null}
                {error ? <p className="status status-error">{error}</p> : null}

				{/* ── System Notifications ── */}
                {!loadingNotifications && visibleNotifications.length > 0 ? (
                    <section className="sysnotif-section">
                        <div className="sysnotif-header">
                            <h2 className="sysnotif-heading">
                                Notifications
                                <span className="sysnotif-badge">{visibleNotifications.length}</span>
                            </h2>
                                <button
                                    type="button"
                                    className="sysnotif-clear-all"
                                    onClick={() => { void handleClearAll(); }}
                                >
                                    Clear All
                                </button>
                        </div>

                        <div className="sysnotif-list">
                            {visibleNotifications.map((notif) => (
                                <div key={notif.id} className="sysnotif-item sysnotif-item--unread">
                                    <div className="sysnotif-item-body">
                                        <p className="sysnotif-item-title">{notif.title}</p>
                                        <p className="sysnotif-item-text">{notif.body}</p>
                                        <div className="sysnotif-item-footer">
                                            <span className="sysnotif-item-time">
                                                {formatDate(notif.createdAt)}
                                            </span>
                                            {notif.link ? (
                                                <a
                                                    href={notif.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="sysnotif-item-link"
                                                    onClick={() => { void handleDismiss(notif.id); }}
                                                >
                                                    Learn about Hoos ReUse ↗
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                    {/* ✕ dismiss button */}
                                        <button
                                            type="button"
                                            className="sysnotif-item-dismiss"
                                            aria-label="Dismiss notification"
                                            onClick={() => { void handleDismiss(notif.id); }}
                                        >
                                            ✕
                                        </button>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* ── Conversations ── */}
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
                                        <span className="messages-row-listing">
                                            {conv.listingName}
                                            {conv.isClosed ? (
                                                <span className="messages-row-status">Conversation ended</span>
                                            ) : null}
                                        </span>
                                        <span className="messages-row-time">
                                            {formatDate(conv.lastMessageAt ?? conv.updatedAt)}
                                        </span>
                                    </div>
                                    <span className="messages-row-other">{conv.otherPartyEmail}</span>
                                    <p className="messages-row-preview">
                                        {formatConversationPreview(conv.lastMessagePreview) ?? 'No messages yet'}
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
