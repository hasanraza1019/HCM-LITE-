import { Router } from 'express';
import {
  getLeaveBalances,
  applyLeave,
  cancelLeave,
  listLeaveRequests,
  reviewLeave
} from '../controllers/leaveController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/balances', getLeaveBalances);
router.get('/balances/:employeeId', requireRole('Admin', 'HR'), getLeaveBalances);
router.post('/apply', applyLeave);
router.patch('/:id/cancel', cancelLeave);
router.get('/requests', listLeaveRequests);
router.patch('/requests/:id/review', requireRole('HR', 'Admin'), reviewLeave);

export default router;

