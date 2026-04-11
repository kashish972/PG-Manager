import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IVisitor } from '@/types';

export class VisitorRepository {
  async create(tenantId: string, input: { personId: string; visitorName: string; phone?: string; purpose: string; vehicleNumber?: string }): Promise<IVisitor> {
    const db = await connectToTenantDb(tenantId);
    
    const visitor: Omit<IVisitor, '_id'> = {
      personId: new ObjectId(input.personId),
      visitorName: input.visitorName,
      phone: input.phone,
      purpose: input.purpose,
      inTime: new Date(),
      outTime: undefined,
      vehicleNumber: input.vehicleNumber,
      createdAt: new Date(),
    };
    
    const result = await db.collection<IVisitor>('visitors').insertOne(visitor as IVisitor);
    return { ...visitor, _id: result.insertedId } as IVisitor;
  }

  async findById(id: string, tenantId: string): Promise<IVisitor | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IVisitor>('visitors').findOne({ _id: new ObjectId(id) });
  }

  async findAll(tenantId: string): Promise<IVisitor[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IVisitor>('visitors').find().sort({ inTime: -1 }).toArray();
  }

  async findActive(tenantId: string): Promise<IVisitor[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IVisitor>('visitors').find({ outTime: undefined }).sort({ inTime: -1 }).toArray();
  }

  async findByPerson(personId: string, tenantId: string): Promise<IVisitor[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IVisitor>('visitors').find({ personId: new ObjectId(personId) }).sort({ inTime: -1 }).toArray();
  }

  async checkOut(id: string, tenantId: string): Promise<IVisitor | null> {
    const db = await connectToTenantDb(tenantId);
    
    await db.collection<IVisitor>('visitors').updateOne(
      { _id: new ObjectId(id) },
      { $set: { outTime: new Date() } }
    );
    
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IVisitor>('visitors').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async getTodayCount(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return db.collection<IVisitor>('visitors').countDocuments({
      inTime: { $gte: today }
    });
  }
}

export const visitorRepository = new VisitorRepository();