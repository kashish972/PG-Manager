import { Db, ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IInventoryItem, InventoryCondition } from '@/types';

export class InventoryRepository {
  async create(tenantId: string, input: { name: string; category: string; quantity: number; condition: InventoryCondition; location: string; notes?: string }): Promise<IInventoryItem> {
    const db = await connectToTenantDb(tenantId);
    
    const item: Omit<IInventoryItem, '_id'> = {
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      condition: input.condition,
      location: input.location,
      notes: input.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection<IInventoryItem>('inventory').insertOne(item as IInventoryItem);
    return { ...item, _id: result.insertedId } as IInventoryItem;
  }

  async findById(id: string, tenantId: string): Promise<IInventoryItem | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IInventoryItem>('inventory').findOne({ _id: new ObjectId(id) });
  }

  async findAll(tenantId: string): Promise<IInventoryItem[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IInventoryItem>('inventory').find().sort({ category: 1, name: 1 }).toArray();
  }

  async findByCategory(category: string, tenantId: string): Promise<IInventoryItem[]> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IInventoryItem>('inventory').find({ category }).toArray();
  }

  async update(id: string, tenantId: string, input: Partial<{ name: string; category: string; quantity: number; condition: InventoryCondition; location: string; notes: string; lastServiced: Date }>): Promise<IInventoryItem | null> {
    const db = await connectToTenantDb(tenantId);
    
    const updateData: Partial<IInventoryItem> = { ...input, updatedAt: new Date() };
    
    await db.collection<IInventoryItem>('inventory').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IInventoryItem>('inventory').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IInventoryItem>('inventory').distinct('category');
    return result as string[];
  }

  async getTotalCount(tenantId: string): Promise<number> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IInventoryItem>('inventory').countDocuments();
  }
}

export const inventoryRepository = new InventoryRepository();