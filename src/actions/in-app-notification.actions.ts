'use server';

import { notificationRepository } from '@/repositories/notification.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getNotifications(limit: number = 20) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session?.user?.email) {
    return [];
  }

  return notificationRepository.findByUser(session.user.tenantId, session.user.email, limit);
}

export async function getUnreadCount() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session?.user?.email) {
    return 0;
  }

  return notificationRepository.countUnread(session.user.tenantId, session.user.email);
}

export async function markNotificationAsRead(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const success = await notificationRepository.markAsRead(session.user.tenantId, notificationId);
  return { success };
}

export async function markAllNotificationsAsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  const count = await notificationRepository.markAllAsRead(session.user.tenantId, session.user.email);
  return { success: true, count };
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'rent_reminder' | 'rent_overdue' | 'payment_received' | 'general' | 'push' | 'whatsapp' | 'sms'
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  await notificationRepository.create(session.user.tenantId, {
    userId,
    title,
    message,
    type,
  });

  return { success: true };
}

export async function deleteOldNotifications(daysOld: number = 30) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  const count = await notificationRepository.deleteOld(session.user.tenantId, session.user.email, daysOld);
  return { success: true, count };
}