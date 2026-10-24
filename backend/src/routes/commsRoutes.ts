import { Router } from 'express';
import {
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  listAuditLogs
} from '../controllers/commsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Announcements
router.get('/announcements', listAnnouncements);
router.post('/announcements', requireRole('Admin', 'HR'), createAnnouncement);
router.delete('/announcements/:id', requireRole('Admin', 'HR'), deleteAnnouncement);

// Notifications
router.get('/notifications', listNotifications);
router.patch('/notifications/:id/read', markNotificationAsRead);
router.patch('/notifications/read-all', markAllNotificationsAsRead);

// Audit Logs (ADMIN ONLY - HR & Employee CANNOT view)
router.get('/audit-logs', requireRole('Admin'), listAuditLogs);

export default router;

