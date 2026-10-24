import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendanceStatus,
  getDailyAttendanceBoard,
  getEmployeeAttendance,
  requestCorrection,
  listCorrections,
  reviewCorrection
} from '../controllers/attendanceController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Employee check-in / check-out
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayAttendanceStatus);

// Daily attendance board (Admin & HR)
router.get('/board', requireRole('Admin', 'HR'), getDailyAttendanceBoard);

// Attendance history per employee
router.get('/employee/:employeeId', getEmployeeAttendance);

// Corrections
router.post('/corrections', requestCorrection);
router.get('/corrections', listCorrections);
router.patch('/corrections/:id/review', requireRole('HR', 'Admin'), reviewCorrection);

export default router;

