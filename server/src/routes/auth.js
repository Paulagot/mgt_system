import express from 'express';
import { AuthService } from '../services/AuthService.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';


const router = express.Router();
const authService = new AuthService();
const getSocketManager = (req) => req.app.get('socketManager');

// Register club
router.post('/clubs/register', 
  validateRequired(['name', 'email', 'password']),
  authService.register.bind(authService)
);

// Login club
router.post('/clubs/login', 
  validateRequired(['email', 'password']),
  authService.login.bind(authService)
);

// Get user profile
router.get('/clubs/me', 
  authenticateToken, 
  authService.getProfile.bind(authService)
);

export default router;