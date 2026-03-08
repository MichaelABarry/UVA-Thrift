import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
    const { user, loading } = useAuth();

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page page-content">
        <section className="card" aria-label="Profile page">
            <h1 className="card-title">UVA Thrift Profile</h1>
            <p className="profile-email">Signed in as: {user?.email ?? 'Unknown user'}</p>
            <p className="profile-message">This is your profile page.</p>
        </section>
        </main>
    );
}
