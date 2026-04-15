import { z } from 'zod';
import { HttpError } from '../utils/httpError';
import { comparePassword, hashPassword } from '../utils/password';
import { createUser, deleteUserById, findUserByEmail, findUserById, markUserEmailVerified, updateUserProfile } from '../db/queries/userQueries';
import { createSession, deleteSession, getValidSessionById } from '../db/queries/sessionQueries';
import {
  createVerificationToken,
    getVerificationTokenByHash,
  getValidVerificationToken,
  invalidateUserVerificationTokens,
  markVerificationTokenUsed
} from '../db/queries/verificationQueries';
import { generateToken, hashToken } from '../utils/crypto';
import { sendVerificationEmail } from './emailService';

// Helper to map a UserRecord to the standard user response shape including optional profile fields.
function toUserResponse(user: { id: string; email: string; is_email_verified: boolean; display_name: string | null; phone_number: string | null; venmo_username: string | null }) {
    return {
        id: user.id,
        email: user.email,
        isEmailVerified: user.is_email_verified,
        displayName: user.display_name,
        phoneNumber: user.phone_number,
        venmoUsername: user.venmo_username
    };
}

// Schema for validating registration and login input. It requires an email that must be in a valid format, and a password that must be between 8 and 72 characters long.
const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(72)
});

// Service function to handle user registration. It validates the input, checks for existing users, creates a new user, and issues a verification email.
export async function registerUser(input: unknown) {

    // Extract email and password from the input.
    const parsed = authSchema.parse(input);
    const normalizedEmail = parsed.email.toLowerCase().trim();

    // Enforce that only @virginia.edu email addresses can register.
    if (!normalizedEmail.endsWith('@virginia.edu')) {
        throw new HttpError('Registration is limited to @virginia.edu email addresses.', 400);
    }

    // Check if a user with the same email already exists. If so, throw an error to prevent duplicate accounts.
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
        throw new HttpError('Email is already registered.', 409);
    }

    // Hash the password and create a new user record in the database.
    const passwordHash = await hashPassword(parsed.password);
    const user = await createUser(normalizedEmail, passwordHash);

    // Issue a verification email to the user. This will create a verification token in the database and send an email with the token.
    await issueVerificationEmail(user.id, user.email);

    return { user: toUserResponse(user) };
}

// Service function to handle user login. It validates the input, checks the user's credentials, and if successful, creates a session and returns the session ID and user information. 
// If the email is not verified, it will issue a new verification email instead of creating a session.
export async function loginUser(input: unknown) {

    // Extract email and password from the input.
    const parsed = authSchema.parse(input);
    const normalizedEmail = parsed.email.toLowerCase().trim();

    // Find the user by email. If the user does not exist, throw an error.
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
        throw new HttpError('Invalid email or password.', 401);
    }

    // Validate the password. If the password is incorrect, throw an error.
    const validPassword = await comparePassword(parsed.password, user.password_hash);
    if (!validPassword) {
        throw new HttpError('Invalid email or password.', 401);
    }

    // Check if the user's email is verified. If not, issue a verification email.
    if (!user.is_email_verified) {
        await issueVerificationEmail(user.id, user.email);
        return {
            requiresVerification: true,
            user: toUserResponse(user)
        };
    }

    // Create a new session for the user and return the session ID and user information.
    const session = await createSession(user.id, new Date(Date.now() + 604_800_000));

    return {
        requiresVerification: false,
        sessionId: session.id,
        user: toUserResponse(user)
    };
}

// Service function to handle user logout. It deletes the user's session from the database.
export async function logoutUser(sessionId: string | undefined) {
    if (!sessionId) {
        return;
    }
    await deleteSession(sessionId);
}

// Service function to get the current user from a session ID. It checks if the session is valid and retrieves the associated user information. If the session is invalid or expired, it returns null.
export async function getCurrentUserFromSession(sessionId: string | undefined) {

    // If no sessionId is passed, there is no session, so return null.
    if (!sessionId) {
        return null;
    }

    // Look up the session in the database and ensure it is valid (exists and not expired). If the session is invalid, return null.
    const session = await getValidSessionById(sessionId);
    if (!session) {
        return null;
    }

    // Look up the user associated with the session. If the user does not exist, return null.
    const user = await findUserById(session.user_id);
    if (!user) {
        return null;
    }

    return {
        sessionId: session.id,
        user: toUserResponse(user)
    };
}

