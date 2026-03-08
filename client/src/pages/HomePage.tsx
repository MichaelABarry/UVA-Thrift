import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getListings } from '../services/listingService';
import type { Listing } from '../types/listing';

const DESCRIPTION_PREVIEW_LENGTH = 140;

type SortOption = 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc';

export function HomePage() {
    const { user, loading } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('date-desc');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dateAfter, setDateAfter] = useState('');
    const [dateBefore, setDateBefore] = useState('');
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

    const availableCategories = useMemo(() => {
        const uniqueCategories = new Set<string>();

        listings.forEach((listing) => {
            listing.categories.forEach((category) => uniqueCategories.add(category));
        });

        return Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b));
    }, [listings]);

    const filteredListings = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const normalizedCategoryFilter = categoryFilter.toLowerCase();
        const parsedMinPrice = minPrice.trim() === '' ? null : Number(minPrice);
        const parsedMaxPrice = maxPrice.trim() === '' ? null : Number(maxPrice);

        const hasValidMinPrice = parsedMinPrice !== null && !Number.isNaN(parsedMinPrice);
        const hasValidMaxPrice = parsedMaxPrice !== null && !Number.isNaN(parsedMaxPrice);

        const minDate = dateAfter ? new Date(`${dateAfter}T00:00:00`) : null;
        const maxDate = dateBefore ? new Date(`${dateBefore}T23:59:59.999`) : null;

        return listings.filter((listing) => {
            const inName = listing.name.toLowerCase().includes(normalizedQuery);
            const inDescription = listing.description.toLowerCase().includes(normalizedQuery);
            const inCategories = listing.categories.some((category) => category.toLowerCase().includes(normalizedQuery));
            const matchesSearch = !normalizedQuery || inName || inDescription || inCategories;

            const matchesCategory =
                normalizedCategoryFilter === 'all' ||
                listing.categories.some((category) => category.toLowerCase() === normalizedCategoryFilter);

            const matchesMinPrice = !hasValidMinPrice || listing.price >= parsedMinPrice;
            const matchesMaxPrice = !hasValidMaxPrice || listing.price <= parsedMaxPrice;

            const listingDate = new Date(listing.createdAt);
            const matchesDateAfter = !minDate || listingDate >= minDate;
            const matchesDateBefore = !maxDate || listingDate <= maxDate;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesMinPrice &&
                matchesMaxPrice &&
                matchesDateAfter &&
                matchesDateBefore
            );
        });
    }, [listings, searchQuery, categoryFilter, minPrice, maxPrice, dateAfter, dateBefore]);

    const hasFilteredListings = useMemo(() => filteredListings.length > 0, [filteredListings.length]);

    const sortedFilteredListings = useMemo(() => {
        const sorted = [...filteredListings];

        sorted.sort((a, b) => {
            if (sortOption === 'price-asc') {
                return a.price - b.price;
            }

            if (sortOption === 'price-desc') {
                return b.price - a.price;
            }

            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();

            if (sortOption === 'date-asc') {
                return aTime - bTime;
            }

            return bTime - aTime;
        });

        return sorted;
    }, [filteredListings, sortOption]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page page-content">
            <section className="card card-wide" aria-label="Home page">
                <h1 className="card-title">UVA Thrift</h1>
                <p className="card-subtitle">All item listings</p>

                <input
                    className="input search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by name, description, or category"
                    aria-label="Search listings"
                />

                {loadingListings ? <p className="profile-message">Loading listings...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

                {!loadingListings && !error && !hasListings ? (
                    <p className="profile-message">No listings yet. Click Add Item to create the first one.</p>
                ) : null}

                {!loadingListings && !error && hasListings ? (
                    <div className="home-layout">
                        <aside className="sort-sidebar" aria-label="Sort listings">
                            <h2 className="section-heading sort-heading">Sort by</h2>
                            <div className="sort-options" role="radiogroup" aria-label="Sort options">
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'date-desc'}
                                        onChange={() => setSortOption('date-desc')}
                                    />
                                    <span>Date added: Newest first</span>
                                </label>
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'date-asc'}
                                        onChange={() => setSortOption('date-asc')}
                                    />
                                    <span>Date added: Oldest first</span>
                                </label>
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'price-asc'}
                                        onChange={() => setSortOption('price-asc')}
                                    />
                                    <span>Price: Low to high</span>
                                </label>
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'price-desc'}
                                        onChange={() => setSortOption('price-desc')}
                                    />
                                    <span>Price: High to low</span>
                                </label>
                            </div>

                            <h2 className="section-heading filter-heading">Filters</h2>

                            <label className="sidebar-label" htmlFor="min-price">
                                Min price
                            </label>
                            <input
                                id="min-price"
                                className="input sidebar-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={minPrice}
                                onChange={(event) => setMinPrice(event.target.value)}
                                placeholder="No minimum"
                            />

                            <label className="sidebar-label" htmlFor="max-price">
                                Max price
                            </label>
                            <input
                                id="max-price"
                                className="input sidebar-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={maxPrice}
                                onChange={(event) => setMaxPrice(event.target.value)}
                                placeholder="No maximum"
                            />

                            <label className="sidebar-label" htmlFor="category-filter">
                                Category
                            </label>
                            <select
                                id="category-filter"
                                className="input sidebar-input"
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                            >
                                <option value="all">All categories</option>
                                {availableCategories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>

                            <label className="sidebar-label" htmlFor="date-after">
                                Added on or after
                            </label>
                            <input
                                id="date-after"
                                className="input sidebar-input"
                                type="date"
                                value={dateAfter}
                                onChange={(event) => setDateAfter(event.target.value)}
                            />

                            <label className="sidebar-label" htmlFor="date-before">
                                Added on or before
                            </label>
                            <input
                                id="date-before"
                                className="input sidebar-input"
                                type="date"
                                value={dateBefore}
                                onChange={(event) => setDateBefore(event.target.value)}
                            />
                        </aside>

                        <div className="listing-grid" aria-label="Listings feed">
                        {!hasFilteredListings ? (
                            <p className="profile-message">No listings match your current search and filters.</p>
                        ) : null}

                        {sortedFilteredListings.map((listing) => {
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
                    </div>
                ) : null}
            </section>
        </main>
    );
}
