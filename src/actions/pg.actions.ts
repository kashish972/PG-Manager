'use server';

import { pgRepository } from '@/repositories/pg.repository';
import { userRepository } from '@/repositories/user.repository';
import { personRepository } from '@/repositories/person.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function registerPG(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const address = formData.get('address') as string;
  const monthlyRent = Number(formData.get('monthlyRent'));
  const totalRooms = Number(formData.get('totalRooms')) || 10;
  const defaultCapacity = Number(formData.get('defaultCapacity')) || 2;
  const ownerEmail = formData.get('ownerEmail') as string;
  const ownerName = formData.get('ownerName') as string;
  const password = formData.get('password') as string;

  const available = await pgRepository.checkSlugAvailability(slug);
  if (!available) {
    return { error: 'PG slug already exists' };
  }

  const pg = await pgRepository.create(
    { name, slug, address, monthlyRent, totalRooms, defaultCapacity },
    ownerEmail,
    ownerName
  );

  await userRepository.createMainUser({
    email: ownerEmail,
    password,
    name: ownerName,
    role: 'owner',
    tenantId: slug,
  });

  revalidatePath('/');
  redirect(`/login?tenant=${slug}`);
}

export async function checkSlug(slug: string) {
  const available = await pgRepository.checkSlugAvailability(slug);
  return { available };
}

export async function getCurrentPG() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return null;
  const pg = await pgRepository.findBySlug(session.user.tenantId);
  if (!pg) return null;
  return {
    name: pg.name || '',
    slug: pg.slug || '',
    address: pg.address || '',
    monthlyRent: Number(pg.monthlyRent) || 0,
    totalRooms: Number(pg.totalRooms) || 10,
    defaultCapacity: Number(pg.defaultCapacity) || 2,
    roomMappings: pg.roomMappings || {},
    upiId: pg.upiId || '',
    noticePeriodDays: Number(pg.noticePeriodDays) || 30,
  };
}

export async function addRooms(count: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const pg = await pgRepository.findBySlug(session.user.tenantId);
    if (!pg) return { error: 'PG not found' };

    const currentTotal = Number(pg.totalRooms) || 10;
    const newTotal = currentTotal + count;
    await pgRepository.update(pg._id.toString(), { totalRooms: newTotal } as any);
    revalidatePath('/rooms');
    return { success: true };
  } catch (error) {
    console.error('Add rooms error:', error);
    return { error: 'Failed to add rooms' };
  }
}

export async function updateRoomNumber(oldNumber: string, newNumber: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const pg = await pgRepository.findBySlug(session.user.tenantId);
    if (!pg) return { error: 'PG not found' };

    const persons = await personRepository.findAll(session.user.tenantId);
    const roomMappings = pg.roomMappings || {};
    
    for (const person of persons) {
      if (person.roomNumber === oldNumber) {
        await personRepository.update(person._id.toString(), session.user.tenantId, {
          roomNumber: newNumber
        } as any);
      }
    }

    roomMappings[oldNumber] = newNumber;
    await pgRepository.update(pg._id.toString(), { roomMappings } as any);

    revalidatePath('/rooms');
    return { success: true };
  } catch (error) {
    console.error('Update room error:', error);
    return { error: 'Failed to update room number' };
  }
}

export async function updateUPISettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role !== 'owner') {
    return { error: 'Only owner can update UPI settings' };
  }

  try {
    const upiId = formData.get('upiId') as string;
    const noticePeriodDays = Number(formData.get('noticePeriodDays')) || 30;
    
    const pg = await pgRepository.findBySlug(session.user.tenantId);
    if (!pg) return { error: 'PG not found' };

    await pgRepository.update(pg._id.toString(), { 
      upiId,
      noticePeriodDays 
    } as any);
    revalidatePath('/payments');
    revalidatePath('/upi-settings');
    return { success: true };
  } catch (error) {
    console.error('Update UPI error:', error);
    return { error: 'Failed to update UPI settings' };
  }
}