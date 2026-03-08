import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function getInitial(email: string | undefined): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
}

export function ProfilePage() {
    const { user, loading } = useAuth();

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    const email = user?.email ?? 'Unknown user';

    return (
        <main className="page page-content">
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
            </ul>
        </section>
        </main>
    );
}
