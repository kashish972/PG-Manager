import { Db, ObjectId } from 'mongodb';
import { connectToMainDb, connectToTenantDb } from '@/lib/db';
import { IUser, CreateUserInput } from '@/types';
import bcrypt from 'bcryptjs';

export class UserRepository {
  async createMainUser(input: CreateUserInput & { tenantId?: string }): Promise<IUser> {
    const db = await connectToMainDb();
    const hashedPassword = await bcrypt.hash(input.password, 10);
    
    const user: Omit<IUser, '_id'> = {
      email: input.email,
      password: hashedPassword,
      role: input.role,
      name: input.name,
      tenantId: input.tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<IUser>('users').insertOne(user as IUser);
    return { ...user, _id: result.insertedId } as IUser;
  }

  async createTenantUser(tenantId: string, input: CreateUserInput): Promise<IUser> {
    const db = await connectToTenantDb(tenantId);
    const hashedPassword = await bcrypt.hash(input.password, 10);
    
    const user: Omit<IUser, '_id'> = {
      email: input.email,
      password: hashedPassword,
      role: input.role,
      name: input.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<IUser>('users').insertOne(user as IUser);
    return { ...user, _id: result.insertedId } as IUser;
  }

  async findByEmail(email: string, tenantId?: string): Promise<IUser | null> {
    if (tenantId) {
      const db = await connectToTenantDb(tenantId);
      return db.collection<IUser>('users').findOne({ email }) as Promise<IUser | null>;
    }
    const db = await connectToMainDb();
    return db.collection<IUser>('users').findOne({ email }) as Promise<IUser | null>;
  }

  async findById(id: string, tenantId: string): Promise<IUser | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IUser>('users').findOne({ _id: new ObjectId(id) }) as Promise<IUser | null>;
  }

  async findAll(tenantId: string): Promise<IUser[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IUser>('users').find().toArray() as Promise<IUser[]>;
  }

  async update(id: string, tenantId: string, input: Partial<CreateUserInput>): Promise<IUser | null> {
    const db = await connectToTenantDb(tenantId);
    const updateData: Partial<IUser> = { ...input, updatedAt: new Date() };
    
    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }
    
    await db.collection<IUser>('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IUser>('users').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async verifyPassword(user: IUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}

export const userRepository = new UserRepository();