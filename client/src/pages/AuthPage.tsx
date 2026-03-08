import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login, register, resendVerification } from '../services/authService';

export function AuthPage() {
    const { user, loading, refreshUser } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [canResend, setCanResend] = useState(false);

    const title = useMemo(() => (mode === 'login' ? 'Log In' : 'Register'), [mode]);

    if (!loading && user?.isEmailVerified) {
        return <Navigate to="/home" replace />;
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setMessage(null);
        setCanResend(false);

        try {
            if (mode === 'register') {
                const result = await register({ email, password });
                setMessage(result.message);
                setMode('login');
            } else {
                await login({ email, password });
                await refreshUser();
            }
        } catch (submitError) {
            const msg = submitError instanceof Error ? submitError.message : 'Request failed.';
            setError(msg);
            if (msg.toLowerCase().includes('not verified')) {
                setCanResend(true);
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResend() {
        setError(null);
        setMessage(null);

        try {
            await resendVerification(email);
            setMessage('If your account exists and is unverified, a new link was sent.');
        } catch (resendError) {
            setError(resendError instanceof Error ? resendError.message : 'Unable to resend verification email.');
        }
    }

    return (
        <main className="page">
        <section className="card" aria-label="Authentication form">
            <div className="auth-brand">
                <h1 className="auth-brand-title">UVA&nbsp;<span className="auth-brand-accent">Thrift</span></h1>
                <p className="auth-brand-tagline">Buy, sell &amp; exchange with fellow Hoos</p>
            </div>
            <h2 className="section-heading">{title}</h2>

            <form onSubmit={handleSubmit} className="form-grid">
            <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
            />
            <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                minLength={8}
                required
            />
            <button className="button button-accent" type="submit" disabled={submitting}>
                {submitting ? 'Please wait...' : title}
            </button>
            </form>

            <div className="switch-row">
            <span>{mode === 'login' ? 'Need an account?' : 'Already have an account?'}</span>
            <button
                className="button button-secondary"
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
                {mode === 'login' ? 'Register' : 'Log In'}
            </button>
            </div>

            {canResend ? (
            <button className="button button-secondary" type="button" onClick={handleResend}>
                Resend verification email
            </button>
            ) : null}

            {message ? <p className="status status-success">{message}</p> : null}
            {error ? <p className="status status-error">{error}</p> : null}
        </section>
        </main>
    );
}
