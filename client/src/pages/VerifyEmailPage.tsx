import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  useEffect(() => {
    async function runVerification() {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }

      try {
        await verifyEmail(token);
        setStatus('success');
        setMessage('Email verified. You can now log in.');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1200);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed.');
      }
    }

    void runVerification();
  }, [navigate, token]);

  return (
    <main className="page">
      <section className="card" aria-label="Verify email page">
        <h1 className="card-title">Verify Email</h1>
        <p className={status === 'error' ? 'status status-error' : 'status status-success'}>{message}</p>
        {status === 'error' ? (
          <Link className="button button-secondary" to="/">
            Return to login
          </Link>
        ) : null}
      </section>
    </main>
  );
}
