'use server';

import { personRepository } from '@/repositories/person.repository';
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

  const person = {
    name: formData.get('name') as string,
    aadharCard: formData.get('aadharCard') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    address: formData.get('address') as string,
    blockId: formData.get('blockId') as string,
    roomNumber: formData.get('roomNumber') as string,
    moveInDate: new Date(formData.get('moveInDate') as string),
    monthlyRent: Number(formData.get('monthlyRent')),
    securityDeposit: Number(formData.get('securityDeposit')),
  };

  await personRepository.create(session.user.tenantId, person);

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