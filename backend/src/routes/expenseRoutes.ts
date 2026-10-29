import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  submitExpense,
  getMyExpenses,
  getAllExpenses,
  reviewExpense
} from '../controllers/expenseController.js';

const router = Router();

router.use(authenticateToken);

router.post('/', submitExpense);
router.get('/my', getMyExpenses);
router.get('/all', requireRole('HR', 'Admin'), getAllExpenses);
router.patch('/:id/review', requireRole('HR', 'Admin'), reviewExpense);

export default router;
