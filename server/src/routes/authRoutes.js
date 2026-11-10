import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  googleLogin,
  googleComplete,
  forgotPassword,
  resetPassword,
  checkUsername,
  checkEmail,
  getMe,
  updateProfile,
  changePassword,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  googleAuthSchema,
  googleCompleteSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../controllers/authController.js';
import { ensureGoogleEnabled } from '../services/googleVerifier.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authRateLimiter, loginRateLimiter, availabilityRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// Public auth endpoints
router.get('/check-username', availabilityRateLimiter, checkUsername);
router.get('/check-email', availabilityRateLimiter, checkEmail);
router.post('/register', authRateLimiter, validateBody(registerSchema), register);
router.post('/verify-email', authRateLimiter, validateBody(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', authRateLimiter, validateBody(resendVerificationSchema), resendVerification);
router.post('/login', loginRateLimiter, validateBody(loginSchema), login);
router.post('/google', ensureGoogleEnabled, loginRateLimiter, validateBody(googleAuthSchema), googleLogin);
router.post('/google/complete', ensureGoogleEnabled, authRateLimiter, validateBody(googleCompleteSchema), googleComplete);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), resetPassword);

// Authenticated user endpoints
router.get('/me', authMiddleware, getMe);
router.put('/me/profile', authMiddleware, validateBody(updateProfileSchema), updateProfile);
router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), changePassword);

export default router;