// Service function to verify an email using a verification token. It checks if the token is valid, marks it as used, verifies the user's email, and returns the updated user information. 
// If the token is invalid or expired, it throws an error.
export async function verifyEmailToken(rawToken: string) {

    // Hash the raw token and look up a valid verification token in the database. A valid token is one that matches the hash, has not been used, and has not expired. If no valid token is found, throw an error.
    const hashed = hashToken(rawToken);
    const tokenRecord = await getValidVerificationToken(hashed);

    // If the token was already consumed but the user is verified, treat the request as a successful replay.
    if (!tokenRecord) {
        const matchedToken = await getVerificationTokenByHash(hashed);
        if (matchedToken?.used_at) {
            const existingUser = await findUserById(matchedToken.user_id);
            if (existingUser?.is_email_verified) {
                const replayedSession = await createSession(existingUser.id, new Date(Date.now() + 604_800_000));
                return {
                    sessionId: replayedSession.id,
                    user: toUserResponse(existingUser)
                };
            }
        }

        // If there is no matching token, or if the token has already been used or expired before verification completed, throw an error.
        throw new HttpError('Verification token is invalid or expired.', 400);
    }

    // If the token is valid, mark it as used and invalidate any other unused tokens for the same user.
    await markVerificationTokenUsed(tokenRecord.id);
    await invalidateUserVerificationTokens(tokenRecord.user_id);

    // Mark the user's email as verified and return the updated user information. If the user cannot be verified for some reason, throw an error.
    const verifiedUser = await markUserEmailVerified(tokenRecord.user_id);
    if (!verifiedUser) {
        throw new HttpError('Unable to verify user.', 500);
    }

    // Auto-login: create a session so the user lands on an authenticated page.
    const session = await createSession(verifiedUser.id, new Date(Date.now() + 604_800_000));

    return {
        sessionId: session.id,
        user: toUserResponse(verifiedUser)
    };
}

const updateProfileSchema = z.object({
    displayName:   z.string().trim().min(1).max(100).nullable().optional(),
    phoneNumber:   z.string().trim().min(1).max(30).nullable().optional(),
    venmoUsername: z.string().trim().min(1).max(50).nullable().optional()
});

// Service function to update a user's optional profile fields.
export async function updateUserProfileForUser(userId: string, input: unknown) {
    const parsed = updateProfileSchema.parse(input);
    const updated = await updateUserProfile(userId, {
        displayName:   parsed.displayName   ?? null,
        phoneNumber:   parsed.phoneNumber   ?? null,
        venmoUsername: parsed.venmoUsername ?? null
    });
    if (!updated) {
        throw new HttpError('User not found.', 404);
    }
    return toUserResponse(updated);
}

// Service function to delete the current user account.
export async function deleteUserAccount(userId: string) {
    const deleted = await deleteUserById(userId);
    if (!deleted) {
        throw new HttpError('User not found.', 404);
    }
}

// Service function to resend a verification email. It checks if the user exists and if their email is not already verified. If both conditions are true, it issues a new verification email.
export async function resendVerificationEmail(email: string) {

    // Check if a user with the given email exists.
    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    // If the user does not exist, do nothing.
    if (!user) {
        return;
    }

    // If the user's email is already verified, do nothing.
    if (user.is_email_verified) {
        return;
    }

    // If the user exists and their email is not verified, issue a new verification email. This will create a new verification token in the database and send an email with the token.
    await issueVerificationEmail(user.id, user.email);
}

// Helper function to issue a verification email. It generates a verification token valid for 30 minutes, stores it in the database, and sends an email to the user with the token.
async function issueVerificationEmail(userId: string, email: string) {
    const rawToken = generateToken();
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1_800_000);

    await createVerificationToken(userId, hashedToken, expiresAt);
    await sendVerificationEmail(email, rawToken);
}
