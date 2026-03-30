import type { NextFunction, Request, Response } from 'express';
import { getCurrentUserFromSession } from '../services/authService';

const COOKIE_NAME = 'uva_thrift_session';

// Middleware to require authentication. It checks for a valid session cookie and retrieves the current user. 
// If the session is valid, the user information is attached to the request object and the next middleware is called. If not, a 401 Unauthorized response is sent.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.cookies[COOKIE_NAME];
    const current = await getCurrentUserFromSession(sessionId);

    if (!current) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }

    req.user = {
        id: current.user.id,
        email: current.user.email,
        password_hash: '',
        is_email_verified: current.user.isEmailVerified,
        display_name: current.user.displayName ?? null,
        phone_number: current.user.phoneNumber ?? null,
        venmo_username: current.user.venmoUsername ?? null,
        created_at: ''
    };
    req.sessionId = current.sessionId;
    next();
}

// Middleware to require email verification. It checks for a valid session cookie and retrieves the current user. 
// If the session is valid but the email is not verified, a 403 Forbidden response is sent. If the session is valid and the email is verified, the user information is attached to the request object and the next middleware is called.
export async function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.cookies[COOKIE_NAME];
    const current = await getCurrentUserFromSession(sessionId);

    if (!current) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!current.user.isEmailVerified) {
        return res.status(403).json({ message: 'Email verification required.' });
    }

    req.user = {
        id: current.user.id,
        email: current.user.email,
        password_hash: '',
        is_email_verified: current.user.isEmailVerified,
        display_name: current.user.displayName ?? null,
        phone_number: current.user.phoneNumber ?? null,
        venmo_username: current.user.venmoUsername ?? null,
        created_at: ''
    };
    req.sessionId = current.sessionId;
    next();
}
