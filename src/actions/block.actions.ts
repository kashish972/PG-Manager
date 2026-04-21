'use server';

import { blockRepository } from '@/repositories/block.repository';
import { personRepository } from '@/repositories/person.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { IRoom } from '@/types';

export async function getBlocks() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return [];
  const blocks = await blockRepository.findAll(session.user.tenantId);
  return blocks.map(b => ({
    _id: b._id.toString(),
    name: b.name,
    rooms: b.rooms,
  }));
}

export async function createBlock(name: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const block = await blockRepository.create(session.user.tenantId, name);
    revalidatePath('/rooms');
    return { success: true, block };
  } catch (error) {
    console.error('Create block error:', error);
    return { error: 'Failed to create block' };
  }
}

export async function renameBlock(blockId: string, newName: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    await blockRepository.renameBlock(session.user.tenantId, blockId, newName);
    revalidatePath('/rooms');
    return { success: true };
  } catch (error) {
    console.error('Rename block error:', error);
    return { error: 'Failed to rename block' };
  }
}

export async function deleteBlock(blockId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    await blockRepository.delete(session.user.tenantId, blockId);
    revalidatePath('/rooms');
    return { success: true };
  } catch (error) {
    console.error('Delete block error:', error);
    return { error: 'Failed to delete block' };
  }
}

export async function addRoom(blockId: string, roomNumber: string, capacity: number, isAC: boolean, count: number = 1, isMultiple: boolean = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const startNum = parseInt(roomNumber) || 1;
    for (let i = 0; i < count; i++) {
      const roomNum = count === 1 || !isMultiple 
        ? roomNumber 
        : String(startNum + i);
      const room: IRoom = { roomNumber: roomNum, capacity, isAC };
      await blockRepository.addRoom(session.user.tenantId, blockId, room);
    }
    revalidatePath('/rooms');
    return { success: true };
  } catch (error) {
    console.error('Add room error:', error);
    return { error: 'Failed to add room' };
  }
}

export async function updateRoom(blockId: string, roomIndex: number, roomNumber: string, capacity: number, isAC: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    await blockRepository.updateRoom(session.user.tenantId, blockId, roomIndex, {
      roomNumber,
      capacity,
      isAC,
    });
    revalidatePath('/rooms');
    return { success: true };
  } catch (error) {
    console.error('Update room error:', error);
    return { error: 'Failed to update room' };
  }
}

export async function deleteRoom(blockId: string, roomIndex: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    await blockRepository.deleteRoom(session.user.tenantId, blockId, roomIndex);
    revalidatePath('/rooms');
    return { success: true };
  } catch (error) {
    console.error('Delete room error:', error);
    return { error: 'Failed to delete room' };
  }
}

export async function getRoomsWithOccupancy() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return { blocks: [], persons: [] };

  const blocks = await blockRepository.findAll(session.user.tenantId);
  const persons = await personRepository.findAll(session.user.tenantId);

  const serializedBlocks = blocks.map(block => ({
    _id: block._id.toString(),
    name: block.name,
    rooms: block.rooms,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  }));

  return { blocks: serializedBlocks, persons };
}
