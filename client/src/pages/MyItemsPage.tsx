import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { deleteListing, getMyListings } from '../services/listingService';
import type { Listing } from '../types/listing';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MyItemsPage() {
    const { user, loading } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loadingListings, setLoadingListings] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => {
        async function loadListings() {
            setLoadingListings(true);
            setError(null);

            try {
                const response = await getMyListings();
                setListings(response.listings);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load your listings.');
            } finally {
                setLoadingListings(false);
            }
        }

        if (user?.isEmailVerified) {
            void loadListings();
        }
    }, [user?.isEmailVerified]);

    const hasListings = useMemo(() => listings.length > 0, [listings.length]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    async function handleDelete(listingId: string) {
        const confirmed = window.confirm('Delete this listing? This action cannot be undone.');

        if (!confirmed) {
            return;
        }

        setPendingDeleteId(listingId);
        setError(null);

        try {
            await deleteListing(listingId);
            setListings((current) => current.filter((listing) => listing.id !== listingId));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete listing.');
        } finally {
            setPendingDeleteId(null);
        }
    }

    return (
        <main className="page-content">
            <div className="page-container">
                <div className="my-items-header">
                    <div>
                        <h1 className="home-heading">My Items</h1>
                        <p className="home-subheading">
                            Manage the items you have listed for other UVA students.
                        </p>
                    </div>
                    <Link className="button button-accent" to="/listings/new">
                        Add Another Item
                    </Link>
                </div>

                {loadingListings ? <p className="loading-spinner">Loading your items...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

                {!loadingListings && !error && !hasListings ? (
                    <div className="empty-state my-items-empty-state">
                        <div className="empty-state-icon">🛍️</div>
                        <h2 className="empty-state-title">You have not listed anything yet</h2>
                        <p className="empty-state-body">
                            Start with one item, then come back here anytime to edit or remove it.
                        </p>
                    </div>
                ) : null}

                {!loadingListings && hasListings ? (
                    <div className="listing-grid" aria-label="Your uploaded items">
                        {listings.map((listing) => (
                            <article className="listing-card" key={listing.id}>
                                {listing.imageUrl ? (
                                    <div className="listing-image-frame">
                                        <img className="listing-image" src={listing.imageUrl} alt={listing.name} />
                                    </div>
                                ) : (
                                    <div className="listing-image-placeholder">No image</div>
                                )}

                                <div className="listing-header">
                                    <h2 className="listing-title">{listing.name}</h2>
                                    <p className="listing-price">${listing.price.toFixed(2)}</p>
                                </div>

                                <p className="listing-description">{listing.description}</p>

                                <div className="listing-footer">
                                    <div className="listing-categories">
                                        {listing.categories.map((category) => (
                                            <span className="listing-category-chip" key={`${listing.id}-${category}`}>
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="listing-date">{formatDate(listing.createdAt)}</span>
                                </div>

                                <div className="listing-actions">
                                    <Link className="button button-secondary listing-action-button" to={`/listings/${listing.id}/edit`}>
                                        Edit
                                    </Link>
                                    <button
                                        className="button listing-action-button listing-delete-button"
                                        type="button"
                                        onClick={() => handleDelete(listing.id)}
                                        disabled={pendingDeleteId === listing.id}
                                    >
                                        {pendingDeleteId === listing.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
            </div>
        </main>
    );
}