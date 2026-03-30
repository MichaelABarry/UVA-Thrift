import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LISTING_CATEGORY_OPTIONS } from '../constants/listingCategories';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../services/authService';
import { deleteListingWatch, getWatchedListings } from '../services/listingWatchService';
import {
    createNotificationPreference,
    deleteNotificationPreference,
    getNotificationPreferences
} from '../services/notificationPreferenceService';
import type { NotificationPreference } from '../types/notificationPreference';
import type { Listing } from '../types/listing';

function getInitial(email: string | undefined): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
}

export function ProfilePage() {
    const { user, loading, setUser } = useAuth();
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [watchedListings, setWatchedListings] = useState<Listing[]>([]);
    const [keywords, setKeywords] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [profileDisplayName, setProfileDisplayName] = useState(user?.displayName ?? '');
    const [profilePhone, setProfilePhone] = useState(user?.phoneNumber ?? '');
    const [profileVenmo, setProfileVenmo] = useState(user?.venmoUsername ?? '');
    const [profileSubmitting, setProfileSubmitting] = useState(false);
    const [profileStatus, setProfileStatus] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [loadingPreferences, setLoadingPreferences] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [pendingWatchDeleteId, setPendingWatchDeleteId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadPreferences() {
            if (!user?.isEmailVerified) {
                setLoadingPreferences(false);
                return;
            }

            setLoadingPreferences(true);
            setError(null);

            try {
                const response = await getNotificationPreferences();
                setPreferences(response.preferences);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load notification preferences.');
            } finally {
                setLoadingPreferences(false);
            }
        }

        void loadPreferences();
    }, [user?.isEmailVerified]);

    useEffect(() => {
        async function loadWatchedListings() {
            if (!user?.isEmailVerified) {
                return;
            }

            try {
                const response = await getWatchedListings();
                setWatchedListings(response.listings);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load watched items.');
            }
        }

        void loadWatchedListings();
    }, [user?.isEmailVerified]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    const email = user?.email ?? 'Unknown user';

    function handleCategoryToggle(category: string) {
        setSelectedCategories((current) =>
            current.includes(category)
                ? current.filter((item) => item !== category)
                : [...current, category]
        );
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setProfileSubmitting(true);
        setProfileError(null);
        setProfileStatus(null);

        try {
            const response = await updateProfile({
                displayName:   profileDisplayName.trim()   || null,
                phoneNumber:   profilePhone.trim()         || null,
                venmoUsername: profileVenmo.trim()         || null
            });
            setUser(response.user);
            setProfileStatus('Contact info saved.');
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Unable to save contact info.');
        } finally {
            setProfileSubmitting(false);
        }
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setStatusMessage(null);

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
            setKeywords('');
            setSelectedCategories([]);
            setStatusMessage('Notification preference saved.');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to save notification preference.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeletePreference(preferenceId: string) {
        setPendingDeleteId(preferenceId);
        setError(null);
        setStatusMessage(null);

        try {
            await deleteNotificationPreference(preferenceId);
            setPreferences((current) => current.filter((preference) => preference.id !== preferenceId));
            setStatusMessage('Notification preference removed.');
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete notification preference.');
        } finally {
            setPendingDeleteId(null);
        }
    }

    return (
        <main className="page-content">
            <div className="page-container profile-layout">
                <section className="card profile-card" aria-label="Profile page">
                    <div className="profile-header">
                        <div className="profile-avatar" aria-hidden="true">{getInitial(user?.email)}</div>
                        <div className="profile-info">
                            <h1 className="profile-name">{email.split('@')[0]}</h1>
                            <p className="profile-email-sub">{email}</p>
                        </div>
                    </div>

                    <ul className="profile-detail-list">
                        <li className="profile-detail-item">
                            <span className="profile-detail-label">Email verified</span>
                            <span className="profile-detail-value">{user?.isEmailVerified ? 'Yes' : 'No'}</span>
                        </li>
                        <li className="profile-detail-item">
                            <span className="profile-detail-label">Platform</span>
                            <span className="profile-detail-value">UVA Thrift</span>
                        </li>
                        <li className="profile-detail-item">
                            <span className="profile-detail-label">Saved alerts</span>
                            <span className="profile-detail-value">{preferences.length + watchedListings.length}</span>
                        </li>
                    </ul>

                    <hr className="profile-divider" />

                    <h2 className="section-heading">Contact Info</h2>
                    <p className="profile-contact-hint">
                        Shared privately with the other party once you start a conversation.
                    </p>

                    {profileStatus ? <p className="status status-success">{profileStatus}</p> : null}
                    {profileError  ? <p className="status status-error">{profileError}</p>   : null}

                    <form className="form-grid" onSubmit={handleSaveProfile}>
                        <label className="setup-profile-label">
                            <span className="sidebar-label">Display name</span>
                            <input
                                className="input"
                                type="text"
                                value={profileDisplayName}
                                onChange={(e) => setProfileDisplayName(e.target.value)}
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
                                onChange={(e) => setProfilePhone(e.target.value)}
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
                                    onChange={(e) => setProfileVenmo(e.target.value)}
                                    placeholder="your-venmo"
                                    maxLength={50}
                                    disabled={profileSubmitting}
                                />
                            </div>
                        </label>

                        <button
                            className="button button-accent"
                            type="submit"
                            disabled={profileSubmitting}
                        >
                            {profileSubmitting ? 'Saving...' : 'Save Contact Info'}
                        </button>
                    </form>
                </section>

                <section className="profile-notification-section">
                    <div className="card card-wide profile-notification-card">
                        <h2 className="card-title">Listing Email Alerts</h2>
                        <p className="card-subtitle">
                            Save keywords or categories and UVA Thrift will email you when a matching item is posted.
                        </p>

                        <form className="form-grid" onSubmit={handleSubmit}>
                            <label>
                                <span className="sidebar-label">Keywords</span>
                                <input
                                    className="input"
                                    type="text"
                                    value={keywords}
                                    onChange={(event) => setKeywords(event.target.value)}
                                    placeholder="desk lamp, monitor, mini fridge"
                                    disabled={submitting}
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
                                                disabled={submitting}
                                            />
                                            <span>{category.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <button className="button button-accent" type="submit" disabled={submitting}>
                                {submitting ? 'Saving...' : 'Save Alert'}
                            </button>
                        </form>

                        {error ? <p className="status status-error">{error}</p> : null}
                        {statusMessage ? <p className="status status-success">{statusMessage}</p> : null}
                    </div>

                    <section className="profile-alerts-panel" aria-label="Saved email alerts">
                        <div className="profile-alerts-header">
                            <h2 className="section-heading">Saved Alerts</h2>
                        </div>

                        {loadingPreferences ? <p className="loading-spinner">Loading your alerts...</p> : null}

                        {!loadingPreferences && !preferences.length ? (
                            <div className="empty-state profile-alerts-empty">
                                <h2 className="empty-state-title">No alerts yet</h2>
                                <p className="empty-state-body">
                                    Add a few keywords or categories above to start receiving email notifications.
                                </p>
                            </div>
                        ) : null}

                        {!loadingPreferences && preferences.length ? (
                            <div className="profile-alerts-list">
                                {preferences.map((preference) => (
                                    <article className="profile-alert-card" key={preference.id}>
                                        <div className="profile-alert-card-header">
                                            <h3 className="profile-alert-card-title">Saved alert</h3>
                                            <button
                                                className="button profile-alert-delete-button"
                                                type="button"
                                                onClick={() => handleDeletePreference(preference.id)}
                                                disabled={pendingDeleteId === preference.id}
                                            >
                                                {pendingDeleteId === preference.id ? 'Removing...' : 'Delete'}
                                            </button>
                                        </div>

                                        <div className="profile-alert-group">
                                            <span className="profile-alert-label">Keywords</span>
                                            <div className="listing-categories">
                                                {preference.keywords.length ? preference.keywords.map((keyword) => (
                                                    <span className="listing-category-chip" key={`${preference.id}-${keyword}`}>
                                                        {keyword}
                                                    </span>
                                                )) : <span className="profile-alert-empty">None</span>}
                                            </div>
                                        </div>

                                        <div className="profile-alert-group">
                                            <span className="profile-alert-label">Categories</span>
                                            <div className="listing-categories">
                                                {preference.categories.length ? preference.categories.map((category) => (
                                                    <span className="listing-category-chip" key={`${preference.id}-${category}`}>
                                                        {category}
                                                    </span>
                                                )) : <span className="profile-alert-empty">None</span>}
                                            </div>
                                        </div>
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
                                    <article className="profile-alert-card" key={listing.id}>
                                        <div className="profile-alert-card-header">
                                            <div>
                                                <h3 className="profile-alert-card-title">{listing.name}</h3>
                                                <p className="profile-watch-price">${listing.price.toFixed(2)}</p>
                                            </div>
                                            <div className="profile-watch-actions">
                                                <button
                                                    className="button profile-alert-delete-button"
                                                    type="button"
                                                    onClick={async () => {
                                                        setPendingWatchDeleteId(listing.id);
                                                        setError(null);
                                                        setStatusMessage(null);

                                                        try {
                                                            await deleteListingWatch(listing.id);
                                                            setWatchedListings((current) => current.filter((item) => item.id !== listing.id));
                                                            setStatusMessage('Watched item removed.');
                                                        } catch (deleteError) {
                                                            setError(deleteError instanceof Error ? deleteError.message : 'Unable to stop watching this item.');
                                                        } finally {
                                                            setPendingWatchDeleteId(null);
                                                        }
                                                    }}
                                                    disabled={pendingWatchDeleteId === listing.id}
                                                >
                                                    {pendingWatchDeleteId === listing.id ? 'Removing...' : 'Stop Watching'}
                                                </button>
                                            </div>
                                        </div>

                                        <p className="lists-list-card-body">{listing.description}</p>
                                        <div className="listing-categories">
                                            {listing.categories.map((category) => (
                                                <span className="listing-category-chip" key={`${listing.id}-${category}`}>
                                                    {category}
                                                </span>
                                            ))}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </section>
            </div>
        </main>
    );
}
