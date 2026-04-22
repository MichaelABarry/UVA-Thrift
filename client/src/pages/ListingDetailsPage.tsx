import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
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

        void loadWatchState();
    }, [listingId, user?.isEmailVerified]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    async function handleWatchToggle() {
        if (!listing) {
            return;
        }

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

                            <div className="listing-categories listing-details-categories">
                                {listing.categories.map((category) => (
                                    <span className="listing-category-chip" key={`${listing.id}-${category}`}>
                                        {category}
                                    </span>
                                ))}
                            </div>

                            <p className="listing-details-description">{listing.description}</p>

                            {user?.id !== listing.userId ? (
                                <div className="listing-details-actions">
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
                                    {!showMessageCompose ? (
                                        <button
                                            className="button button-secondary"
                                            type="button"
                                            onClick={handleMessageSeller}
                                        >
                                            Message Seller
                                        </button>
                                    ) : (
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
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </article>
                ) : null}
            </div>
        </main>
    );
}