import { Request, Response } from 'express';
import {
  Announcement,
  Notification,
  AuditLog,
  User,
  getNextId
} from '../database/models.js';
import { logAudit } from '../utils/audit.js';

// Announcements
export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    const filter: any = {};

    if (role === 'Employee') {
      filter.target_role = { $in: ['all', 'Employee'] };
    } else if (role === 'HR') {
      filter.target_role = { $in: ['all', 'HR', 'Employee'] };
    }

    const [rawAnnouncements, users] = await Promise.all([
      Announcement.find(filter).sort({ id: -1 }).limit(50).lean() as Promise<any[]>,
      User.find({}, { id: 1, email: 1 }).lean() as Promise<any[]>
    ]);

    const userMap = new Map(users.map(u => [u.id, u.email]));
    const announcements = rawAnnouncements.map(a => ({
      ...a,
      author_email: userMap.get(a.created_by) || 'System'
    }));

    res.json({ announcements });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const { title, content, priority = 'normal', target_role = 'all' } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    const now = new Date().toISOString();
    const announcementId = await getNextId('announcements');

    await Announcement.create({
      id: announcementId,
      title: title.trim(),
      content: content.trim(),
      priority,
      target_role,
      created_by: req.user!.id,
      created_at: now
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: announcementId,
      after: { title: title.trim(), priority, target_role },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Announcement posted successfully',
      announcement: { id: announcementId, title: title.trim(), content: content.trim(), priority, target_role, created_at: now }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await Announcement.deleteOne({ id });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// In-App Notifications
export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user_id: req.user!.id }).sort({ id: -1 }).limit(30).lean(),
      Notification.countDocuments({ user_id: req.user!.id, is_read: 0 })
    ]);

    res.json({
      notifications,
      unreadCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function markNotificationAsRead(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await Notification.updateOne({ id, user_id: req.user!.id }, { $set: { is_read: 1 } });
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
  try {
    await Notification.updateMany({ user_id: req.user!.id }, { $set: { is_read: 1 } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Audit Logs (ADMIN ONLY)
export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { entity, action, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (entity) filter.entity = entity;
    if (action) filter.action = action;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ id: -1 }).skip(offset).limit(limitNum).lean()
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
