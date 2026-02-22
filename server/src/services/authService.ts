import { z } from 'zod';
import { HttpError } from '../utils/httpError';
import { comparePassword, hashPassword } from '../utils/password';
import { createUser, findUserByEmail, findUserById, markUserEmailVerified } from '../db/queries/userQueries';
import { createSession, deleteSession, getValidSessionById } from '../db/queries/sessionQueries';
import {
  createVerificationToken,
  getValidVerificationToken,
  invalidateUserVerificationTokens,
  markVerificationTokenUsed
} from '../db/queries/verificationQueries';
import { generateToken, hashToken } from '../utils/crypto';
import { sendVerificationEmail } from './emailService';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const VERIFICATION_DURATION_MS = 1000 * 60 * 30;

export async function registerUser(input: unknown) {
  const parsed = authSchema.parse(input);
  const normalizedEmail = parsed.email.toLowerCase().trim();

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new HttpError('Email is already registered.', 409);
  }

  const passwordHash = await hashPassword(parsed.password);
  const user = await createUser(normalizedEmail, passwordHash);

  await issueVerificationEmail(user.id, user.email);

  return {
    id: user.id,
    email: user.email,
    isEmailVerified: user.is_email_verified
  };
}

export async function loginUser(input: unknown) {
  const parsed = authSchema.parse(input);
  const normalizedEmail = parsed.email.toLowerCase().trim();

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new HttpError('Invalid email or password.', 401);
  }

  const validPassword = await comparePassword(parsed.password, user.password_hash);
  if (!validPassword) {
    throw new HttpError('Invalid email or password.', 401);
  }

  if (!user.is_email_verified) {
    await issueVerificationEmail(user.id, user.email);
    return {
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
        isEmailVerified: user.is_email_verified
      }
    };
  }

  const session = await createSession(user.id, new Date(Date.now() + SESSION_DURATION_MS));

  return {
    requiresVerification: false,
    sessionId: session.id,
    user: {
      id: user.id,
      email: user.email,
      isEmailVerified: user.is_email_verified
    }
  };
}

export async function logoutUser(sessionId: string | undefined) {
  if (!sessionId) {
    return;
  }
  await deleteSession(sessionId);
}

export async function getCurrentUserFromSession(sessionId: string | undefined) {
  if (!sessionId) {
    return null;
  }

  const session = await getValidSessionById(sessionId);
  if (!session) {
    return null;
  }

  const user = await findUserById(session.user_id);
  if (!user) {
    return null;
  }

  return {
    sessionId: session.id,
    user: {
      id: user.id,
      email: user.email,
      isEmailVerified: user.is_email_verified
    }
  };
}

export async function verifyEmailToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  const tokenRecord = await getValidVerificationToken(hashed);

  if (!tokenRecord) {
    throw new HttpError('Verification token is invalid or expired.', 400);
  }

  await markVerificationTokenUsed(tokenRecord.id);
  await invalidateUserVerificationTokens(tokenRecord.user_id);

  const verifiedUser = await markUserEmailVerified(tokenRecord.user_id);
  if (!verifiedUser) {
    throw new HttpError('Unable to verify user.', 500);
  }

  return {
    id: verifiedUser.id,
    email: verifiedUser.email,
    isEmailVerified: verifiedUser.is_email_verified
  };
}

export async function resendVerificationEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return;
  }

  if (user.is_email_verified) {
    return;
  }

  await issueVerificationEmail(user.id, user.email);
}

async function issueVerificationEmail(userId: string, email: string) {
  const rawToken = generateToken();
  const hashedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_DURATION_MS);

  await createVerificationToken(userId, hashedToken, expiresAt);
  await sendVerificationEmail(email, rawToken);
}
