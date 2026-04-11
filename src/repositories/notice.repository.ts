import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { INotice, NoticePriority } from '@/types';

export class NoticeRepository {
  async create(tenantId: string, input: { title: string; content: string; priority: NoticePriority; createdBy: string }): Promise<INotice> {
    const db = await connectToTenantDb(tenantId);
    
    const notice: Omit<INotice, '_id'> = {
      title: input.title,
      content: input.content,
      priority: input.priority,
      isActive: true,
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<INotice>('notices').insertOne(notice as INotice);
    return { ...notice, _id: result.insertedId } as INotice;
  }

  async findById(id: string, tenantId: string): Promise<INotice | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<INotice>('notices').findOne({ _id: new ObjectId(id) });
  }

  async findAll(tenantId: string): Promise<INotice[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<INotice>('notices').find({ isActive: true }).sort({ createdAt: -1 }).toArray();
  }

  async findActive(tenantId: string): Promise<INotice[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<INotice>('notices')
      .find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .toArray();
  }

  async update(id: string, tenantId: string, input: Partial<{ title: string; content: string; priority: NoticePriority; isActive: boolean }>): Promise<INotice | null> {
    const db = await connectToTenantDb(tenantId);
    
    const updateData: Partial<INotice> = { ...input, updatedAt: new Date() };
    
    await db.collection<INotice>('notices').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<INotice>('notices').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async count(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<INotice>('notices').countDocuments({ isActive: true });
  }
}

export const noticeRepository = new NoticeRepository();