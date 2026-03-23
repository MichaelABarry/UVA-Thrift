import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LISTING_CATEGORY_OPTIONS } from '../constants/listingCategories';
import { useAuth } from '../hooks/useAuth';
import {
    createNotificationPreference,
    deleteNotificationPreference,
    getNotificationPreferences
} from '../services/notificationPreferenceService';
import type { NotificationPreference } from '../types/notificationPreference';

function getInitial(email: string | undefined): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
}

export function ProfilePage() {
    const { user, loading } = useAuth();
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [keywords, setKeywords] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [loadingPreferences, setLoadingPreferences] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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
                            <span className="profile-detail-value">{preferences.length}</span>
                        </li>
                    </ul>
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
                                <div className="empty-state-icon">🔔</div>
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
                </section>
            </div>
        </main>
    );
}
