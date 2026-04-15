import { Router } from 'express';
import {
  confirmPasswordReset,
  deleteAccount,
  forgotPassword,
  login,
  logout,
  profile,
  register,
  resendVerification,
  updateProfile,
  verifyEmail
} from '../controllers/authController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/verify-email', asyncHandler(verifyEmail));
authRouter.post('/forgot-password', asyncHandler(forgotPassword));
authRouter.post('/reset-password', asyncHandler(confirmPasswordReset));
authRouter.post('/resend-verification', asyncHandler(resendVerification));
authRouter.get('/profile', asyncHandler(requireVerifiedEmail), asyncHandler(profile));
authRouter.put('/profile', asyncHandler(requireVerifiedEmail), asyncHandler(updateProfile));
authRouter.delete('/profile', asyncHandler(requireVerifiedEmail), asyncHandler(deleteAccount));
authRouter.post('/logout', asyncHandler(logout));
