'use server';

import { maintenanceRepository } from '@/repositories/maintenance.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { MaintenancePriority, MaintenanceStatus } from '@/types';

export async function getMaintenanceRequests() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return maintenanceRepository.findAll(session.user.tenantId);
}

export async function getMaintenanceByPerson(personId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return maintenanceRepository.findByPerson(personId, session.user.tenantId);
}

export async function getMaintenanceStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { pending: 0, in_progress: 0, resolved: 0 };
  return maintenanceRepository.countByStatus(session.user.tenantId);
}

export async function createMaintenanceRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const personId = formData.get('personId') as string;
  const issue = formData.get('issue') as string;
  const description = formData.get('description') as string;
  const priority = formData.get('priority') as MaintenancePriority;

  if (!personId || !issue || !priority) {
    return { error: 'Person, issue, and priority are required' };
  }

  try {
    await maintenanceRepository.create(session.user.tenantId, {
      personId,
      issue,
      description,
      priority,
    });
    revalidatePath('/maintenance');
    return { success: true };
  } catch (error) {
    console.error('Create maintenance request error:', error);
    return { error: 'Failed to create request' };
  }
}

export async function updateMaintenanceStatus(id: string, status: MaintenanceStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    await maintenanceRepository.updateStatus(id, session.user.tenantId, status);
    revalidatePath('/maintenance');
    return { success: true };
  } catch (error) {
    console.error('Update maintenance status error:', error);
    return { error: 'Failed to update status' };
  }
}

export async function deleteMaintenanceRequest(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const success = await maintenanceRepository.delete(id, session.user.tenantId);
    revalidatePath('/maintenance');
    return { success };
  } catch (error) {
    console.error('Delete maintenance request error:', error);
    return { error: 'Failed to delete request' };
  }
}