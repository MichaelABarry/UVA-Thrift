import type { Request, Response } from 'express';
import {
  getCurrentUserFromSession,
  loginUser,
  logoutUser,
  registerUser,
  resendVerificationEmail,
  verifyEmailToken
} from '../services/authService';
import { HttpError } from '../utils/httpError';

const COOKIE_NAME = 'uva_thrift_session';
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function setSessionCookie(res: Response, sessionId: string) {
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_WEEK_MS
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  res.status(201).json({ user, message: 'Registration successful. Check your email for a verification link.' });
}

export async function login(req: Request, res: Response) {
  const result = await loginUser(req.body);

  if (result.requiresVerification) {
    return res.status(403).json({
      requiresVerification: true,
      message: 'Your email is not verified. A new verification link has been sent.'
    });
  }

  if (!result.sessionId) {
    throw new HttpError('Unable to start session.', 500);
  }

  setSessionCookie(res, result.sessionId);
  return res.status(200).json({ user: result.user });
}

export async function logout(req: Request, res: Response) {
  await logoutUser(req.cookies[COOKIE_NAME]);
  clearSessionCookie(res);
  return res.status(200).json({ message: 'Logged out.' });
}

export async function me(req: Request, res: Response) {
  const current = await getCurrentUserFromSession(req.cookies[COOKIE_NAME]);

  if (!current) {
    return res.status(200).json({ user: null });
  }

  return res.status(200).json({ user: current.user });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = String(req.body?.token || '').trim();
  if (!token) {
    throw new HttpError('Token is required.', 400);
  }

  const user = await verifyEmailToken(token);
  return res.status(200).json({ user, message: 'Email verified successfully.' });
}

export async function resendVerification(req: Request, res: Response) {
  const email = String(req.body?.email || '').trim();
  if (!email) {
    throw new HttpError('Email is required.', 400);
  }

  await resendVerificationEmail(email);
  return res.status(200).json({ message: 'If an unverified account exists, a new email was sent.' });
}

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
