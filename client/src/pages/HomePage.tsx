import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getListings, reportListing } from '../services/listingService';
import { addItemToList, getLists as getUserLists } from '../services/listService';
import type { ItemList } from '../types/list';
import type { Listing } from '../types/listing';

type SortOption = 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysUntilExpiry(expiresAt: string): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function HomePage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [lists, setLists] = useState<ItemList[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('date-desc');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dateAfter, setDateAfter] = useState('');
    const [dateBefore, setDateBefore] = useState('');
    const [loadingListings, setLoadingListings] = useState(true);
    const [loadingLists, setLoadingLists] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [listStatus, setListStatus] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportStatus, setReportStatus] = useState<string | null>(null);
    const [expandedListPickerId, setExpandedListPickerId] = useState<string | null>(null);
    const [selectedListIds, setSelectedListIds] = useState<Record<string, string[]>>({});
    const [pendingSaveListingId, setPendingSaveListingId] = useState<string | null>(null);
    const [pendingReportListingId, setPendingReportListingId] = useState<string | null>(null);

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

    useEffect(() => {
        async function loadLists() {
            setLoadingLists(true);
            setListError(null);

            try {
                const response = await getUserLists();
                setLists(response.lists);
            } catch (loadError) {
                setListError(loadError instanceof Error ? loadError.message : 'Unable to load your lists.');
            } finally {
                setLoadingLists(false);
            }
        }

        if (user?.isEmailVerified) {
            void loadLists();
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

    function toggleListSelection(listingId: string, listId: string) {
        setSelectedListIds((current) => {
            const selectedForListing = current[listingId] ?? [];
            const nextSelection = selectedForListing.includes(listId)
                ? selectedForListing.filter((id) => id !== listId)
                : [...selectedForListing, listId];

            return {
                ...current,
                [listingId]: nextSelection
            };
        });
    }

    async function handleAddToList(listing: Listing) {
        const chosenListIds = selectedListIds[listing.id] ?? [];

        if (!chosenListIds.length) {
            setListError('Select at least one list before saving items.');
            return;
        }

        setPendingSaveListingId(listing.id);
        setListError(null);
        setListStatus(null);

        try {
            const responses = await Promise.all(
                chosenListIds.map((listId) => addItemToList(listId, listing.id))
            );

            const updatedLists = new Map(responses.map((response) => [response.list.id, response.list]));
            setLists((current) => current.map((list) => updatedLists.get(list.id) ?? list));
            setExpandedListPickerId(null);
            setSelectedListIds((current) => ({ ...current, [listing.id]: [] }));
            setListStatus(`Saved ${listing.name} to ${responses.map((response) => response.list.name).join(', ')}.`);
        } catch (saveError) {
            setListError(saveError instanceof Error ? saveError.message : 'Unable to save that item to your list.');
        } finally {
            setPendingSaveListingId(null);
        }
    }

    async function handleReport(listing: Listing) {
        const confirmed = window.confirm(
            `Report ${listing.name}? Once reported, it will be removed from your marketplace feed.`
        );

        if (!confirmed) {
            return;
        }

        setPendingReportListingId(listing.id);
        setReportError(null);
        setReportStatus(null);

        try {
            const response = await reportListing(listing.id);

            setListings((current) => current.filter((currentListing) => currentListing.id !== listing.id));
            setExpandedListPickerId((current) => (current === listing.id ? null : current));
            setSelectedListIds((current) => {
                const nextSelection = { ...current };
                delete nextSelection[listing.id];
                return nextSelection;
            });
            setReportStatus(
                response.listingDeleted
                    ? `${listing.name} reached the report threshold and was removed from the marketplace.`
                    : `${listing.name} was reported and removed from your marketplace feed.`
            );
        } catch (reportListingError) {
            setReportError(reportListingError instanceof Error ? reportListingError.message : 'Unable to report this listing.');
        } finally {
            setPendingReportListingId(null);
        }
    }

    return (
        <main className="page-content">
            <div className="page-container">
                {/* Header */}
                <div className="home-header">
                    <h1 className="home-heading">Marketplace</h1>
                    <p className="home-subheading">
                        {hasListings
                            ? `${listings.length} item${listings.length === 1 ? '' : 's'} listed by UVA students`
                            : 'Browse items listed by UVA students'}
                    </p>
                </div>

                {/* Search */}
                <div className="home-search-bar">
                    <input
                        className="input search-input"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by name, description, or category..."
                        aria-label="Search listings"
                    />
                </div>

                {/* Loading / Error */}
                {error ? <p className="status status-error">{error}</p> : null}
                {listError ? <p className="status status-error">{listError}</p> : null}
                {listStatus ? <p className="status status-success">{listStatus}</p> : null}
                {reportError ? <p className="status status-error">{reportError}</p> : null}
                {reportStatus ? <p className="status status-success">{reportStatus}</p> : null}
                {loadingListings ? <p className="loading-spinner">Loading listings...</p> : null}

                {/* Empty state */}
                {!loadingListings && !error && !hasListings ? (
                    <div className="empty-state">
                        <h2 className="empty-state-title">No listings yet</h2>
                        <p className="empty-state-body">
                            Be the first — click <strong>+ New Item</strong> to create a listing.
                        </p>
                    </div>
                ) : null}

                {/* Main layout: sidebar + grid */}
                {!loadingListings && !error && hasListings ? (
                    <div className="home-layout">
                        <aside className="sort-sidebar" aria-label="Sort and filter listings">
                            <h2 className="section-heading sort-heading">Sort by</h2>
                            <div className="sort-options" role="radiogroup" aria-label="Sort options">
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'date-desc'}
                                        onChange={() => setSortOption('date-desc')}
                                    />
                                    <span>Newest first</span>
                                </label>
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'date-asc'}
                                        onChange={() => setSortOption('date-asc')}
                                    />
                                    <span>Oldest first</span>
                                </label>
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'price-asc'}
                                        onChange={() => setSortOption('price-asc')}
                                    />
                                    <span>Price: Low → High</span>
                                </label>
                                <label className="sort-option">
                                    <input
                                        type="radio"
                                        name="listing-sort"
                                        checked={sortOption === 'price-desc'}
                                        onChange={() => setSortOption('price-desc')}
                                    />
                                    <span>Price: High → Low</span>
                                </label>
                            </div>

                            <h2 className="section-heading filter-heading">Filters</h2>

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
                                placeholder="$0"
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
                                placeholder="No max"
                            />

                            <label className="sidebar-label" htmlFor="date-after">
                                After
                            </label>
                            <input
                                id="date-after"
                                className="input sidebar-input"
                                type="date"
                                value={dateAfter}
                                onChange={(event) => setDateAfter(event.target.value)}
                            />

                            <label className="sidebar-label" htmlFor="date-before">
                                Before
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
                                <p className="listing-empty">No listings match your current search and filters.</p>
                            ) : null}

                            {sortedFilteredListings.map((listing) => {
                                return (
                                    <article
                                        className="listing-card listing-card-clickable"
                                        key={listing.id}
                                        role="link"
                                        tabIndex={0}
                                        onClick={() => navigate(`/listings/${listing.id}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                navigate(`/listings/${listing.id}`);
                                            }
                                        }}
                                    >
                                        {user?.id !== listing.userId ? (
                                            <button
                                                className="button listing-report-button"
                                                type="button"
                                                title="Report this listing — e.g. spam, counterfeit items, prohibited content, or inappropriate material"
                                                aria-label={`Report ${listing.name}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleReport(listing);
                                                }}
                                                disabled={pendingReportListingId === listing.id}
                                            >
                                                !
                                            </button>
                                        ) : null}

                                        <button
                                            className="button listing-add-button"
                                            type="button"
                                            aria-label={`Add ${listing.name} to a list`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setListError(null);
                                                setListStatus(null);
                                                setExpandedListPickerId((current) =>
                                                    current === listing.id ? null : listing.id
                                                );
                                            }}
                                            disabled={loadingLists}
                                        >
                                            +
                                        </button>

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
                                        <div className="listing-footer">
                                            <div className="listing-categories">
                                                {listing.categories.map((category) => (
                                                    <span className="listing-category-chip" key={`${listing.id}-${category}`}>
                                                        {category}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="listing-date">{formatDate(listing.createdAt)}</span>
											{listing.expiresAt && user?.id === listing.userId ? (() => {
                                                    const days = getDaysUntilExpiry(listing.expiresAt);
                                                    if (days <= 0) return (
                                                        <span className="listing-expiry-chip listing-expiry-chip--expired">⏰ Expired</span>
                                                    );
                                                    if (days <= 5) return (
                                                        <span className="listing-expiry-chip listing-expiry-chip--soon">⚠️ {days}d left</span>
                                                    );
                                                    return (
                                                        <span className="listing-expiry-chip listing-expiry-chip--ok">⏳ {days}d left</span>
                                                    );
                                                })() : null}
                                            </div>
       
                                        {expandedListPickerId === listing.id ? (
                                            <div className="listing-list-picker" onClick={(event) => event.stopPropagation()}>
                                                {lists.length ? (
                                                    <>
                                                        <div className="listing-list-picker-header">
                                                            <span className="sidebar-label listing-list-picker-label">Save to lists</span>
                                                        </div>
                                                        <div className="listing-list-picker-options">
                                                            {lists.map((list) => (
                                                                <label className="listing-list-picker-option" key={list.id}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(selectedListIds[listing.id] ?? []).includes(list.id)}
                                                                        onChange={() => toggleListSelection(listing.id, list.id)}
                                                                    />
                                                                    <span>{list.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <div className="listing-list-picker-actions">
                                                            <button
                                                                className="button button-secondary"
                                                                type="button"
                                                                onClick={() => {
                                                                    setExpandedListPickerId(null);
                                                                    setSelectedListIds((current) => ({ ...current, [listing.id]: [] }));
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                className="button button-accent"
                                                                type="button"
                                                                onClick={() => handleAddToList(listing)}
                                                                disabled={pendingSaveListingId === listing.id}
                                                            >
                                                                {pendingSaveListingId === listing.id ? 'Saving...' : 'Save'}
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="listing-list-picker-empty">
                                                        You need a list first. <Link to="/profile?section=lists">Create one here.</Link>
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </main>
    );
}
