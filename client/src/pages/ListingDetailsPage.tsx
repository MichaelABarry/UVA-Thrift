import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getListingDetails } from '../services/listingService';
import {
    createListingWatch,
    deleteListingWatch,
    getListingWatchStatus
} from '../services/listingWatchService';
import { createOrGetConversation, sendMessage } from '../services/conversationService';
import type { Listing } from '../types/listing';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysUntilExpiry(expiresAt: string): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function ListingDetailsPage() {
    const { user, loading } = useAuth();
    const { listingId } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loadingListing, setLoadingListing] = useState(true);
    const [loadingWatchState, setLoadingWatchState] = useState(true);
    const [watching, setWatching] = useState(false);
    const [watchSubmitting, setWatchSubmitting] = useState(false);
    const [messagingSubmitting, setMessagingSubmitting] = useState(false);
    const [showMessageCompose, setShowMessageCompose] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        async function loadListing() {
            if (!listingId || !user?.isEmailVerified) {
                setLoadingListing(false);
                return;
            }

            setLoadingListing(true);
            setError(null);

            try {
                const response = await getListingDetails(listingId);
                setListing(response.listing);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load listing details.');
            } finally {
                setLoadingListing(false);
            }
        }

        void loadListing();
    }, [listingId, user?.isEmailVerified]);

    useEffect(() => {
        async function loadWatchState() {
            if (!listingId || !user?.isEmailVerified) {
                setLoadingWatchState(false);
                return;
            }

            setLoadingWatchState(true);

            try {
                const response = await getListingWatchStatus(listingId);
                setWatching(response.isWatching);
            } catch {
                setWatching(false);
            } finally {
                setLoadingWatchState(false);
            }
        }

        void loadWatchState();;
    }, [listingId, user?.isEmailVerified]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    async function handleWatchToggle() {
        if (!listing) return;

        setWatchSubmitting(true);
        setError(null);
        setStatusMessage(null);

        try {
            if (watching) {
                await deleteListingWatch(listing.id);
                setWatching(false);
                setStatusMessage('You will no longer receive updates for this item.');
                return;
            }

            await createListingWatch(listing.id);
            setWatching(true);
            setStatusMessage('You will receive emails if this item is updated or deleted.');
        } catch (watchError) {
            setError(watchError instanceof Error ? watchError.message : 'Unable to update watch settings for this item.');
        } finally {
            setWatchSubmitting(false);
        }
    }

    function handleMessageSeller() {
        setShowMessageCompose(true);
        setError(null);
    }

    async function handleSendMessage() {
        if (!listing || !messageText.trim()) return;
        setMessagingSubmitting(true);
        setError(null);
        try {
            const { conversation } = await createOrGetConversation(listing.id);
            await sendMessage(conversation.id, messageText.trim());
            void navigate(`/messages/${conversation.id}`);
        } catch (msgError) {
            setError(msgError instanceof Error ? msgError.message : 'Unable to send message.');
        } finally {
            setMessagingSubmitting(false);
        }
    }

	const daysLeft = listing?.expiresAt ? getDaysUntilExpiry(listing.expiresAt) : null;
    const isExpired = daysLeft !== null && daysLeft <= 0;
    const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 5;
    const isOwnListing = user?.id === listing?.userId;

    return (
        <main className="page-content">
            <div className="page-container listing-details-shell">
                <div className="listing-details-header">
                    <div>
                        <h1 className="home-heading">Listing Details</h1>
                    </div>
                </div>

                {loadingListing ? <p className="loading-spinner">Loading listing details...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}
                {statusMessage ? <p className="status status-success">{statusMessage}</p> : null}

				{/* Expired banner — shown to the owner so they can act */}
                {listing && isExpired && isOwnListing ? (
                    <div className="expiry-banner expiry-banner--expired">
                        <div className="expiry-banner-text">
                            <strong>This listing has expired.</strong> Nobody grabbed it. That's okay!
                            Consider donating it through Hoos ReUse to keep it out of the landfill.
                        </div>
                        <Link to="/hoos-reuse" className="button expiry-banner-btn">
                            Learn about Hoos ReUse →
                        </Link>
                    </div>
                ) : null}

                {/* Expiring-soon warning */}
                {listing && isExpiringSoon && isOwnListing ? (
                    <div className="expiry-banner expiry-banner--soon">
                        <strong>⚠️ Expiring in {daysLeft} day{daysLeft === 1 ? '' : 's'}.</strong>{' '}
                        If it doesn't sell, consider donating via{' '}
                        <Link to="/hoos-reuse" className="expiry-banner-inline-link">Hoos ReUse</Link>.
                    </div>
                ) : null}

                {listing && !loadingListing ? (
                    <article className="listing-details-card">
                        {listing.imageUrl ? (
                            <div className="listing-details-image-frame">
                                <img className="listing-details-image" src={listing.imageUrl} alt={listing.name} />
                            </div>
                        ) : (
                            <div className="listing-details-image-placeholder">No image</div>
                        )}

                        <div className="listing-details-body">
                            <div className="listing-details-title-row">
                                <h2 className="listing-title">{listing.name}</h2>
                                <p className="listing-price">${listing.price.toFixed(2)}</p>
                            </div>

                            <p className="listing-details-date">Listed {formatDate(listing.createdAt)}</p>

							{/* Expiry date row */}
                            {listing.expiresAt ? (
                                <p className={`listing-expiry-date ${isExpired ? 'listing-expiry-date--expired' : ''} ${isExpiringSoon ? 'listing-expiry-date--soon' : ''}`}>
                                    {isExpired
                                        ? `⏰ Expired ${formatDate(listing.expiresAt)}`
                                        : `⏳ Expires ${formatDate(listing.expiresAt)}${isExpiringSoon ? ` (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)` : ''}`}
                                </p>
                            ) : null}

                            <div className="listing-categories listing-details-categories">
                                {listing.categories.map((category) => (
                                    <span className="listing-category-chip" key={`${listing.id}-${category}`}>
                                        {category}
                                    </span>
                                ))}
                            </div>

                            <p className="listing-details-description">{listing.description}</p>

                            {!isOwnListing ? (
                                <div className="listing-details-actions">
                                    <div className="listing-details-action-row">
                                        <button
                                            className={`button ${watching ? 'button-secondary' : 'button-accent'}`}
                                            type="button"
                                            onClick={handleWatchToggle}
                                            disabled={loadingWatchState || watchSubmitting}
                                        >
                                            {loadingWatchState
                                                ? 'Loading alert...'
                                                : watchSubmitting
                                                    ? 'Saving...'
                                                    : watching
                                                        ? 'Stop Watching Item'
                                                        : 'Email Me About Changes'}
                                        </button>
                                        <button
                                            className="button button-secondary"
                                            type="button"
                                            onClick={handleMessageSeller}
                                        >
                                            Message Seller
                                        </button>
                                    </div>

                                    {showMessageCompose ? (
                                        <div className="message-compose">
                                            <textarea
                                                className="input"
                                                rows={3}
                                                placeholder="Type a message to the seller…"
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                disabled={messagingSubmitting}
                                            />
                                            <div className="message-compose-actions">
                                                <button
                                                    className="button button-accent"
                                                    type="button"
                                                    onClick={handleSendMessage}
                                                    disabled={messagingSubmitting || !messageText.trim()}
                                                >
                                                    {messagingSubmitting ? 'Sending…' : 'Send Message'}
                                                </button>
                                                <button
                                                    className="button button-secondary"
                                                    type="button"
                                                    onClick={() => { setShowMessageCompose(false); setMessageText(''); }}
                                                    disabled={messagingSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </article>
                ) : null}
            </div>
        </main>
    );
}