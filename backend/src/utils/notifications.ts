import { Notification, getNextId } from '../database/models.js';

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    const id = await getNextId('notifications');
    await Notification.create({
      id,
      user_id: userId,
      title,
      message,
      link: link || null,
      is_read: 0,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
