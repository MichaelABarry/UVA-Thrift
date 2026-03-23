import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getListingDetails } from '../services/listingService';
import type { Listing } from '../types/listing';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ListingDetailsPage() {
    const { user, loading } = useAuth();
    const { listingId } = useParams();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loadingListing, setLoadingListing] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page-content">
            <div className="page-container listing-details-shell">
                <div className="listing-details-header">
                    <div>
                        <h1 className="home-heading">Listing Details</h1>
                        <p className="home-subheading">Review the full item details from your notification email.</p>
                    </div>
                    <Link className="button button-secondary" to="/home">
                        Back to Marketplace
                    </Link>
                </div>

                {loadingListing ? <p className="loading-spinner">Loading listing details...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

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
                        </div>
                    </article>
                ) : null}
            </div>
        </main>
    );
}