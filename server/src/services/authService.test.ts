import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteUserAccount, verifyEmailToken } from './authService';
import { deleteUserById, findUserById, markUserEmailVerified } from '../db/queries/userQueries';
import { createSession } from '../db/queries/sessionQueries';
import {
    getVerificationTokenByHash,
    getValidVerificationToken,
    invalidateUserVerificationTokens,
    markVerificationTokenUsed
} from '../db/queries/verificationQueries';
import { hashToken } from '../utils/crypto';

vi.mock('../db/queries/userQueries', () => ({
    createUser: vi.fn(),
    deleteUserById: vi.fn(),
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    markUserEmailVerified: vi.fn(),
    updateUserProfile: vi.fn()
}));

vi.mock('../db/queries/sessionQueries', () => ({
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getValidSessionById: vi.fn()
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
    sendVerificationEmail: vi.fn()
}));

describe('authService.verifyEmailToken', () => {
    const mockedCreateSession = vi.mocked(createSession);
    const mockedDeleteUserById = vi.mocked(deleteUserById);
    const mockedFindUserById = vi.mocked(findUserById);
    const mockedGetVerificationTokenByHash = vi.mocked(getVerificationTokenByHash);
    const mockedGetValidVerificationToken = vi.mocked(getValidVerificationToken);
    const mockedHashToken = vi.mocked(hashToken);
    const mockedInvalidateUserVerificationTokens = vi.mocked(invalidateUserVerificationTokens);
    const mockedMarkUserEmailVerified = vi.mocked(markUserEmailVerified);
    const mockedMarkVerificationTokenUsed = vi.mocked(markVerificationTokenUsed);

    beforeEach(() => {
        mockedCreateSession.mockReset();
        mockedDeleteUserById.mockReset();
        mockedFindUserById.mockReset();
        mockedGetVerificationTokenByHash.mockReset();
        mockedGetValidVerificationToken.mockReset();
        mockedHashToken.mockReset();
        mockedInvalidateUserVerificationTokens.mockReset();
        mockedMarkUserEmailVerified.mockReset();
        mockedMarkVerificationTokenUsed.mockReset();
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
});