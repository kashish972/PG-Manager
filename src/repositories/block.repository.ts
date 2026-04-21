import { ObjectId } from 'mongodb';
import { getClient } from '@/lib/db';
import { IBlock, IRoom } from '@/types';

export class BlockRepository {
  private getCollection(tenantId: string) {
    return async () => {
      const client = await getClient();
      const db = client.db(`pg_${tenantId}`);
      return db.collection<IBlock>('blocks');
    };
  }

  async create(tenantId: string, name: string): Promise<IBlock> {
    const collection = await this.getCollection(tenantId)();
    const block: Omit<IBlock, '_id'> = {
      name,
      rooms: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(block as IBlock);
    return { ...block, _id: result.insertedId } as IBlock;
  }

  async findAll(tenantId: string): Promise<IBlock[]> {
    const collection = await this.getCollection(tenantId)();
    return collection.find().sort({ createdAt: 1 }).toArray();
  }

  async findById(tenantId: string, id: string): Promise<IBlock | null> {
    const collection = await this.getCollection(tenantId)();
    return collection.findOne({ _id: new ObjectId(id) });
  }

  async update(tenantId: string, id: string, input: Partial<IBlock>): Promise<IBlock | null> {
    const collection = await this.getCollection(tenantId)();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...input, updatedAt: new Date() } }
    );
    return this.findById(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const collection = await this.getCollection(tenantId)();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async addRoom(tenantId: string, blockId: string, room: IRoom): Promise<IBlock | null> {
    const collection = await this.getCollection(tenantId)();
    await collection.updateOne(
      { _id: new ObjectId(blockId) },
      { $push: { rooms: room }, $set: { updatedAt: new Date() } }
    );
    return this.findById(tenantId, blockId);
  }

  async updateRoom(tenantId: string, blockId: string, roomIndex: number, room: Partial<IRoom>): Promise<IBlock | null> {
    const collection = await this.getCollection(tenantId)();
    const block = await this.findById(tenantId, blockId);
    if (!block || !block.rooms[roomIndex]) return null;

    const updatedRooms = [...block.rooms];
    updatedRooms[roomIndex] = { ...updatedRooms[roomIndex], ...room };

    await collection.updateOne(
      { _id: new ObjectId(blockId) },
      { $set: { rooms: updatedRooms, updatedAt: new Date() } }
    );
    return this.findById(tenantId, blockId);
  }

  async deleteRoom(tenantId: string, blockId: string, roomIndex: number): Promise<IBlock | null> {
    const collection = await this.getCollection(tenantId)();
    const block = await this.findById(tenantId, blockId);
    if (!block) return null;

    const updatedRooms = block.rooms.filter((_, i) => i !== roomIndex);

    await collection.updateOne(
      { _id: new ObjectId(blockId) },
      { $set: { rooms: updatedRooms, updatedAt: new Date() } }
    );
    return this.findById(tenantId, blockId);
  }

  async renameBlock(tenantId: string, blockId: string, newName: string): Promise<IBlock | null> {
    return this.update(tenantId, blockId, { name: newName });
  }
}

export const blockRepository = new BlockRepository();
