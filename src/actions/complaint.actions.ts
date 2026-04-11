'use server';

import { complaintRepository } from '@/repositories/complaint.repository';
import { personRepository } from '@/repositories/person.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ComplaintCategory, ComplaintStatus, ComplaintPriority } from '@/types';

export async function getComplaints() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return complaintRepository.findAll(session.user.tenantId);
}

export async function getComplaintsByStatus(status: ComplaintStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return complaintRepository.findByStatus(status, session.user.tenantId);
}

export async function getComplaint(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return complaintRepository.findById(id, session.user.tenantId);
}

export async function getMyComplaints() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return [];
  
  const persons = await personRepository.findAll(session.user.tenantId);
  const userPerson = persons.find(p => p.email === session.user?.email || p.phone === (session.user as any)?.phone);
  
  if (!userPerson) return [];
  return complaintRepository.findByPerson(userPerson._id.toString(), session.user.tenantId);
}

export async function getComplaintStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { open: 0, in_progress: 0, resolved: 0 };
  return complaintRepository.countByStatus(session.user.tenantId);
}

export async function createComplaint(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { error: 'Unauthorized' };
  }

  const category = formData.get('category') as ComplaintCategory;
  const subject = formData.get('subject') as string;
  const description = formData.get('description') as string;
  const priority = formData.get('priority') as ComplaintPriority;

  if (!category || !subject || !description || !priority) {
    return { error: 'All fields are required' };
  }

  let personId = '';
  
  if (session.user.role === 'member') {
    const persons = await personRepository.findAll(session.user.tenantId);
    const userPerson = persons.find(p => p.email === session.user?.email);
    if (userPerson) {
      personId = userPerson._id.toString();
    }
  } else {
    personId = formData.get('personId') as string;
  }

  if (!personId) {
    return { error: 'Person not found' };
  }

  await complaintRepository.create(session.user.tenantId, personId, {
    category,
    subject,
    description,
    priority,
  });

  revalidatePath('/complaints');
  return { success: true };
}

export async function updateComplaint(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const status = formData.get('status') as ComplaintStatus;
  const resolution = formData.get('resolution') as string;

  const updateData: any = {};
  if (status) updateData.status = status;
  if (resolution) updateData.resolution = resolution;

  await complaintRepository.update(id, session.user.tenantId, updateData);

  revalidatePath('/complaints');
  revalidatePath(`/complaints/${id}`);
  return { success: true };
}

export async function deleteComplaint(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const success = await complaintRepository.delete(id, session.user.tenantId);
  revalidatePath('/complaints');
  return { success };
}
