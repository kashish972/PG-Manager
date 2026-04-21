'use server';

import { personRepository } from '@/repositories/person.repository';
import { userRepository } from '@/repositories/user.repository';
import { pgRepository } from '@/repositories/pg.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getPersons() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  const persons = await personRepository.findAll(session.user.tenantId);
  return persons.map(p => ({
    _id: p._id.toString(),
    name: p.name,
    aadharCard: p.aadharCard,
    phone: p.phone,
    email: p.email,
    address: p.address,
    blockId: p.blockId,
    roomNumber: p.roomNumber,
    moveInDate: p.moveInDate,
    monthlyRent: p.monthlyRent,
    securityDeposit: p.securityDeposit,
    isActive: p.isActive,
    photo: p.photo,
    aadharCardImage: p.aadharCardImage,
    noticeRequestedAt: p.noticeRequestedAt,
    noticeApprovedAt: p.noticeApprovedAt,
    moveOutDate: p.moveOutDate,
    noticeReason: p.noticeReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function getActivePersons() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  const persons = await personRepository.findActive(session.user.tenantId);
  return persons.map(p => ({
    _id: p._id.toString(),
    name: p.name,
    aadharCard: p.aadharCard,
    phone: p.phone,
    email: p.email,
    address: p.address,
    blockId: p.blockId,
    roomNumber: p.roomNumber,
    moveInDate: p.moveInDate,
    monthlyRent: p.monthlyRent,
    securityDeposit: p.securityDeposit,
    isActive: p.isActive,
    photo: p.photo,
    aadharCardImage: p.aadharCardImage,
    noticeRequestedAt: p.noticeRequestedAt,
    noticeApprovedAt: p.noticeApprovedAt,
    moveOutDate: p.moveOutDate,
    noticeReason: p.noticeReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function getPerson(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const p = await personRepository.findById(id, session.user.tenantId);
  if (!p) return null;
  return {
    _id: p._id.toString(),
    name: p.name,
    aadharCard: p.aadharCard,
    phone: p.phone,
    email: p.email,
    address: p.address,
    blockId: p.blockId,
    roomNumber: p.roomNumber,
    moveInDate: p.moveInDate,
    monthlyRent: p.monthlyRent,
    securityDeposit: p.securityDeposit,
    isActive: p.isActive,
    photo: p.photo,
    aadharCardImage: p.aadharCardImage,
    noticeRequestedAt: p.noticeRequestedAt,
    noticeApprovedAt: p.noticeApprovedAt,
    moveOutDate: p.moveOutDate,
    noticeReason: p.noticeReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function getPersonByEmail(email: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const p = await personRepository.findByEmail(email, session.user.tenantId);
  if (!p) return null;
  return {
    _id: p._id.toString(),
    name: p.name,
    aadharCard: p.aadharCard,
    phone: p.phone,
    email: p.email,
    address: p.address,
    roomNumber: p.roomNumber,
    moveInDate: p.moveInDate,
    monthlyRent: p.monthlyRent,
    securityDeposit: p.securityDeposit,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function createPerson(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const email = formData.get('email') as string;
  const name = formData.get('name') as string;

  const person = {
    name,
    aadharCard: formData.get('aadharCard') as string,
    aadharCardImage: formData.get('aadharCardImage') as string || undefined,
    photo: formData.get('photo') as string || undefined,
    phone: formData.get('phone') as string,
    email,
    address: formData.get('address') as string,
    blockId: formData.get('blockId') as string,
    roomNumber: formData.get('roomNumber') as string,
    moveInDate: new Date(formData.get('moveInDate') as string),
    monthlyRent: Number(formData.get('monthlyRent')),
    securityDeposit: Number(formData.get('securityDeposit')),
  };

  await personRepository.create(session.user.tenantId, person);

  const existingUser = await userRepository.findByEmail(email, session.user.tenantId);
  if (!existingUser) {
    const defaultPassword = `${name.toLowerCase().replace(/\s+/g, '')}123`;
    await userRepository.createTenantUser(session.user.tenantId, {
      email,
      name,
      password: defaultPassword,
      role: 'member',
    });
  }

  revalidatePath('/persons');
  return { success: true };
}

export async function updatePerson(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const updateData: any = {
    name: formData.get('name') as string,
    aadharCard: formData.get('aadharCard') as string,
    aadharCardImage: formData.get('aadharCardImage') as string || undefined,
    photo: formData.get('photo') as string || undefined,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    address: formData.get('address') as string,
    blockId: formData.get('blockId') as string,
    roomNumber: formData.get('roomNumber') as string,
    moveInDate: new Date(formData.get('moveInDate') as string),
    monthlyRent: Number(formData.get('monthlyRent')),
    securityDeposit: Number(formData.get('securityDeposit')),
  };

  const isActive = formData.get('isActive');
  if (isActive !== null) {
    updateData.isActive = isActive === 'true';
  }

  await personRepository.update(id, session.user.tenantId, updateData);

  revalidatePath('/persons');
  return { success: true };
}

export async function deletePerson(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const success = await personRepository.delete(id, session.user.tenantId);
  revalidatePath('/persons');
  return { success };
}

export async function togglePersonStatus(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const person = await personRepository.findById(id, session.user.tenantId);
  if (!person) return { error: 'Person not found' };

  await personRepository.update(id, session.user.tenantId, { isActive: !person.isActive });

  revalidatePath('/persons');
  return { success: true };
}

export async function requestMoveOutNotice(personId: string, reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  try {
    const pg = await pgRepository.findBySlug(session.user.tenantId);
    if (!pg) return { error: 'PG not found' };

    const noticePeriodDays = Number(pg.noticePeriodDays) || 30;
    const noticeRequestedAt = new Date();
    const moveOutDate = new Date();
    moveOutDate.setDate(moveOutDate.getDate() + noticePeriodDays);

    await personRepository.update(personId, session.user.tenantId, {
      noticeRequestedAt,
      noticeReason: reason,
      moveOutDate,
    } as any);

    revalidatePath('/persons');
    revalidatePath('/my-details');
    return { success: true, moveOutDate };
  } catch (error) {
    console.error('Request notice error:', error);
    return { error: 'Failed to submit notice request' };
  }
}

export async function approveMoveOutNotice(personId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const noticeApprovedAt = new Date();

    await personRepository.update(personId, session.user.tenantId, {
      noticeApprovedAt,
    } as any);

    revalidatePath('/persons');
    return { success: true };
  } catch (error) {
    console.error('Approve notice error:', error);
    return { error: 'Failed to approve notice' };
  }
}

export async function cancelMoveOutNotice(personId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  try {
    await personRepository.update(personId, session.user.tenantId, {
      noticeRequestedAt: null,
      noticeApprovedAt: null,
      moveOutDate: null,
      noticeReason: null,
    } as any);

    revalidatePath('/persons');
    revalidatePath('/my-details');
    return { success: true };
  } catch (error) {
    console.error('Cancel notice error:', error);
    return { error: 'Failed to cancel notice' };
  }
}

export async function rejectMoveOutNotice(personId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    await personRepository.update(personId, session.user.tenantId, {
      noticeRequestedAt: null,
      noticeApprovedAt: null,
      moveOutDate: null,
      noticeReason: null,
    } as any);

    revalidatePath('/persons');
    revalidatePath('/my-details');
    return { success: true };
  } catch (error) {
    console.error('Reject notice error:', error);
    return { error: 'Failed to reject notice' };
  }
}