import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/authService';

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setMessage(null);

        if (!token) {
            setError('Missing password reset token.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);

        try {
            const response = await resetPassword(token, password);
            setMessage(response.message);
            setPassword('');
            setConfirmPassword('');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to reset password.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="page">
            <section className="card" aria-label="Reset password form">
                <div className="auth-brand">
                    <h1 className="auth-brand-title">UVA&nbsp;<span className="auth-brand-accent">Thrift</span></h1>
                    <p className="auth-brand-tagline">Set a new password for your account</p>
                </div>

                <h2 className="section-heading">Reset Password</h2>

                <form onSubmit={handleSubmit} className="form-grid">
                    <input
                        className="input"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="New password"
                        minLength={8}
                        required
                        disabled={submitting || !token}
                    />
                    <input
                        className="input"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm new password"
                        minLength={8}
                        required
                        disabled={submitting || !token}
                    />
                    <button className="button button-accent" type="submit" disabled={submitting || !token}>
                        {submitting ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                {message ? <p className="status status-success">{message}</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

                <div className="switch-row">
                    <span>Ready to sign back in?</span>
                    <Link className="button button-secondary" to="/">
                        Return to login
                    </Link>
                </div>
            </section>
        </main>
    );
}