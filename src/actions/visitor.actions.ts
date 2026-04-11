'use server';

import { visitorRepository } from '@/repositories/visitor.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getVisitors() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return visitorRepository.findAll(session.user.tenantId);
}

export async function getActiveVisitors() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return visitorRepository.findActive(session.user.tenantId);
}

export async function createVisitor(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const personId = formData.get('personId') as string;
  const visitorName = formData.get('visitorName') as string;
  const phone = formData.get('phone') as string;
  const purpose = formData.get('purpose') as string;
  const vehicleNumber = formData.get('vehicleNumber') as string;

  if (!personId || !visitorName || !purpose) {
    return { error: 'Person, visitor name, and purpose are required' };
  }

  try {
    await visitorRepository.create(session.user.tenantId, {
      personId,
      visitorName,
      phone,
      purpose,
      vehicleNumber,
    });
    revalidatePath('/visitors');
    return { success: true };
  } catch (error) {
    console.error('Create visitor error:', error);
    return { error: 'Failed to log visitor' };
  }
}

export async function checkoutVisitor(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  try {
    await visitorRepository.checkOut(id, session.user.tenantId);
    revalidatePath('/visitors');
    return { success: true };
  } catch (error) {
    console.error('Checkout visitor error:', error);
    return { error: 'Failed to checkout visitor' };
  }
}

export async function deleteVisitor(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const success = await visitorRepository.delete(id, session.user.tenantId);
    revalidatePath('/visitors');
    return { success };
  } catch (error) {
    console.error('Delete visitor error:', error);
    return { error: 'Failed to delete visitor' };
  }
}