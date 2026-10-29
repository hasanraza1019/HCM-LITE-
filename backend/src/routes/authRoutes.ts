import { Router } from 'express';
import {
  getSystemStatus,
  firstRunSetup,
  login,
  seedDemoData,
  changePassword,
  getCurrentUser,
  listUsers,
  createHRUser,
  toggleUserStatus,
  resetUserPassword
} from '../controllers/authController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/status', getSystemStatus);
router.post('/setup', firstRunSetup);
router.post('/login', login);
router.post('/seed-demo', seedDemoData);

// Authenticated routes
router.use(authenticateToken);
router.get('/me', getCurrentUser);
router.post('/change-password', changePassword);

// Admin-only user management
router.get('/users', requireRole('Admin'), listUsers);
router.post('/users/hr', requireRole('Admin'), createHRUser);
router.patch('/users/:id/toggle-status', requireRole('Admin'), toggleUserStatus);
router.post('/users/:id/reset-password', requireRole('Admin'), resetUserPassword);

export default router;

