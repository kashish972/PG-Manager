'use server';

import { inventoryRepository } from '@/repositories/inventory.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { InventoryCondition } from '@/types';

export async function getInventory() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return inventoryRepository.findAll(session.user.tenantId);
}

export async function getInventoryCategories() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return inventoryRepository.getCategories(session.user.tenantId);
}

export async function createInventoryItem(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const quantity = Number(formData.get('quantity'));
  const condition = formData.get('condition') as InventoryCondition;
  const location = formData.get('location') as string;
  const notes = formData.get('notes') as string;

  if (!name || !category || !quantity || !condition || !location) {
    return { error: 'All required fields must be filled' };
  }

  try {
    await inventoryRepository.create(session.user.tenantId, {
      name,
      category,
      quantity,
      condition,
      location,
      notes,
    });
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Create inventory error:', error);
    return { error: 'Failed to create inventory item' };
  }
}

export async function updateInventoryItem(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const quantity = Number(formData.get('quantity'));
  const condition = formData.get('condition') as InventoryCondition;
  const location = formData.get('location') as string;
  const notes = formData.get('notes') as string;

  try {
    await inventoryRepository.update(id, session.user.tenantId, {
      name,
      category,
      quantity,
      condition,
      location,
      notes,
    });
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Update inventory error:', error);
    return { error: 'Failed to update inventory item' };
  }
}

export async function deleteInventoryItem(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const success = await inventoryRepository.delete(id, session.user.tenantId);
    revalidatePath('/inventory');
    return { success };
  } catch (error) {
    console.error('Delete inventory error:', error);
    return { error: 'Failed to delete inventory item' };
  }
}