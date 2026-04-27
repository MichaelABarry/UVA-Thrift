import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { deleteListing, extendListing, getListingDetails } from '../services/listingService';
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

const EXTENSION_OPTIONS = [
    { value: 15, label: '15 days' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
];

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

	// Relist / extend state
    const [extensionDays, setExtensionDays] = useState(30);
    const [extending, setExtending] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

	async function handleExtend() {
        if (!listing) return;
        setExtending(true);
        setError(null);
        try {
            const response = await extendListing(listing.id, extensionDays);
            setListing(response.listing);
            setStatusMessage(`✅ Your listing has been relisted for another ${extensionDays} days!`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to extend listing.');
        } finally {
            setExtending(false);
        }
    }

    async function handleDelete(redirectToHoosReuse: boolean) {
        if (!listing) return;
        setDeleting(true);
        setError(null);
        try {
            await deleteListing(listing.id);
            if (redirectToHoosReuse) {
                void navigate('/hoos-reuse');
            } else {
                void navigate('/profile?section=items');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete listing.');
            setDeleting(false);
        }
    }

    const isOwnListing = listing ? user?.id === listing.userId : false;

	const daysLeft = listing?.expiresAt ? getDaysUntilExpiry(listing.expiresAt) : null;
    const isExpired = daysLeft !== null && daysLeft <= 0;
    const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 5;
    

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

                {/* ── Expired prompt (own listing only) ── */}
                {listing && isExpired && isOwnListing ? (
                    <div className="relist-prompt">
                        <div className="relist-prompt-header">
                            <span className="relist-prompt-icon">⏰</span>
                            <div>
                                <p className="relist-prompt-title">This listing has expired</p>
                                <p className="relist-prompt-subtitle">
                                    Nobody grabbed it yet. Would you like to relist it or remove it?
                                </p>
                            </div>
                        </div>

                        <div className="relist-prompt-body">
                            {/* Relist section */}
                            <div className="relist-section">
                                <p className="relist-section-label">Relist for how long?</p>
                                <div className="relist-days-options">
                                    {EXTENSION_OPTIONS.map((opt) => (
                                        <label
                                            key={opt.value}
                                            className={`relist-day-option${extensionDays === opt.value ? ' relist-day-option--selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="extensionDays"
                                                value={opt.value}
                                                checked={extensionDays === opt.value}
                                                onChange={() => setExtensionDays(opt.value)}
                                                style={{ display: 'none' }}
                                                disabled={extending || deleting}
                                            />
                                            <span className="relist-day-num">{opt.value}</span>
                                            <span className="relist-day-unit">days</span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="button button-accent relist-btn"
                                    onClick={handleExtend}
                                    disabled={extending || deleting}
                                >
                                    {extending ? 'Relisting…' : `Relist for ${extensionDays} days`}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="relist-divider">
                                <span>or</span>
                            </div>

                            {/* Delete section */}
                            <div className="relist-delete-section">
                                <p className="relist-section-label">Remove this listing</p>
                                <p className="relist-delete-hint">
                                    If you're done with the item, consider donating it through Hoos ReUse instead of throwing it away.
                                </p>
                                <div className="relist-delete-actions">
                                    <button
                                        type="button"
                                        className="button relist-donate-btn"
                                        onClick={() => void handleDelete(true)}
                                        disabled={extending || deleting}
                                    >
                                        {deleting ? 'Deleting…' : '♻️ Delete & Donate via Hoos ReUse'}
                                    </button>
                                    <button
                                        type="button"
                                        className="button button-secondary"
                                        onClick={() => void handleDelete(false)}
                                        disabled={extending || deleting}
                                    >
                                        Delete Only
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Expiring soon warning (own listing only) */}
                {listing && isExpiringSoon && isOwnListing ? (
                    <div className="expiry-banner expiry-banner--soon">
						<span className="expiry-banner-text">
                        <strong>⚠️ Expiring in {daysLeft} day{daysLeft === 1 ? '' : 's'}.</strong>{' '}
                        If it doesn't sell, consider donating via{' '}
                        <Link to="/hoos-reuse" className="expiry-banner-inline-link">Hoos ReUse</Link>.
						</span>
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

							{/* Expiry date — only shown to owner */}
                            {listing.expiresAt && isOwnListing ? (
                                <p className={`listing-expiry-date${isExpired ? ' listing-expiry-date--expired' : isExpiringSoon ? ' listing-expiry-date--soon' : ''}`}>
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

                            {user?.id !== listing.userId ? (
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
