import { Router } from 'express';
import {
  login,
  logout,
  profile,
  register,
  resendVerification,
  verifyEmail
} from '../controllers/authController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/verify-email', asyncHandler(verifyEmail));
authRouter.post('/resend-verification', asyncHandler(resendVerification));
authRouter.get('/profile', asyncHandler(requireVerifiedEmail), asyncHandler(profile));
authRouter.post('/logout', asyncHandler(logout));
