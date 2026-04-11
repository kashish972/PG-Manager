import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IMaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '@/types';

export class MaintenanceRepository {
  async create(tenantId: string, input: { personId: string; issue: string; description?: string; priority: MaintenancePriority }): Promise<IMaintenanceRequest> {
    const db = await connectToTenantDb(tenantId);
    
    const request: Omit<IMaintenanceRequest, '_id'> = {
      personId: new ObjectId(input.personId),
      issue: input.issue,
      description: input.description,
      priority: input.priority,
      status: 'pending',
      createdAt: new Date(),
    };
    
    const result = await db.collection<IMaintenanceRequest>('maintenanceRequests').insertOne(request as IMaintenanceRequest);
    return { ...request, _id: result.insertedId } as IMaintenanceRequest;
  }

  async findById(id: string, tenantId: string): Promise<IMaintenanceRequest | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IMaintenanceRequest>('maintenanceRequests').findOne({ _id: new ObjectId(id) });
  }

  async findAll(tenantId: string): Promise<IMaintenanceRequest[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IMaintenanceRequest>('maintenanceRequests').find().sort({ createdAt: -1 }).toArray();
  }

  async findByPerson(personId: string, tenantId: string): Promise<IMaintenanceRequest[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IMaintenanceRequest>('maintenanceRequests')
      .find({ personId: new ObjectId(personId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findByStatus(status: MaintenanceStatus, tenantId: string): Promise<IMaintenanceRequest[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IMaintenanceRequest>('maintenanceRequests')
      .find({ status })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async updateStatus(id: string, tenantId: string, status: MaintenanceStatus): Promise<IMaintenanceRequest | null> {
    const db = await connectToTenantDb(tenantId);
    
    const updateData: Partial<IMaintenanceRequest> = { status };
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }
    
    await db.collection<IMaintenanceRequest>('maintenanceRequests').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IMaintenanceRequest>('maintenanceRequests').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async countByStatus(tenantId: string): Promise<{ pending: number; in_progress: number; resolved: number }> {
    const db = await connectToTenantDb(tenantId);
    const pipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];
    const result = await db.collection<IMaintenanceRequest>('maintenanceRequests').aggregate(pipeline).toArray();
    
    const counts = { pending: 0, in_progress: 0, resolved: 0 };
    result.forEach((r) => {
      if (r._id in counts) {
        counts[r._id as keyof typeof counts] = r.count;
      }
    });
    
    return counts;
  }
}

export const maintenanceRepository = new MaintenanceRepository();