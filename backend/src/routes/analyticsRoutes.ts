import { Router } from 'express';
import {
  getAdminDashboard,
  getHRDashboard,
  getEmployeeDashboard
} from '../controllers/analyticsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/admin', requireRole('Admin'), getAdminDashboard);
router.get('/hr', requireRole('HR', 'Admin'), getHRDashboard);
router.get('/employee', getEmployeeDashboard);

export default router;

