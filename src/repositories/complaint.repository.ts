import { ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IComplaint, CreateComplaintInput, UpdateComplaintInput, ComplaintStatus } from '@/types';

export class ComplaintRepository {
  async create(tenantId: string, personId: string, input: CreateComplaintInput): Promise<IComplaint> {
    const db = await connectToTenantDb(tenantId);
    
    const complaint: Omit<IComplaint, '_id'> = {
      personId: new ObjectId(personId),
      category: input.category,
      subject: input.subject,
      description: input.description,
      status: 'open',
      priority: input.priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<IComplaint>('complaints').insertOne(complaint as IComplaint);
    return { ...complaint, _id: result.insertedId } as IComplaint;
  }

  async findById(id: string, tenantId: string): Promise<IComplaint | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IComplaint>('complaints').findOne({ _id: new ObjectId(id) });
  }

  async findAll(tenantId: string): Promise<IComplaint[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IComplaint>('complaints').find().sort({ createdAt: -1 }).toArray();
  }

  async findByPerson(personId: string, tenantId: string): Promise<IComplaint[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IComplaint>('complaints')
      .find({ personId: new ObjectId(personId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findByStatus(status: ComplaintStatus, tenantId: string): Promise<IComplaint[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IComplaint>('complaints')
      .find({ status })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async update(id: string, tenantId: string, input: UpdateComplaintInput): Promise<IComplaint | null> {
    const db = await connectToTenantDb(tenantId);
    
    await db.collection<IComplaint>('complaints').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...input,
          updatedAt: new Date(),
        }
      }
    );
    
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IComplaint>('complaints').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async countByStatus(tenantId: string): Promise<{ open: number; in_progress: number; resolved: number }> {
    const db = await connectToTenantDb(tenantId);
    
    const pipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];
    
    const result = await db.collection<IComplaint>('complaints').aggregate(pipeline).toArray();
    
    const counts = { open: 0, in_progress: 0, resolved: 0 };
    result.forEach((r) => {
      if (r._id in counts) {
        counts[r._id as keyof typeof counts] = r.count;
      }
    });
    
    return counts;
  }
}

export const complaintRepository = new ComplaintRepository();
