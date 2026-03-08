import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function HomePage() {
    const { user, loading } = useAuth();

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page page-content">
            <section className="card" aria-label="Home page">
                <h1 className="card-title">UVA Thrift</h1>
                <p className="card-subtitle">Marketplace home</p>
                <p className="profile-message">No listings yet. Click Add Item to create the first one.</p>
            </section>
        </main>
    );
}
