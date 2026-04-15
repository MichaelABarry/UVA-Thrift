import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteUserAccount, requestPasswordReset, resetPassword, verifyEmailToken } from './authService';
import { deleteUserById, findUserByEmail, findUserById, markUserEmailVerified, updateUserPasswordHash } from '../db/queries/userQueries';
import { createSession, deleteSessionsForUser } from '../db/queries/sessionQueries';
import {
    createPasswordResetToken,
    getValidPasswordResetToken,
    invalidateUserPasswordResetTokens,
    markPasswordResetTokenUsed
} from '../db/queries/passwordResetQueries';
import {
    getVerificationTokenByHash,
    getValidVerificationToken,
    invalidateUserVerificationTokens,
    markVerificationTokenUsed
} from '../db/queries/verificationQueries';
import { generateToken, hashToken } from '../utils/crypto';
import { hashPassword } from '../utils/password';
import { sendPasswordResetEmail } from './emailService';

vi.mock('../db/queries/userQueries', () => ({
    createUser: vi.fn(),
    deleteUserById: vi.fn(),
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    markUserEmailVerified: vi.fn(),
    updateUserPasswordHash: vi.fn(),
    updateUserProfile: vi.fn()
}));

vi.mock('../db/queries/sessionQueries', () => ({
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    deleteSessionsForUser: vi.fn(),
    getValidSessionById: vi.fn()
}));

vi.mock('../db/queries/passwordResetQueries', () => ({
    createPasswordResetToken: vi.fn(),
    getValidPasswordResetToken: vi.fn(),
    invalidateUserPasswordResetTokens: vi.fn(),
    markPasswordResetTokenUsed: vi.fn()
}));

vi.mock('../db/queries/verificationQueries', () => ({
    createVerificationToken: vi.fn(),
    getVerificationTokenByHash: vi.fn(),
    getValidVerificationToken: vi.fn(),
    invalidateUserVerificationTokens: vi.fn(),
    markVerificationTokenUsed: vi.fn()
}));

vi.mock('../utils/crypto', () => ({
    generateToken: vi.fn(),
    hashToken: vi.fn()
}));

vi.mock('../utils/password', () => ({
    comparePassword: vi.fn(),
    hashPassword: vi.fn()
}));

vi.mock('./emailService', () => ({
    sendPasswordResetEmail: vi.fn(),
    sendVerificationEmail: vi.fn()
}));

