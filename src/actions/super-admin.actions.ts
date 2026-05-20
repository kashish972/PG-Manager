'use server';

import { cookies } from 'next/headers';
import { pgRepository } from '@/repositories/pg.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { IPG } from '@/types';

export async function getAllPGs(): Promise<{ pgs: IPG[] } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'superadmin') {
    return { error: 'Unauthorized' };
  }

  try {
    const pgs = await pgRepository.findAll();
    return { pgs };
  } catch (error) {
    console.error('Get all PGs error:', error);
    return { error: 'Failed to fetch PGs' };
  }
}

export async function togglePGStatus(pgId: string, currentStatus: string | undefined): Promise<{ success: boolean } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'superadmin') {
    return { error: 'Unauthorized' };
  }

  try {
    const newStatus = (!currentStatus || currentStatus === 'active') ? 'suspended' : 'active';
    await pgRepository.updateStatus(pgId, newStatus);
    revalidatePath('/super-admin/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Toggle PG status error:', error);
    return { error: 'Failed to update PG status' };
  }
}

export async function getPGById(pgId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'superadmin') {
    return { error: 'Unauthorized' };
  }

  try {
    const pg = await pgRepository.findById(pgId);
    if (!pg) return { error: 'PG not found' };
    return { pg };
  } catch (error) {
    console.error('Get PG error:', error);
    return { error: 'Failed to fetch PG' };
  }
}

export async function setActiveTenant(slug: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'superadmin') {
    return { error: 'Unauthorized' };
  }

  const pg = await pgRepository.findBySlug(slug);
  if (!pg) {
    return { error: 'PG not found' };
  }

  const cookieStore = await cookies();
  cookieStore.set('superadmin_active_tenant', slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return { success: true, slug };
}

export async function clearActiveTenant() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'superadmin') {
    return { error: 'Unauthorized' };
  }

  const cookieStore = await cookies();
  cookieStore.set('superadmin_active_tenant', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return { success: true };
}
