import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getListings } from '../services/listingService';
import type { Listing } from '../types/listing';

const DESCRIPTION_PREVIEW_LENGTH = 140;

export function HomePage() {
    const { user, loading } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loadingListings, setLoadingListings] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadListings() {
            setLoadingListings(true);
            setError(null);

            try {
                const response = await getListings();
                setListings(response.listings);
            } catch (fetchError) {
                setError(fetchError instanceof Error ? fetchError.message : 'Unable to load listings.');
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

    return (
        <main className="page page-content">
            <section className="card card-wide" aria-label="Home page">
                <h1 className="card-title">UVA Thrift</h1>
                <p className="card-subtitle">All item listings</p>

                {loadingListings ? <p className="profile-message">Loading listings...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

                {!loadingListings && !error && !hasListings ? (
                    <p className="profile-message">No listings yet. Click Add Item to create the first one.</p>
                ) : null}

                {!loadingListings && !error && hasListings ? (
                    <div className="listing-grid" aria-label="Listings feed">
                        {listings.map((listing) => {
                            const descriptionPreview =
                                listing.description.length > DESCRIPTION_PREVIEW_LENGTH
                                    ? `${listing.description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
                                    : listing.description;

                            return (
                                <article className="listing-card" key={listing.id}>
                                    <div className="listing-header">
                                        <h2 className="listing-title">{listing.name}</h2>
                                        <p className="listing-price">${listing.price.toFixed(2)}</p>
                                    </div>
                                    <p className="listing-description">{descriptionPreview}</p>
                                    <div className="listing-categories">
                                        {listing.categories.map((category) => (
                                            <span className="listing-category-chip" key={`${listing.id}-${category}`}>
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </section>
        </main>
    );
}
