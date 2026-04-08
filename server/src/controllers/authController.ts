import type { Request, Response } from 'express';
import {
  getCurrentUserFromSession,
  loginUser,
  logoutUser,
  registerUser,
  resendVerificationEmail,
  updateUserProfileForUser,
  verifyEmailToken
} from '../services/authService';
import { HttpError } from '../utils/httpError';

const COOKIE_NAME = 'uva_thrift_session';

// Sets a session cookie valid for one week
function setSessionCookie(res: Response, sessionId: string) {
    res.cookie(COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 604_800_000
    });
}

// Clears a session cookie
function clearSessionCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
}

// Endpoint handler for user registration
export async function register(req: Request, res: Response) {
    const user = await registerUser(req.body);
    res.status(201).json({ user, message: 'Registration successful. Check your email for a verification link. Please allow for at least 30 seconds to receive the email.' });
}

// Endpoint handler for user login. If the user's email is not verified, a new verification email will be sent and no session will be created.
// If login is successful and the email is verified, a session cookie will be set.
export async function login(req: Request, res: Response) {
    const result = await loginUser(req.body);

    if (result.requiresVerification) {
        return res.status(403).json({
        requiresVerification: true,
        message: 'Your email is not verified. A new verification link has been sent. Please allow for at least 30 seconds to receive the email. '
        });
    }

    if (!result.sessionId) {
        throw new HttpError('Unable to start session.', 500);
    }

    setSessionCookie(res, result.sessionId);
    return res.status(200).json({ user: result.user });
}

// Endpoint handler for user logout. The session cookie will be cleared and the session will be deleted from the database.
export async function logout(req: Request, res: Response) {
    await logoutUser(req.cookies[COOKIE_NAME]);
    clearSessionCookie(res);
    return res.status(200).json({ message: 'Logged out.' });
}

// Endpoint handler for verifying an email. Also creates a session so the client can proceed to profile setup without logging in again.
export async function verifyEmail(req: Request, res: Response) {
    const token = String(req.body?.token || '').trim();
    if (!token) {
        throw new HttpError('Token is required.', 400);
    }

    const result = await verifyEmailToken(token);
    setSessionCookie(res, result.sessionId);
    return res.status(200).json({ user: result.user, message: 'Email verified successfully.' });
}

// Endpoint handler for updating the current user's optional profile fields (name, phone, venmo).
export async function updateProfile(req: Request, res: Response) {
    const user = await updateUserProfileForUser(req.user!.id, req.body);
    return res.status(200).json({ user });
}

// Endpoint handler for resending a verification email
export async function resendVerification(req: Request, res: Response) {
    const email = String(req.body?.email || '').trim();
    if (!email) {
        throw new HttpError('Email is required.', 400);
    }

    await resendVerificationEmail(email);
    return res.status(200).json({ message: 'If an unverified account exists, a new email was sent.' });
}

// Endpoint handler for fetching the current user's profile from their session.
// If there is no valid session or the email is not verified, an error will be thrown. Otherwise, the user's profile will be returned.
export async function profile(req: Request, res: Response) {
    const current = await getCurrentUserFromSession(req.cookies[COOKIE_NAME]);

    if (!current) {
        throw new HttpError('Unauthorized.', 401);
    }

    if (!current.user.isEmailVerified) {
        throw new HttpError('Email verification required.', 403);
    }

    return res.status(200).json({ user: current.user });
}
