import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation,
  deleteDesignation,
  getLeaveTypes,
  updateLeaveTypeQuota,
  getHolidays,
  createHoliday,
  deleteHoliday
} from '../controllers/orgController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Settings
router.get('/settings', requireRole('Admin', 'HR'), getSettings);
router.put('/settings', requireRole('Admin'), updateSettings);

// Departments
router.get('/departments', requireRole('Admin', 'HR', 'Employee'), getDepartments);
router.post('/departments', requireRole('Admin'), createDepartment);
router.put('/departments/:id', requireRole('Admin'), updateDepartment);
router.delete('/departments/:id', requireRole('Admin'), deleteDepartment);

// Designations
router.get('/designations', requireRole('Admin', 'HR', 'Employee'), getDesignations);
router.post('/designations', requireRole('Admin'), createDesignation);
router.delete('/designations/:id', requireRole('Admin'), deleteDesignation);

// Leave Types
router.get('/leave-types', requireRole('Admin', 'HR', 'Employee'), getLeaveTypes);
router.put('/leave-types/:id', requireRole('Admin'), updateLeaveTypeQuota);

// Holidays
router.get('/holidays', requireRole('Admin', 'HR', 'Employee'), getHolidays);
router.post('/holidays', requireRole('Admin'), createHoliday);
router.delete('/holidays/:id', requireRole('Admin'), deleteHoliday);

export default router;