describe('authService.verifyEmailToken', () => {
    const mockedCreatePasswordResetToken = vi.mocked(createPasswordResetToken);
    const mockedCreateSession = vi.mocked(createSession);
    const mockedDeleteUserById = vi.mocked(deleteUserById);
    const mockedDeleteSessionsForUser = vi.mocked(deleteSessionsForUser);
    const mockedFindUserByEmail = vi.mocked(findUserByEmail);
    const mockedFindUserById = vi.mocked(findUserById);
    const mockedGenerateToken = vi.mocked(generateToken);
    const mockedGetValidPasswordResetToken = vi.mocked(getValidPasswordResetToken);
    const mockedGetVerificationTokenByHash = vi.mocked(getVerificationTokenByHash);
    const mockedGetValidVerificationToken = vi.mocked(getValidVerificationToken);
    const mockedHashPassword = vi.mocked(hashPassword);
    const mockedHashToken = vi.mocked(hashToken);
    const mockedInvalidateUserPasswordResetTokens = vi.mocked(invalidateUserPasswordResetTokens);
    const mockedInvalidateUserVerificationTokens = vi.mocked(invalidateUserVerificationTokens);
    const mockedMarkUserEmailVerified = vi.mocked(markUserEmailVerified);
    const mockedMarkPasswordResetTokenUsed = vi.mocked(markPasswordResetTokenUsed);
    const mockedMarkVerificationTokenUsed = vi.mocked(markVerificationTokenUsed);
    const mockedSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);
    const mockedUpdateUserPasswordHash = vi.mocked(updateUserPasswordHash);

    beforeEach(() => {
        mockedCreatePasswordResetToken.mockReset();
        mockedCreateSession.mockReset();
        mockedDeleteUserById.mockReset();
        mockedDeleteSessionsForUser.mockReset();
        mockedFindUserByEmail.mockReset();
        mockedFindUserById.mockReset();
        mockedGenerateToken.mockReset();
        mockedGetValidPasswordResetToken.mockReset();
        mockedGetVerificationTokenByHash.mockReset();
        mockedGetValidVerificationToken.mockReset();
        mockedHashPassword.mockReset();
        mockedHashToken.mockReset();
        mockedInvalidateUserPasswordResetTokens.mockReset();
        mockedInvalidateUserVerificationTokens.mockReset();
        mockedMarkUserEmailVerified.mockReset();
        mockedMarkPasswordResetTokenUsed.mockReset();
        mockedMarkVerificationTokenUsed.mockReset();
        mockedSendPasswordResetEmail.mockReset();
        mockedUpdateUserPasswordHash.mockReset();
        mockedGenerateToken.mockReturnValue('raw-reset-token');
        mockedHashToken.mockReturnValue('hashed-token');
    });

    it('returns success for a replayed token when the user is already verified', async () => {
        mockedGetValidVerificationToken.mockResolvedValue(null as never);
        mockedGetVerificationTokenByHash.mockResolvedValue({
            id: 'token-1',
            user_id: 'user-1',
            token_hash: 'hashed-token',
            expires_at: new Date().toISOString(),
            used_at: new Date().toISOString()
        });
        mockedFindUserById.mockResolvedValue({
            id: 'user-1',
            email: 'user@virginia.edu',
            password_hash: 'hash',
            is_email_verified: true,
            display_name: null,
            phone_number: null,
            venmo_username: null,
            created_at: new Date().toISOString()
        });
        mockedCreateSession.mockResolvedValue({ id: 'session-1', user_id: 'user-1', expires_at: new Date().toISOString() } as never);

        const result = await verifyEmailToken('raw-token');

        expect(mockedMarkVerificationTokenUsed).not.toHaveBeenCalled();
        expect(mockedInvalidateUserVerificationTokens).not.toHaveBeenCalled();
        expect(mockedMarkUserEmailVerified).not.toHaveBeenCalled();
        expect(mockedCreateSession).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            sessionId: 'session-1',
            user: {
                id: 'user-1',
                email: 'user@virginia.edu',
                isEmailVerified: true,
                displayName: null,
                phoneNumber: null,
                venmoUsername: null
            }
        });
    });

    it('still rejects an invalid token when the user is not verified', async () => {
        mockedGetValidVerificationToken.mockResolvedValue(null as never);
        mockedGetVerificationTokenByHash.mockResolvedValue({
            id: 'token-1',
            user_id: 'user-1',
            token_hash: 'hashed-token',
            expires_at: new Date().toISOString(),
            used_at: new Date().toISOString()
        });
        mockedFindUserById.mockResolvedValue({
            id: 'user-1',
            email: 'user@virginia.edu',
            password_hash: 'hash',
            is_email_verified: false,
            display_name: null,
            phone_number: null,
            venmo_username: null,
            created_at: new Date().toISOString()
        });

        await expect(verifyEmailToken('raw-token')).rejects.toMatchObject({
            message: 'Verification token is invalid or expired.',
            statusCode: 400
        });
    });

    it('deletes an existing user account', async () => {
        mockedDeleteUserById.mockResolvedValue({
            id: 'user-1',
            email: 'user@virginia.edu',
            password_hash: 'hash',
            is_email_verified: true,
            display_name: null,
            phone_number: null,
            venmo_username: null,
            created_at: new Date().toISOString()
        });

        await expect(deleteUserAccount('user-1')).resolves.toBeUndefined();
        expect(mockedDeleteUserById).toHaveBeenCalledWith('user-1');
    });

    it('throws when deleting a missing user account', async () => {
        mockedDeleteUserById.mockResolvedValue(null as never);

        await expect(deleteUserAccount('missing-user')).rejects.toMatchObject({
            message: 'User not found.',
            statusCode: 404
        });
    });

    it('sends a password reset email when the user exists', async () => {
        mockedFindUserByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@virginia.edu',
            password_hash: 'hash',
            is_email_verified: true,
            display_name: null,
            phone_number: null,
            venmo_username: null,
            created_at: new Date().toISOString()
        });

        await expect(requestPasswordReset({ email: 'user@virginia.edu' })).resolves.toBeUndefined();

        expect(mockedInvalidateUserPasswordResetTokens).toHaveBeenCalledWith('user-1');
        expect(mockedCreatePasswordResetToken).toHaveBeenCalledWith('user-1', 'hashed-token', expect.any(Date));
        expect(mockedSendPasswordResetEmail).toHaveBeenCalledWith('user@virginia.edu', 'raw-reset-token');
    });

    it('does not reveal whether a password reset email target exists', async () => {
        mockedFindUserByEmail.mockResolvedValue(null as never);

        await expect(requestPasswordReset({ email: 'missing@virginia.edu' })).resolves.toBeUndefined();

        expect(mockedCreatePasswordResetToken).not.toHaveBeenCalled();
        expect(mockedSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('resets the password for a valid reset token', async () => {
        mockedGetValidPasswordResetToken.mockResolvedValue({
            id: 'reset-1',
            user_id: 'user-1',
            token_hash: 'hashed-token',
            expires_at: new Date().toISOString(),
            used_at: null
        });
        mockedHashPassword.mockResolvedValue('new-password-hash');
        mockedUpdateUserPasswordHash.mockResolvedValue({
            id: 'user-1',
            email: 'user@virginia.edu',
            password_hash: 'new-password-hash',
            is_email_verified: true,
            display_name: null,
            phone_number: null,
            venmo_username: null,
            created_at: new Date().toISOString()
        });

        await expect(resetPassword({ token: 'raw-token', password: 'new-password-123' })).resolves.toBeUndefined();

        expect(mockedUpdateUserPasswordHash).toHaveBeenCalledWith('user-1', 'new-password-hash');
        expect(mockedMarkPasswordResetTokenUsed).toHaveBeenCalledWith('reset-1');
        expect(mockedInvalidateUserPasswordResetTokens).toHaveBeenCalledWith('user-1');
        expect(mockedDeleteSessionsForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects an invalid password reset token', async () => {
        mockedGetValidPasswordResetToken.mockResolvedValue(null as never);

        await expect(resetPassword({ token: 'bad-token', password: 'new-password-123' })).rejects.toMatchObject({
            message: 'Password reset link is invalid or expired.',
            statusCode: 400
        });
    });
});