import { Router } from 'express';
import {
  listEmployees,
  getEmployee360,
  createEmployee,
  updateEmployee,
  dryRunCSV,
  confirmCSVImport,
  exportCSV
} from '../controllers/employeeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', listEmployees);
router.post('/', requireRole('HR', 'Admin'), createEmployee);
router.get('/export-csv', requireRole('HR', 'Admin'), exportCSV);
router.post('/csv/dry-run', requireRole('HR', 'Admin'), dryRunCSV);
router.post('/csv/confirm', requireRole('HR', 'Admin'), confirmCSVImport);

router.get('/:id', getEmployee360);
router.put('/:id', updateEmployee);

export default router;

