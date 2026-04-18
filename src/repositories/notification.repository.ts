import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';

export interface INotification {
  _id?: ObjectId;
  userId: string;
  title: string;
  message: string;
  type: 'rent_reminder' | 'rent_overdue' | 'payment_received' | 'general' | 'push' | 'whatsapp' | 'sms';
  isRead: boolean;
  createdAt: Date;
}

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: INotification['type'];
}

export class NotificationRepository {
  async create(tenantId: string, input: CreateNotificationInput): Promise<INotification> {
    const db = await connectToTenantDb(tenantId);
    
    const notification: Omit<INotification, '_id'> = {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      isRead: false,
      createdAt: new Date(),
    };
    
    const result = await db.collection<INotification>('notifications').insertOne(notification as INotification);
    return { ...notification, _id: result.insertedId } as INotification;
  }

  async createMany(tenantId: string, notifications: CreateNotificationInput[]): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    
    const docs = notifications.map(n => ({
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: false,
      createdAt: new Date(),
    }));
    
    const result = await db.collection<INotification>('notifications').insertMany(docs as INotification[]);
    return result.insertedCount;
  }

  async findByUser(tenantId: string, userId: string, limit: number = 50): Promise<INotification[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<INotification>('notifications')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<INotification>('notifications')
      .countDocuments({ userId, isRead: false });
  }

  async markAsRead(tenantId: string, notificationId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<INotification>('notifications')
      .updateOne({ _id: new ObjectId(notificationId) }, { $set: { isRead: true } });
    return result.modifiedCount > 0;
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<INotification>('notifications')
      .updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return result.modifiedCount;
  }

  async delete(tenantId: string, notificationId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<INotification>('notifications')
      .deleteOne({ _id: new ObjectId(notificationId) });
    return result.deletedCount > 0;
  }

  async deleteOld(tenantId: string, userId: string, daysOld: number = 30): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await db.collection<INotification>('notifications')
      .deleteMany({ userId, createdAt: { $lt: cutoffDate } });
    return result.deletedCount;
  }
}

export const notificationRepository = new NotificationRepository();