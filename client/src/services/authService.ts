import { apiFetch } from './api';
import type { User } from '../types/auth';

type RegisterResponse = {
    user: User;
    message: string;
};

type LoginResponse = {
    user: User;
};

type VerifyResponse = {
    user: User;
    message: string;
};

export function register(payload: { email: string; password: string }) {
    return apiFetch<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        expectedStatus: 201
    });
}

export function login(payload: { email: string; password: string }) {
    return apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function verifyEmail(token: string) {
    return apiFetch<VerifyResponse>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
    });
}

export function resendVerification(email: string) {
    return apiFetch<{ message: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

export function getProfile() {
    return apiFetch<{ user: User }>('/api/auth/profile');
}

export function logout() {
    return apiFetch<{ message: string }>('/api/auth/logout', {
        method: 'POST'
    });
}