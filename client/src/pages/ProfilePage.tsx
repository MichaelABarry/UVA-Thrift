import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getProfile, logout } from '../services/authService';

export function ProfilePage() {
    const { user, loading, setUser } = useAuth();
    const [message, setMessage] = useState('');

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await getProfile();
                setMessage(`Welcome, ${response.user.email}. This is your profile landing page.`);
            } catch {
                setMessage('Unable to load profile.');
            }
        }

        if (user?.isEmailVerified) {
            void loadProfile();
        }
    }, [user]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    async function handleLogout() {
        await logout();
        setUser(null);
    }

    return (
        <main className="page">
        <section className="card" aria-label="Profile page">
            <h1 className="card-title">UVA Thrift Profile</h1>
            <p className="profile-email">Signed in as: {user?.email ?? 'Unknown user'}</p>
            <p className="profile-message">{message}</p>
            <button className="button" type="button" onClick={handleLogout}>
            Log Out
            </button>
        </section>
        </main>
    );
}
