import { Fragment, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { LISTING_CATEGORY_OPTIONS } from '../constants/listingCategories';
import { useAuth } from '../hooks/useAuth';
import { createList, deleteList, getLists, removeItemFromList, updateList } from '../services/listService';
import { deleteAccount, logout, updateProfile } from '../services/authService';
import { deleteListing, extendListing, getMyListings } from '../services/listingService';
import { deleteListingWatch, getWatchedListings } from '../services/listingWatchService';
import {
    createNotificationPreference,
    deleteNotificationPreference,
    getNotificationPreferences
} from '../services/notificationPreferenceService';
import type { ItemList } from '../types/list';
import type { NotificationPreference } from '../types/notificationPreference';
import type { Listing } from '../types/listing';

type ProfileSection = 'general' | 'items' | 'lists' | 'alerts';

type ListFormState = {
    name: string;
    description: string;
};

const EMPTY_LIST_FORM: ListFormState = {
    name: '',
    description: ''
};

const SECTION_OPTIONS: Array<{ id: ProfileSection; label: string; description: string }> = [
    { id: 'general', label: 'General', description: 'Profile details and account settings' },
    { id: 'items', label: 'My Items', description: 'Listings you are currently managing' },
    { id: 'lists', label: 'Lists', description: 'Saved collections and wanted sets' },
    { id: 'alerts', label: 'Alerts', description: 'Email alerts and watched items' }
];

function getInitial(email: string | undefined): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isProfileSection(value: string | null): value is ProfileSection {
    return value === 'general' || value === 'items' || value === 'lists' || value === 'alerts';
}

export function ProfilePage() {
    const { user, loading, setUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [watchedListings, setWatchedListings] = useState<Listing[]>([]);
    const [listings, setListings] = useState<Listing[]>([]);
    const [lists, setLists] = useState<ItemList[]>([]);

    const [loadingPreferences, setLoadingPreferences] = useState(true);
    const [loadingListings, setLoadingListings] = useState(true);
    const [loadingLists, setLoadingLists] = useState(true);

    const [keywords, setKeywords] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [profileDisplayName, setProfileDisplayName] = useState(user?.displayName ?? '');
    const [profilePhone, setProfilePhone] = useState(user?.phoneNumber ?? '');
    const [profileVenmo, setProfileVenmo] = useState(user?.venmoUsername ?? '');
    const [listForm, setListForm] = useState<ListFormState>(EMPTY_LIST_FORM);
    const [editingListId, setEditingListId] = useState<string | null>(null);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);

    const [profileSubmitting, setProfileSubmitting] = useState(false);
    const [logoutSubmitting, setLogoutSubmitting] = useState(false);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [alertSubmitting, setAlertSubmitting] = useState(false);
    const [listSubmitting, setListSubmitting] = useState(false);

    const [profileStatus, setProfileStatus] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [alertsStatus, setAlertsStatus] = useState<string | null>(null);
    const [alertsError, setAlertsError] = useState<string | null>(null);
    const [listsStatus, setListsStatus] = useState<string | null>(null);
    const [listsError, setListsError] = useState<string | null>(null);
    const [itemsError, setItemsError] = useState<string | null>(null);

    const [pendingAlertDeleteId, setPendingAlertDeleteId] = useState<string | null>(null);
    const [pendingWatchDeleteId, setPendingWatchDeleteId] = useState<string | null>(null);
    const [pendingListingDeleteId, setPendingListingDeleteId] = useState<string | null>(null);
    const [pendingListingExtendId, setPendingListingExtendId] = useState<string | null>(null);
    const [extensionDaysMap, setExtensionDaysMap] = useState<Record<string, number>>({});
    const [pendingListDeleteId, setPendingListDeleteId] = useState<string | null>(null);
    const [pendingListRemoveId, setPendingListRemoveId] = useState<string | null>(null);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);

    const requestedSection = searchParams.get('section');
    const requestedListId = searchParams.get('list');
    const activeSection: ProfileSection = isProfileSection(requestedSection)
        ? requestedSection
        : 'general';

    useEffect(() => {
        setProfileDisplayName(user?.displayName ?? '');
        setProfilePhone(user?.phoneNumber ?? '');
        setProfileVenmo(user?.venmoUsername ?? '');
    }, [user?.displayName, user?.phoneNumber, user?.venmoUsername]);

    useEffect(() => {
        async function loadAlerts() {
            if (!user?.isEmailVerified) {
                setLoadingPreferences(false);
                return;
            }

            setLoadingPreferences(true);
            setAlertsError(null);

            try {
                const [preferencesResponse, watchedResponse] = await Promise.all([
                    getNotificationPreferences(),
                    getWatchedListings()
                ]);
                setPreferences(preferencesResponse.preferences);
                setWatchedListings(watchedResponse.listings);
            } catch (loadError) {
                setAlertsError(loadError instanceof Error ? loadError.message : 'Unable to load alerts.');
            } finally {
                setLoadingPreferences(false);
            }
        }

        void loadAlerts();
    }, [user?.isEmailVerified]);

    useEffect(() => {
        async function loadListings() {
            if (!user?.isEmailVerified) {
                setLoadingListings(false);
                return;
            }

            setLoadingListings(true);
            setItemsError(null);

            try {
                const response = await getMyListings();
                setListings(response.listings);
            } catch (loadError) {
                setItemsError(loadError instanceof Error ? loadError.message : 'Unable to load your listings.');
            } finally {
                setLoadingListings(false);
            }
        }

        void loadListings();
    }, [user?.isEmailVerified]);

    useEffect(() => {
        async function loadLists() {
            if (!user?.isEmailVerified) {
                setLoadingLists(false);
                return;
            }

            setLoadingLists(true);
            setListsError(null);

            try {
                const response = await getLists();
                setLists(response.lists);
                const requestedId = requestedListId;
                const defaultId = response.lists[0]?.id ?? null;
                const nextSelectedId = response.lists.some((list) => list.id === requestedId)
                    ? requestedId
                    : defaultId;

                setSelectedListId(nextSelectedId);
            } catch (loadError) {
                setListsError(loadError instanceof Error ? loadError.message : 'Unable to load your lists.');
            } finally {
                setLoadingLists(false);
            }
        }

        void loadLists();
    }, [requestedListId, user?.isEmailVerified]);

    useEffect(() => {
        if (activeSection !== 'lists' || loadingLists) {
            return;
        }

        const validRequestedList = requestedListId && lists.some((list) => list.id === requestedListId);
        const fallbackListId = lists[0]?.id ?? null;
        const nextListId = validRequestedList ? requestedListId : fallbackListId;

        setSelectedListId(nextListId);

        if (nextListId === requestedListId) {
            return;
        }

        const next = new URLSearchParams(searchParams);
        if (nextListId) {
            next.set('list', nextListId);
        } else {
            next.delete('list');
        }
        setSearchParams(next, { replace: true });
    }, [activeSection, lists, loadingLists, requestedListId, searchParams, setSearchParams]);

    const selectedList = useMemo(
        () => lists.find((list) => list.id === selectedListId) ?? null,
        [lists, selectedListId]
    );

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    const email = user?.email ?? 'Unknown user';

    function setSection(section: ProfileSection) {
        const next = new URLSearchParams(searchParams);
        next.set('section', section);
        if (section !== 'lists') {
            next.delete('list');
        } else if (!next.get('list') && lists[0]?.id) {
            next.set('list', lists[0].id);
        }
        setSearchParams(next, { replace: true });
    }

    function selectList(listId: string) {
        const next = new URLSearchParams(searchParams);
        next.set('section', 'lists');
        next.set('list', listId);
        setSearchParams(next, { replace: true });
    }

    function handleCategoryToggle(category: string) {
        setSelectedCategories((current) =>
            current.includes(category)
                ? current.filter((item) => item !== category)
                : [...current, category]
        );
    }

    function upsertList(nextList: ItemList) {
        setLists((current) => {
            const exists = current.some((list) => list.id === nextList.id);
            if (!exists) {
                return [nextList, ...current];
            }
            return current.map((list) => (list.id === nextList.id ? nextList : list));
        });
    }

    function openCreateListModal() {
        setEditingListId(null);
        setListForm(EMPTY_LIST_FORM);
        setListsError(null);
        setListsStatus(null);
        setIsListModalOpen(true);
    }

    function openEditListModal(list: ItemList) {
        setEditingListId(list.id);
        setListForm({ name: list.name, description: list.description });
        setListsError(null);
        setListsStatus(null);
        setIsListModalOpen(true);
    }

    function closeListModal() {
        if (listSubmitting) {
            return;
        }

        setIsListModalOpen(false);
        setEditingListId(null);
        setListForm(EMPTY_LIST_FORM);
    }

    function closeAlertModal() {
        if (alertSubmitting) {
            return;
        }

        setIsAlertModalOpen(false);
        setKeywords('');
        setSelectedCategories([]);
    }

    function closeProfileModal() {
        if (profileSubmitting) {
            return;
        }

        setIsProfileModalOpen(false);
        setProfileDisplayName(user?.displayName ?? '');
        setProfilePhone(user?.phoneNumber ?? '');
        setProfileVenmo(user?.venmoUsername ?? '');
    }

    async function handleSaveProfile(event: FormEvent) {
        event.preventDefault();
        setProfileSubmitting(true);
        setProfileError(null);
        setProfileStatus(null);

        try {
            const response = await updateProfile({
                displayName: profileDisplayName.trim() || null,
                phoneNumber: profilePhone.trim() || null,
                venmoUsername: profileVenmo.trim() || null
            });
            setUser(response.user);
            setProfileStatus('Contact info saved.');
            setIsProfileModalOpen(false);
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Unable to save contact info.');
        } finally {
            setProfileSubmitting(false);
        }
    }

    async function handleCreateAlert(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAlertSubmitting(true);
        setAlertsError(null);
        setAlertsStatus(null);

        try {
            const parsedKeywords = keywords
                .split(',')
                .map((keyword) => keyword.trim())
                .filter(Boolean);

            const response = await createNotificationPreference({
                keywords: parsedKeywords,
                categories: selectedCategories
            });

            setPreferences((current) => [response.preference, ...current]);
            setAlertsStatus('Notification preference saved.');
            closeAlertModal();
        } catch (submitError) {
            setAlertsError(submitError instanceof Error ? submitError.message : 'Unable to save notification preference.');
        } finally {
            setAlertSubmitting(false);
        }
    }

    async function handleDeletePreference(preferenceId: string) {
        setPendingAlertDeleteId(preferenceId);
        setAlertsError(null);
        setAlertsStatus(null);

        try {
            await deleteNotificationPreference(preferenceId);
            setPreferences((current) => current.filter((preference) => preference.id !== preferenceId));
            setAlertsStatus('Notification preference removed.');
        } catch (deleteError) {
            setAlertsError(deleteError instanceof Error ? deleteError.message : 'Unable to delete notification preference.');
        } finally {
            setPendingAlertDeleteId(null);
        }
    }

    async function handleDeleteWatch(listingId: string) {
        setPendingWatchDeleteId(listingId);
        setAlertsError(null);
        setAlertsStatus(null);

        try {
            await deleteListingWatch(listingId);
            setWatchedListings((current) => current.filter((item) => item.id !== listingId));
            setAlertsStatus('Watched item removed.');
        } catch (deleteError) {
            setAlertsError(deleteError instanceof Error ? deleteError.message : 'Unable to stop watching this item.');
        } finally {
            setPendingWatchDeleteId(null);
        }
    }

    async function handleDeleteListing(listingId: string) {
        const confirmed = window.confirm('Delete this listing? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        setPendingListingDeleteId(listingId);
        setItemsError(null);

        try {
            await deleteListing(listingId);
            setListings((current) => current.filter((listing) => listing.id !== listingId));
        } catch (deleteError) {
            setItemsError(deleteError instanceof Error ? deleteError.message : 'Unable to delete listing.');
        } finally {
            setPendingListingDeleteId(null);
        }
    }

    async function handleSubmitList(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setListSubmitting(true);
        setListsError(null);
        setListsStatus(null);

        try {
            if (!editingListId) {
                const response = await createList(listForm);
                upsertList(response.list);
                setSelectedListId(response.list.id);
                setListsStatus('List created.');
                closeListModal();
                return;
            }

            const response = await updateList(editingListId, listForm);
            upsertList(response.list);
            setSelectedListId(response.list.id);
            setListsStatus('List updated.');
            closeListModal();
        } catch (submitError) {
            setListsError(submitError instanceof Error ? submitError.message : 'Unable to save your list.');
        } finally {
            setListSubmitting(false);
        }
    }

    async function handleDeleteList(listId: string) {
        const confirmed = window.confirm('Delete this list? Its saved items will be removed from the list.');
        if (!confirmed) {
            return;
        }

        setPendingListDeleteId(listId);
        setListsError(null);
        setListsStatus(null);

        try {
            await deleteList(listId);
            setLists((current) => current.filter((list) => list.id !== listId));
            setSelectedListId((current) => (current === listId ? null : current));
            setListsStatus('List deleted.');
        } catch (deleteError) {
            setListsError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this list.');
        } finally {
            setPendingListDeleteId(null);
        }
    }

    async function handleRemoveItem(listId: string, listingId: string) {
        setPendingListRemoveId(listingId);
        setListsError(null);
        setListsStatus(null);

        try {
            const response = await removeItemFromList(listId, listingId);
            upsertList(response.list);
            setListsStatus('Item removed from list.');
        } catch (removeError) {
            setListsError(removeError instanceof Error ? removeError.message : 'Unable to remove that item from the list.');
        } finally {
            setPendingListRemoveId(null);
        }
    }

    async function handleLogout() {
        setLogoutSubmitting(true);
        setProfileError(null);
        setProfileStatus(null);

        try {
            await logout();
            setUser(null);
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Unable to log out.');
        } finally {
            setLogoutSubmitting(false);
        }
    }

    async function handleDeleteAccount() {
        const confirmed = window.confirm('Delete your account permanently? This will remove your listings, alerts, watches, lists, and conversations.');
        if (!confirmed) {
            return;
        }

        setDeleteSubmitting(true);
        setProfileError(null);
        setProfileStatus(null);

        try {
            await deleteAccount();
            setUser(null);
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Unable to delete account.');
        } finally {
            setDeleteSubmitting(false);
        }
    }

    function getDaysUntilExpiry(expiresAt: string): number {
        return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    const expiredListings = listings.filter((l) => l.expiresAt && getDaysUntilExpiry(l.expiresAt) <= 0);
    const activeListings = listings.filter((l) => !l.expiresAt || getDaysUntilExpiry(l.expiresAt) > 0);

    async function handleExtendListing(listingId: string) {
        const days = extensionDaysMap[listingId] ?? 30;
        setPendingListingExtendId(listingId);
        setItemsError(null);
        try {
            const response = await extendListing(listingId, days);
            setListings((current) =>
                current.map((l) => (l.id === listingId ? response.listing : l))
            );
        } catch (err) {
            setItemsError(err instanceof Error ? err.message : 'Unable to extend listing.');
        } finally {
            setPendingListingExtendId(null);
        }
    }

    async function handleDeleteListingWithRedirect(listingId: string, donateRedirect: boolean) {
        setPendingListingDeleteId(listingId);
        setItemsError(null);
        try {
            await deleteListing(listingId);
            setListings((current) => current.filter((l) => l.id !== listingId));
            if (donateRedirect) {
                window.location.href = '/hoos-reuse';
            }
        } catch (deleteError) {
            setItemsError(deleteError instanceof Error ? deleteError.message : 'Unable to delete listing.');
        } finally {
            setPendingListingDeleteId(null);
        }
    }

    return (
        <main className="page-content">
            <div className="page-container profile-workspace">
                <aside className="profile-sidebar-shell" aria-label="Profile navigation">
                    <div className="card profile-sidebar-card">
                        <div className="profile-header profile-sidebar-header">
                            <div className="profile-avatar" aria-hidden="true">{getInitial(user?.displayName ?? user?.email)}</div>
                            <div className="profile-info">
                                <h1 className="profile-name">{user?.displayName || email.split('@')[0]}</h1>
                                <p className="profile-email-sub">{email}</p>
                            </div>
                        </div>

                        <nav className="profile-section-nav">
                            {SECTION_OPTIONS.map((section) => (
                                <Fragment key={section.id}>
                                    <button
                                        className={`profile-section-link ${activeSection === section.id ? 'profile-section-link-active' : ''}`}
                                        type="button"
                                        onClick={() => setSection(section.id)}
                                    >
                                        <span className="profile-section-link-label">{section.label}</span>
                                        <span className="profile-section-link-description">{section.description}</span>
                                    </button>
                                    {section.id === 'lists' && activeSection === 'lists' ? (
                                        <div className="profile-section-subnav" aria-label="Your saved lists">
                                            {loadingLists ? (
                                                <span className="profile-section-subnav-note">Loading lists...</span>
                                            ) : !lists.length ? (
                                                <>
                                                    <button
                                                        className="profile-section-sublink profile-section-sublink-create"
                                                        type="button"
                                                        onClick={openCreateListModal}
                                                    >
                                                        <span className="profile-section-sublink-label">+ New List...</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {lists.map((list) => (
                                                        <button
                                                            key={list.id}
                                                            className={`profile-section-sublink ${selectedListId === list.id ? 'profile-section-sublink-active' : ''}`}
                                                            type="button"
                                                            onClick={() => selectList(list.id)}
                                                        >
                                                            <span className="profile-section-sublink-label">{list.name}</span>
                                                            <span className="profile-section-sublink-count">{list.items.length}</span>
                                                        </button>
                                                    ))}
                                                    <button
                                                        className="profile-section-sublink profile-section-sublink-create"
                                                        type="button"
                                                        onClick={openCreateListModal}
                                                    >
                                                        <span className="profile-section-sublink-label">+ New List...</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : null}
                                </Fragment>
                            ))}
                        </nav>

                        <div className="profile-sidebar-actions">
                            <button
                                className="button button-secondary profile-sidebar-button"
                                type="button"
                                onClick={() => {
                                    void handleLogout();
                                }}
                                disabled={logoutSubmitting}
                            >
                                {logoutSubmitting ? 'Logging Out...' : 'Log Out'}
                            </button>
                            <button
                                className="button lists-danger-button profile-sidebar-button"
                                type="button"
                                onClick={() => {
                                    void handleDeleteAccount();
                                }}
                                disabled={deleteSubmitting}
                            >
                                {deleteSubmitting ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </div>
                </aside>

                <section className="profile-content-area">
                    {activeSection === 'general' ? (
                        <section className="card profile-panel-card" aria-label="General profile information">
                            <div className="profile-panel-header">
                                <div>
                                    <h2 className="card-title">General Profile</h2>
                                    <p className="card-subtitle">
                                        Keep your contact details current so buyers and sellers can reach you once a conversation starts.
                                    </p>
                                </div>
                                <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() => {
                                        setProfileError(null);
                                        setProfileStatus(null);
                                        setIsProfileModalOpen(true);
                                    }}
                                >
                                    Edit Profile
                                </button>
                            </div>

                            <div className="profile-overview-grid">
                                <div className="profile-overview-item">
                                    <span className="profile-overview-label">Email</span>
                                    <span className="profile-overview-value">{email}</span>
                                </div>
                                <div className="profile-overview-item">
                                    <span className="profile-overview-label">Phone</span>
                                    <span className="profile-overview-value">{user?.phoneNumber || 'Not provided'}</span>
                                </div>
                                <div className="profile-overview-item">
                                    <span className="profile-overview-label">Venmo</span>
                                    <span className="profile-overview-value">{user?.venmoUsername ? `@${user.venmoUsername}` : 'Not provided'}</span>
                                </div>
                                <div className="profile-overview-item">
                                    <span className="profile-overview-label">Display Name</span>
                                    <span className="profile-overview-value">{user?.displayName || 'Not provided'}</span>
                                </div>
                            </div>

                            {profileStatus ? <p className="status status-success">{profileStatus}</p> : null}
                            {profileError ? <p className="status status-error">{profileError}</p> : null}
                        </section>
                    ) : null}

                    {activeSection === 'items' ? (
                        <section className="profile-section-stack" aria-label="My items">
                            <div className="profile-panel-topbar">
                                <div>
                                    <h2 className="card-title">My Items</h2>
                                    <p className="card-subtitle">Manage the items you have listed for other UVA students.</p>
                                </div>
                            </div>

                            {loadingListings ? <p className="loading-spinner">Loading your items...</p> : null}
                            {itemsError ? <p className="status status-error">{itemsError}</p> : null}

                            {!loadingListings && !itemsError && !listings.length ? (
                                <div className="card profile-panel-card empty-state my-items-empty-state">
                                    <h2 className="empty-state-title">You have not listed anything yet</h2>
                                    <p className="empty-state-body">
                                        Start with one item, then come back here anytime to edit or remove it.
                                    </p>
                                </div>
                            ) : null}

                            {/* ── Needs Attention: expired listings ── */}
                            {!loadingListings && expiredListings.length > 0 ? (
                                <div className="myitems-expired-section">
                                    <div className="myitems-expired-heading">
                                        <span>⏰</span>
                                        <h3 className="myitems-expired-title">
                                            Needs Attention ({expiredListings.length} expired)
                                        </h3>
                                    </div>
                                    <p className="myitems-expired-subtitle">
                                        These listings are no longer visible to other students. Relist or remove them.
                                    </p>

                                    <div className="listing-grid">
                                        {expiredListings.map((listing) => (
                                            <article className="listing-card myitems-expired-card" key={listing.id}>
                                                {listing.imageUrl ? (
                                                    <div className="listing-image-frame">
                                                        <img className="listing-image" src={listing.imageUrl} alt={listing.name} />
                                                    </div>
                                                ) : (
                                                    <div className="listing-image-placeholder">No image</div>
                                                )}

                                                <div className="listing-header">
                                                    <h3 className="listing-title">{listing.name}</h3>
                                                    <p className="listing-price">${listing.price.toFixed(2)}</p>
                                                </div>

                                                <span className="listing-expiry-chip listing-expiry-chip--expired" style={{ margin: '0 0.75rem 0.5rem' }}>
                                                    ⏰ Expired {listing.expiresAt ? formatDate(listing.expiresAt) : ''}
                                                </span>

                                                {/* Relist picker */}
                                                <div className="myitems-relist-block">
                                                    <p className="myitems-relist-label">Relist for:</p>
                                                    <div className="myitems-relist-days">
                                                        {[15, 30, 60].map((days) => (
                                                            <label
                                                                key={days}
                                                                className={`myitems-day-option${(extensionDaysMap[listing.id] ?? 30) === days ? ' myitems-day-option--selected' : ''}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`ext-${listing.id}`}
                                                                    value={days}
                                                                    checked={(extensionDaysMap[listing.id] ?? 30) === days}
                                                                    onChange={() => setExtensionDaysMap((m) => ({ ...m, [listing.id]: days }))}
                                                                    style={{ display: 'none' }}
                                                                    disabled={pendingListingExtendId === listing.id || pendingListingDeleteId === listing.id}
                                                                />
                                                                {days}d
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <button
                                                        className="button button-accent myitems-relist-btn"
                                                        type="button"
                                                        onClick={() => { void handleExtendListing(listing.id); }}
                                                        disabled={pendingListingExtendId === listing.id || pendingListingDeleteId === listing.id}
                                                    >
                                                        {pendingListingExtendId === listing.id ? 'Relisting…' : 'Relist'}
                                                    </button>
                                                </div>

                                                {/* Delete options */}
                                                <div className="myitems-delete-row">
                                                    <button
                                                        className="button myitems-donate-btn"
                                                        type="button"
                                                        onClick={() => { void handleDeleteListingWithRedirect(listing.id, true); }}
                                                        disabled={pendingListingDeleteId === listing.id || pendingListingExtendId === listing.id}
                                                    >
                                                        ♻️ Delete & Donate
                                                    </button>
                                                    <button
                                                        className="button button-secondary myitems-delete-only-btn"
                                                        type="button"
                                                        onClick={() => { void handleDeleteListingWithRedirect(listing.id, false); }}
                                                        disabled={pendingListingDeleteId === listing.id || pendingListingExtendId === listing.id}
                                                    >
                                                        {pendingListingDeleteId === listing.id ? 'Deleting…' : 'Delete Only'}
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {/* ── Active listings ── */}
                            {!loadingListings && activeListings.length > 0 ? (
                                <>
                                    {expiredListings.length > 0 ? (
                                        <h3 className="myitems-active-heading">Active Listings</h3>
                                    ) : null}
                                    <div className="listing-grid" aria-label="Your uploaded items">
                                        {activeListings.map((listing) => (
                                            <article className="listing-card" key={listing.id}>
                                                {listing.imageUrl ? (
                                                    <div className="listing-image-frame">
                                                        <img className="listing-image" src={listing.imageUrl} alt={listing.name} />
                                                    </div>
                                                ) : (
                                                    <div className="listing-image-placeholder">No image</div>
                                                )}

                                                <div className="listing-header">
                                                    <h3 className="listing-title">{listing.name}</h3>
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
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                                        <span className="listing-date">{formatDate(listing.createdAt)}</span>
                                                        {listing.expiresAt ? (() => {
                                                            const days = getDaysUntilExpiry(listing.expiresAt);
                                                            if (days <= 5) return (
                                                                <span className="listing-expiry-chip listing-expiry-chip--soon">⚠️ {days}d left</span>
                                                            );
                                                            return (
                                                                <span className="listing-expiry-chip listing-expiry-chip--ok">⏳ {days}d left</span>
                                                            );
                                                        })() : null}
                                                    </div>
                                                </div>

                                                <div className="listing-actions">
                                                    <Link className="button button-secondary listing-action-button" to={`/listings/${listing.id}/edit`}>
                                                        Edit
                                                    </Link>
                                                    <button
                                                        className="button listing-action-button listing-delete-button"
                                                        type="button"
                                                        onClick={() => {
                                                            void handleDeleteListing(listing.id);
                                                        }}
                                                        disabled={pendingListingDeleteId === listing.id}
                                                    >
                                                        {pendingListingDeleteId === listing.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </section>
                    ) : null}

                    {activeSection === 'lists' ? (
                        <section className="profile-section-stack" aria-label="Lists section">
                            <div className="profile-panel-topbar">
                                <div>
                                    <h2 className="card-title">Lists</h2>
                                    <p className="card-subtitle">Build themed collections like Dorm Room, First Apartment, or Lab Essentials.</p>
                                </div>
                            </div>

                            {listsError ? <p className="status status-error">{listsError}</p> : null}
                            {listsStatus ? <p className="status status-success">{listsStatus}</p> : null}
                            {loadingLists ? <p className="loading-spinner">Loading your lists...</p> : null}

                            {!loadingLists ? (
                                <div className="lists-detail-panel profile-lists-panel">
                                    <div className="lists-detail-header profile-section-header-row">
                                        <div>
                                            <h2 className="section-heading">{selectedList ? selectedList.name : ''}</h2>
                                            <p className="card-subtitle">
                                                {selectedList
                                                    ? selectedList.description || `Updated ${formatDate(selectedList.updatedAt)}`
                                                    : ''}
                                            </p>
                                        </div>

                                        {selectedList ? (
                                            <div className="profile-inline-actions">
                                                <button className="button button-secondary" type="button" onClick={() => openEditListModal(selectedList)}>
                                                    Edit List
                                                </button>
                                                <button
                                                    className="button lists-danger-button"
                                                    type="button"
                                                    onClick={() => {
                                                        void handleDeleteList(selectedList.id);
                                                    }}
                                                    disabled={pendingListDeleteId === selectedList.id}
                                                >
                                                    {pendingListDeleteId === selectedList.id ? 'Deleting...' : 'Delete List'}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>

                                    {!lists.length ? (
                                        <div className="empty-state lists-detail-empty">
                                            <h2 className="empty-state-title">No lists yet</h2>
                                            <p className="empty-state-body">
                                                Click "+ New List" in the sidebar to create one.
                                            </p>
                                        </div>
                                    ) : !selectedList ? (
                                        <div className="empty-state lists-detail-empty">
                                            <h2 className="empty-state-title">Pick a list to inspect it</h2>
                                            <p className="empty-state-body">
                                                Select a list from the left sidebar, then add items from the marketplace on the <Link to="/home">Home</Link> page.
                                            </p>
                                        </div>
                                    ) : !selectedList.items.length ? (
                                        <div className="empty-state lists-detail-empty">
                                            <h2 className="empty-state-title">This list is empty</h2>
                                            <p className="empty-state-body">
                                                Browse the <Link to="/home">marketplace</Link> and use the add-to-list control on any item card.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="listing-grid" aria-label={`${selectedList.name} items`}>
                                            {selectedList.items.map((item) => (
                                                <article className="listing-card" key={`${selectedList.id}-${item.id}`}>
                                                    <Link className="listing-card-link" to={`/listings/${item.id}`}>
                                                        {item.imageUrl ? (
                                                            <div className="listing-image-frame">
                                                                <img className="listing-image" src={item.imageUrl} alt={item.name} />
                                                            </div>
                                                        ) : (
                                                            <div className="listing-image-placeholder">No image</div>
                                                        )}

                                                        <div className="listing-header">
                                                            <h3 className="listing-title">{item.name}</h3>
                                                            <p className="listing-price">${item.price.toFixed(2)}</p>
                                                        </div>

                                                        <p className="listing-description">{item.description}</p>

                                                        <div className="listing-footer">
                                                            <div className="listing-categories">
                                                                {item.categories.map((category) => (
                                                                    <span className="listing-category-chip" key={`${item.id}-${category}`}>
                                                                        {category}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <span className="listing-date">{formatDate(item.createdAt)}</span>
                                                        </div>
                                                    </Link>

                                                    <div className="listing-actions">
                                                        <button
                                                            className="button listing-action-button lists-danger-button"
                                                            type="button"
                                                            onClick={() => {
                                                                void handleRemoveItem(selectedList.id, item.id);
                                                            }}
                                                            disabled={pendingListRemoveId === item.id}
                                                        >
                                                            {pendingListRemoveId === item.id ? 'Removing...' : 'Remove from List'}
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </section>
                    ) : null}

                    {activeSection === 'alerts' ? (
                        <section className="profile-section-stack" aria-label="Alerts section">
                            <div className="profile-panel-topbar profile-alerts-topbar">
                                <div className="profile-alerts-topbar-copy">
                                    <h2 className="card-title">Alerts</h2>
                                    <p className="card-subtitle">Stay ahead of new listings and changes to the items you care about. We will email you when an item is posted that matches your alerts, or when an item you are watching is updated or sold.</p>
                                </div>
                            </div>

                            {alertsError ? <p className="status status-error">{alertsError}</p> : null}
                            {alertsStatus ? <p className="status status-success">{alertsStatus}</p> : null}
                            {loadingPreferences ? <p className="loading-spinner">Loading your alerts...</p> : null}

                            <section className="profile-alerts-panel" aria-label="Saved email alerts">
                                <div className="profile-alerts-header">
                                    <h2 className="section-heading">Saved Alerts</h2>
                                    <button className="button button-secondary" type="button" onClick={() => setIsAlertModalOpen(true)}>
                                        + New Alert
                                    </button>
                                </div>

                                {!loadingPreferences && !preferences.length ? (
                                    <div className="empty-state profile-alerts-empty">
                                        <h2 className="empty-state-title">No alerts yet</h2>
                                        <p className="empty-state-body">
                                            Use Add Alert to save keywords or categories and get notified when a matching item is posted.
                                        </p>
                                    </div>
                                ) : null}

                                {!loadingPreferences && preferences.length ? (
                                    <div className="profile-alerts-list">
                                        {preferences.map((preference) => (
                                            <article className="profile-alert-card" key={preference.id}>
                                                <div className="profile-alert-card-body profile-alert-card-body-stacked">
                                                    <div className="profile-alert-field">
                                                        <span className="profile-alert-field-label">Keywords</span>
                                                        <div className="listing-categories">
                                                            {preference.keywords.length ? preference.keywords.map((keyword) => (
                                                                <span className="listing-category-chip" key={`${preference.id}-kw-${keyword}`}>
                                                                    {keyword}
                                                                </span>
                                                            )) : <span className="profile-alert-empty">Any keyword</span>}
                                                        </div>
                                                    </div>
                                                    <div className="profile-alert-field">
                                                        <span className="profile-alert-field-label">Categories</span>
                                                        <div className="listing-categories">
                                                            {preference.categories.length ? preference.categories.map((category) => (
                                                                <span className="listing-category-chip" key={`${preference.id}-cat-${category}`}>
                                                                    {category}
                                                                </span>
                                                            )) : <span className="profile-alert-empty">Any category</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="button profile-alert-delete-button"
                                                    type="button"
                                                    onClick={() => {
                                                        void handleDeletePreference(preference.id);
                                                    }}
                                                    disabled={pendingAlertDeleteId === preference.id}
                                                >
                                                    {pendingAlertDeleteId === preference.id ? 'Removing...' : 'Delete'}
                                                </button>
                                            </article>
                                        ))}
                                    </div>
                                ) : null}
                            </section>

                            <section className="profile-alerts-panel" aria-label="Watched items">
                                <div className="profile-alerts-header">
                                    <h2 className="section-heading">Watched Items</h2>
                                </div>

                                {!watchedListings.length ? (
                                    <div className="empty-state profile-alerts-empty">
                                        <h2 className="empty-state-title">No watched items</h2>
                                        <p className="empty-state-body">
                                            Open any listing detail page and choose <strong>Email Me About Changes</strong> to follow it.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="profile-alerts-list">
                                        {watchedListings.map((listing) => (
                                            <article className="profile-alert-card profile-watch-card" key={listing.id}>
                                                <div className="profile-alert-card-header">
                                                    <Link className="profile-watch-link" to={`/listings/${listing.id}`}>
                                                        <div className="profile-watch-main">
                                                            {listing.imageUrl ? (
                                                                <img className="profile-watch-thumb" src={listing.imageUrl} alt={listing.name} />
                                                            ) : (
                                                                <div className="profile-watch-thumb-placeholder" aria-hidden="true">No image</div>
                                                            )}
                                                            <div className="profile-watch-copy">
                                                                <h3 className="profile-alert-card-title">{listing.name}</h3>
                                                                <p className="profile-watch-price">${listing.price.toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                    <div className="profile-watch-actions">
                                                        <button
                                                            className="button profile-alert-delete-button"
                                                            type="button"
                                                            onClick={() => {
                                                                void handleDeleteWatch(listing.id);
                                                            }}
                                                            disabled={pendingWatchDeleteId === listing.id}
                                                        >
                                                            {pendingWatchDeleteId === listing.id ? 'Removing...' : 'Stop Watching'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="lists-list-card-body">{listing.description}</p>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </section>
                    ) : null}
                </section>
            </div>

            {isAlertModalOpen ? (
                <div className="profile-modal-backdrop" role="presentation" onClick={closeAlertModal}>
                    <div className="profile-modal-card" role="dialog" aria-modal="true" aria-label="Create alert" onClick={(event) => event.stopPropagation()}>
                        <div className="profile-modal-header">
                            <div>
                                <h2 className="card-title">Create Alert</h2>
                                <p className="card-subtitle">Choose keywords or categories and UVA Thrift will email you when a match is posted.</p>
                            </div>
                        </div>

                        <form className="form-grid" onSubmit={handleCreateAlert}>
                            <label>
                                <span className="sidebar-label">Keywords</span>
                                <input
                                    className="input"
                                    type="text"
                                    value={keywords}
                                    onChange={(event) => setKeywords(event.target.value)}
                                    placeholder="desk lamp, monitor, mini fridge"
                                    disabled={alertSubmitting}
                                />
                            </label>

                            <fieldset className="category-fieldset">
                                <legend className="section-heading">Categories</legend>
                                <div className="category-grid">
                                    {LISTING_CATEGORY_OPTIONS.map((category) => (
                                        <label key={category.value} className="category-option">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(category.value)}
                                                onChange={() => handleCategoryToggle(category.value)}
                                                disabled={alertSubmitting}
                                            />
                                            <span>{category.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="profile-modal-actions">
                                <button className="button button-secondary" type="button" onClick={closeAlertModal} disabled={alertSubmitting}>
                                    Cancel
                                </button>
                                <button className="button button-accent" type="submit" disabled={alertSubmitting}>
                                    {alertSubmitting ? 'Saving...' : 'Save Alert'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {isProfileModalOpen ? (
                <div className="profile-modal-backdrop" role="presentation" onClick={closeProfileModal}>
                    <div className="profile-modal-card" role="dialog" aria-modal="true" aria-label="Edit profile" onClick={(event) => event.stopPropagation()}>
                        <div className="profile-modal-header">
                            <div>
                                <h2 className="card-title">Edit Profile</h2>
                                <p className="card-subtitle">Update the details you want to share once a conversation starts.</p>
                            </div>
                        </div>

                        <form className="form-grid" onSubmit={handleSaveProfile}>
                            <label className="setup-profile-label">
                                <span className="sidebar-label">Display name</span>
                                <input
                                    className="input"
                                    type="text"
                                    value={profileDisplayName}
                                    onChange={(event) => setProfileDisplayName(event.target.value)}
                                    placeholder="e.g. John Doe"
                                    maxLength={100}
                                    disabled={profileSubmitting}
                                />
                            </label>

                            <label className="setup-profile-label">
                                <span className="sidebar-label">Phone number</span>
                                <input
                                    className="input"
                                    type="tel"
                                    value={profilePhone}
                                    onChange={(event) => setProfilePhone(event.target.value)}
                                    placeholder="e.g. 555-867-5309"
                                    maxLength={30}
                                    disabled={profileSubmitting}
                                />
                            </label>

                            <label className="setup-profile-label">
                                <span className="sidebar-label">Venmo username</span>
                                <div className="setup-profile-venmo-row">
                                    <span className="setup-profile-at">@</span>
                                    <input
                                        className="input"
                                        type="text"
                                        value={profileVenmo}
                                        onChange={(event) => setProfileVenmo(event.target.value)}
                                        placeholder="your-venmo"
                                        maxLength={50}
                                        disabled={profileSubmitting}
                                    />
                                </div>
                            </label>Use the New List button above to create one, then save items from the marketplace into it.

                            <div className="profile-modal-actions">
                                <button className="button button-secondary" type="button" onClick={closeProfileModal} disabled={profileSubmitting}>
                                    Cancel
                                </button>
                                <button className="button button-accent" type="submit" disabled={profileSubmitting}>
                                    {profileSubmitting ? 'Saving...' : 'Save Contact Info'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {isListModalOpen ? (
                <div className="profile-modal-backdrop" role="presentation" onClick={closeListModal}>
                    <div className="profile-modal-card" role="dialog" aria-modal="true" aria-label={editingListId ? 'Edit list' : 'Create list'} onClick={(event) => event.stopPropagation()}>
                        <div className="profile-modal-header">
                            <div>
                                <h2 className="card-title">{editingListId ? 'Edit List' : 'Create a List'}</h2>
                                <p className="card-subtitle">Name the list clearly so you can recognize it when saving items from the marketplace.</p>
                            </div>
                        </div>

                        <form className="form-grid" onSubmit={handleSubmitList}>
                            <label>
                                <span className="sidebar-label">Name</span>
                                <input
                                    className="input"
                                    type="text"
                                    maxLength={120}
                                    value={listForm.name}
                                    onChange={(event) => setListForm((current) => ({ ...current, name: event.target.value }))}
                                    placeholder="Dorm Room"
                                    required
                                    disabled={listSubmitting}
                                />
                            </label>

                            <label>
                                <span className="sidebar-label">Description</span>
                                <textarea
                                    className="input"
                                    rows={4}
                                    maxLength={1000}
                                    value={listForm.description}
                                    onChange={(event) => setListForm((current) => ({ ...current, description: event.target.value }))}
                                    placeholder="Desk lamp, bedding, storage bins, and other first-semester essentials."
                                    disabled={listSubmitting}
                                />
                            </label>

                            <div className="profile-modal-actions">
                                <button className="button button-secondary" type="button" onClick={closeListModal} disabled={listSubmitting}>
                                    Cancel
                                </button>
                                <button className="button button-accent" type="submit" disabled={listSubmitting}>
                                    {listSubmitting ? 'Saving...' : editingListId ? 'Save Changes' : 'Create List'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
