// server/src/routes/auth.js
import express from 'express';
import { AuthService } from '../services/AuthService.js';

import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';

const router = express.Router();
const authService = new AuthService();

// Register club
router.post(
  '/clubs/register',
  validateRequired(['name', 'email', 'password', 'gdprConsent', 'privacyPolicyAccepted']),
  authService.register.bind(authService)
);

// ✅ Login now requires club + email + password
router.post(
  '/clubs/login',
  validateRequired(['club', 'email', 'password']),
  authService.login.bind(authService)
);

// Get user profile
router.get(
  '/clubs/me',
  authenticateToken,
  authService.getProfile.bind(authService)
);

export default router;
