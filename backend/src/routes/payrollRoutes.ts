import { Router } from 'express';
import {
  createPayrollDraft,
  listPayrollRuns,
  getPayrollRunDetails,
  finalizePayroll,
  downloadPayslipPDF
} from '../controllers/payrollController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.post('/draft', requireRole('HR', 'Admin'), createPayrollDraft);
router.get('/runs', requireRole('Admin', 'HR'), listPayrollRuns);
router.get('/runs/:id', getPayrollRunDetails);
router.patch('/runs/:id/finalize', requireRole('Admin'), finalizePayroll);
router.get('/payslips/:id/pdf', downloadPayslipPDF);

export default router;

