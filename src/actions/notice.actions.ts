'use server';

import { noticeRepository } from '@/repositories/notice.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { NoticePriority } from '@/types';

export async function getNotices() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return noticeRepository.findActive(session.user.tenantId);
}

export async function getNotice(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return noticeRepository.findById(id, session.user.tenantId);
}

export async function createNotice(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const priority = formData.get('priority') as NoticePriority;

  if (!title || !content || !priority) {
    return { error: 'All fields are required' };
  }

  try {
    await noticeRepository.create(session.user.tenantId, {
      title,
      content,
      priority,
      createdBy: session.user.id,
    });
    revalidatePath('/notices');
    return { success: true };
  } catch (error) {
    console.error('Create notice error:', error);
    return { error: 'Failed to create notice' };
  }
}

export async function updateNotice(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const priority = formData.get('priority') as NoticePriority;

  try {
    await noticeRepository.update(id, session.user.tenantId, {
      title,
      content,
      priority,
    });
    revalidatePath('/notices');
    return { success: true };
  } catch (error) {
    console.error('Update notice error:', error);
    return { error: 'Failed to update notice' };
  }
}

export async function deleteNotice(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const success = await noticeRepository.delete(id, session.user.tenantId);
    revalidatePath('/notices');
    return { success };
  } catch (error) {
    console.error('Delete notice error:', error);
    return { error: 'Failed to delete notice' };
  }
}