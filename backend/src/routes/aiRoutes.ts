import { Router } from 'express';
import {
  chatWithAI,
  summarizeDashboard,
  parseSmartLeave
} from '../controllers/aiController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.post('/chat', chatWithAI);
router.post('/summary', requireRole('Admin', 'HR'), summarizeDashboard);
router.post('/smart-leave', parseSmartLeave);

export default router;

