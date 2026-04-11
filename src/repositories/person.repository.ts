import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IPerson, CreatePersonInput, UpdatePersonInput } from '@/types';

export class PersonRepository {
  async create(tenantId: string, input: CreatePersonInput): Promise<IPerson> {
    const db = await connectToTenantDb(tenantId);
    
    const person: Omit<IPerson, '_id'> = {
      name: input.name,
      aadharCard: input.aadharCard,
      phone: input.phone,
      email: input.email,
      address: input.address,
      roomNumber: input.roomNumber,
      moveInDate: input.moveInDate,
      monthlyRent: input.monthlyRent,
      securityDeposit: input.securityDeposit,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<IPerson>('persons').insertOne(person as IPerson);
    return { ...person, _id: result.insertedId } as IPerson;
  }

  async findById(id: string, tenantId: string): Promise<IPerson | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPerson>('persons').findOne({ _id: new ObjectId(id) });
  }

  async findByEmail(email: string, tenantId: string): Promise<IPerson | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPerson>('persons').findOne({ email });
  }

  async findAll(tenantId: string): Promise<IPerson[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPerson>('persons').find().sort({ createdAt: -1 }).toArray();
  }

  async findActive(tenantId: string): Promise<IPerson[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPerson>('persons').find({ isActive: true }).sort({ roomNumber: 1 }).toArray();
  }

  async update(id: string, tenantId: string, input: UpdatePersonInput): Promise<IPerson | null> {
    const db = await connectToTenantDb(tenantId);
    
    await db.collection<IPerson>('persons').updateOne(
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
    const result = await db.collection<IPerson>('persons').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async count(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPerson>('persons').countDocuments();
  }

  async countActive(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IPerson>('persons').countDocuments({ isActive: true });
  }

  async getTotalRent(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    const pipeline = [
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$monthlyRent' } } }
    ];
    const result = await db.collection<IPerson>('persons').aggregate(pipeline).toArray();
    return result[0]?.total || 0;
  }
}

export const personRepository = new PersonRepository();