import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { TopNav } from './TopNav';

export function ProtectedLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <main className="page page-content">
                <section className="card" aria-label="Loading page">
                    <h1 className="card-title">Loading...</h1>
                </section>
            </main>
        );
    }

    if (!user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <>
            <TopNav />
            <Outlet />
        </>
    );
}
