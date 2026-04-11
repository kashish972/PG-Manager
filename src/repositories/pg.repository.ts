import { Db, ObjectId } from 'mongodb';
import { connectToMainDb } from '@/lib/db';
import { IPG, CreatePGInput } from '@/types';
import { getClient } from '@/lib/db';
import { userRepository } from './user.repository';

export class PGRepository {
  async create(input: CreatePGInput, ownerEmail: string, ownerName: string): Promise<IPG> {
    const client = await getClient();
    const tenantId = input.slug;
    
    const tenantDb = client.db(`pg_${tenantId}`);
    
    await tenantDb.createCollection('users');
    await tenantDb.createCollection('persons');
    await tenantDb.createCollection('rentPayments');
    await tenantDb.createCollection('complaints');
    await tenantDb.createCollection('staff');
    await tenantDb.createCollection('salaryPayments');
    await tenantDb.createCollection('blocks');
    
    const mainDb = await connectToMainDb();
    
    const pg: Omit<IPG, '_id'> = {
      name: input.name,
      slug: input.slug,
      address: input.address,
      ownerId: new ObjectId(),
      monthlyRent: input.monthlyRent,
      totalRooms: input.totalRooms || 10,
      defaultCapacity: input.defaultCapacity || 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await mainDb.collection<IPG>('pgs').insertOne(pg as IPG);
    
    const ownerUser = await userRepository.createMainUser({
      email: ownerEmail,
      password: 'temp_password',
      name: ownerName,
      role: 'owner',
      tenantId,
    });
    
    return { ...pg, _id: result.insertedId, ownerId: ownerUser._id as ObjectId } as IPG;
  }

  async findById(id: string): Promise<IPG | null> {
    const db = await connectToMainDb();
    return db.collection<IPG>('pgs').findOne({ _id: new ObjectId(id) });
  }

  async findBySlug(slug: string): Promise<IPG | null> {
    const db = await connectToMainDb();
    return db.collection<IPG>('pgs').findOne({ slug });
  }

  async findByOwnerId(ownerId: string): Promise<IPG[]> {
    const db = await connectToMainDb();
    return db.collection<IPG>('pgs').find({ ownerId: new ObjectId(ownerId) }).toArray();
  }

  async findAll(): Promise<IPG[]> {
    const db = await connectToMainDb();
    return db.collection<IPG>('pgs').find().toArray();
  }

  async update(id: string, input: Partial<CreatePGInput>): Promise<IPG | null> {
    const db = await connectToMainDb();
    
    await db.collection<IPG>('pgs').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...input, updatedAt: new Date() } }
    );
    
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = await connectToMainDb();
    const result = await db.collection<IPG>('pgs').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    const db = await connectToMainDb();
    const existing = await db.collection<IPG>('pgs').findOne({ slug });
    return !existing;
  }
}

export const pgRepository = new PGRepository();