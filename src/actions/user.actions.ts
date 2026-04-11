'use server';

import { userRepository } from '@/repositories/user.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'admin' | 'member';

  const existing = await userRepository.findByEmail(email, session.user.tenantId);
  if (existing) {
    return { error: 'User already exists' };
  }

  await userRepository.createTenantUser(session.user.tenantId, {
    email,
    name,
    password,
    role,
  });

  revalidatePath('/users');
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'admin' | 'member';

  const updateData: any = { name };
  if (password) updateData.password = password;
  if (role) updateData.role = role;

  await userRepository.update(id, session.user.tenantId, updateData);

  revalidatePath('/users');
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'owner') {
    return { error: 'Only owner can delete users' };
  }

  const success = await userRepository.delete(id, session.user.tenantId);
  revalidatePath('/users');
  return { success };
}

export async function getUsers() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return userRepository.findAll(session.user.tenantId);
}