import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';

export interface IPushSubscription {
  _id?: ObjectId;
  userId: string;
  subscription: any;
  endpoint: string;
  createdAt: Date;
}

interface CreatePushSubscriptionInput {
  userId: string;
  subscription: any;
  endpoint: string;
}

export class PushSubscriptionRepository {
  async create(tenantId: string, input: CreatePushSubscriptionInput): Promise<IPushSubscription> {
    const db = await connectToTenantDb(tenantId);
    
    const subscription: Omit<IPushSubscription, '_id'> = {
      userId: input.userId,
      subscription: input.subscription,
      endpoint: input.endpoint,
      createdAt: new Date(),
    };
    
    const result = await db.collection<IPushSubscription>('pushSubscriptions').insertOne(subscription as IPushSubscription);
    return { ...subscription, _id: result.insertedId } as IPushSubscription;
  }

  async findByUser(tenantId: string, userId: string): Promise<IPushSubscription[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPushSubscription>('pushSubscriptions')
      .find({ userId })
      .toArray();
  }

  async findAll(tenantId: string): Promise<IPushSubscription[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPushSubscription>('pushSubscriptions').find().toArray();
  }

  async delete(tenantId: string, userId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IPushSubscription>('pushSubscriptions').deleteMany({ userId });
    return result.deletedCount > 0;
  }
}

export const pushSubscriptionRepository = new PushSubscriptionRepository();