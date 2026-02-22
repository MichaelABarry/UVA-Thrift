import { Router } from 'express';
import {
  login,
  logout,
  me,
  profile,
  register,
  resendVerification,
  verifyEmail
} from '../controllers/authController';
import { requireVerifiedEmail } from '../middleware/authMiddleware';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', me);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', resendVerification);
authRouter.get('/profile', requireVerifiedEmail, profile);
