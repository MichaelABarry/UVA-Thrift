import type { NextFunction, Request, Response } from 'express';
import { getCurrentUserFromSession } from '../services/authService';

const COOKIE_NAME = 'uva_thrift_session';

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
    created_at: ''
  };
  req.sessionId = current.sessionId;
  next();
}

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
    created_at: ''
  };
  req.sessionId = current.sessionId;
  next();
}
