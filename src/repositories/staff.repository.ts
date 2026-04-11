import { ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IStaff, CreateStaffInput, UpdateStaffInput } from '@/types';

export class StaffRepository {
  async create(tenantId: string, input: CreateStaffInput): Promise<IStaff> {
    const db = await connectToTenantDb(tenantId);
    
    const staff: Omit<IStaff, '_id'> = {
      name: input.name,
      phone: input.phone,
      role: input.role,
      joinDate: input.joinDate,
      salary: input.salary,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<IStaff>('staff').insertOne(staff as IStaff);
    return { ...staff, _id: result.insertedId } as IStaff;
  }

  async findById(id: string, tenantId: string): Promise<IStaff | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IStaff>('staff').findOne({ _id: new ObjectId(id) });
  }

  async findAll(tenantId: string): Promise<IStaff[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IStaff>('staff').find().sort({ createdAt: -1 }).toArray();
  }

  async findActive(tenantId: string): Promise<IStaff[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IStaff>('staff').find({ isActive: true }).sort({ role: 1 }).toArray();
  }

  async findByRole(role: string, tenantId: string): Promise<IStaff[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IStaff>('staff').find({ role, isActive: true }).toArray();
  }

  async update(id: string, tenantId: string, input: UpdateStaffInput): Promise<IStaff | null> {
    const db = await connectToTenantDb(tenantId);
    
    await db.collection<IStaff>('staff').updateOne(
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
    const result = await db.collection<IStaff>('staff').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async count(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IStaff>('staff').countDocuments();
  }

  async countActive(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IStaff>('staff').countDocuments({ isActive: true });
  }

  async getTotalMonthlySalary(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    const pipeline = [
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$salary' } } }
    ];
    const result = await db.collection<IStaff>('staff').aggregate(pipeline).toArray();
    return result[0]?.total || 0;
  }
}

export const staffRepository = new StaffRepository();
