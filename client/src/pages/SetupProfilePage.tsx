import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../services/authService';

export function SetupProfilePage() {
    const { user, loading, setUser } = useAuth();
    const navigate = useNavigate();

    const [displayName, setDisplayName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [venmoUsername, setVenmoUsername] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await updateProfile({
                displayName:   displayName.trim()   || null,
                phoneNumber:   phoneNumber.trim()   || null,
                venmoUsername: venmoUsername.trim() || null
            });
            setUser(response.user);
            void navigate('/home', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save profile.');
        } finally {
            setSubmitting(false);
        }
    }

    function handleSkip() {
        void navigate('/home', { replace: true });
    }

    return (
        <main className="page">
            <section className="card setup-profile-card" aria-label="Profile setup">
                <div className="auth-brand">
                    <h1 className="auth-brand-title">UVA&nbsp;<span className="auth-brand-accent">Thrift</span></h1>
                </div>

                <h2 className="card-title">Set up your profile</h2>
                <p className="card-subtitle">
                    These are optional and help sellers and buyers connect. You can update them anytime from your profile.
                </p>

                {error ? <p className="status status-error">{error}</p> : null}

                <form className="form-grid" onSubmit={handleSave}>
                    <label className="setup-profile-label">
                        <span className="sidebar-label">Display name</span>
                        <input
                            className="input"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. John Doe"
                            maxLength={100}
                            disabled={submitting}
                        />
                    </label>

                    <label className="setup-profile-label">
                        <span className="sidebar-label">Phone number</span>
                        <input
                            className="input"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="e.g. 555-867-5309"
                            maxLength={30}
                            disabled={submitting}
                        />
                    </label>

                    <label className="setup-profile-label">
                        <span className="sidebar-label">Venmo username</span>
                        <div className="setup-profile-venmo-row">
                            <span className="setup-profile-at">@</span>
                            <input
                                className="input"
                                type="text"
                                value={venmoUsername}
                                onChange={(e) => setVenmoUsername(e.target.value)}
                                placeholder="your-venmo"
                                maxLength={50}
                                disabled={submitting}
                            />
                        </div>
                    </label>

                    <div className="setup-profile-actions">
                        <button
                            className="button button-accent"
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : 'Save & Continue'}
                        </button>
                        <button
                            className="button button-secondary"
                            type="button"
                            onClick={handleSkip}
                            disabled={submitting}
                        >
                            Skip for now
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
