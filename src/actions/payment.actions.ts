'use server';

import { paymentRepository } from '@/repositories/payment.repository';
import { personRepository } from '@/repositories/person.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getPayments() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return paymentRepository.findAll(session.user.tenantId);
}

export async function getPaymentsByPerson(personId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return paymentRepository.findByPerson(personId, session.user.tenantId);
}

export async function getPayment(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return paymentRepository.findById(id, session.user.tenantId);
}

export async function createPayment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const payment = {
    personId: formData.get('personId') as string,
    amount: Number(formData.get('amount')),
    paymentDate: new Date(formData.get('paymentDate') as string),
    month: formData.get('month') as string,
    status: formData.get('status') as 'paid' | 'pending' | 'overdue',
    paymentMethod: formData.get('paymentMethod') as 'cash' | 'transfer' | 'upi' | 'razorpay',
    notes: formData.get('notes') as string,
    razorpayPaymentId: formData.get('razorpayPaymentId') as string || undefined,
    razorpayOrderId: formData.get('razorpayOrderId') as string || undefined,
  };

  await paymentRepository.create(session.user.tenantId, payment);

  revalidatePath('/payments');
  return { success: true };
}

export async function updatePayment(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const updateData: any = {
    amount: Number(formData.get('amount')),
    paymentDate: new Date(formData.get('paymentDate') as string),
    month: formData.get('month') as string,
    status: formData.get('status') as 'paid' | 'pending' | 'overdue',
    paymentMethod: formData.get('paymentMethod') as 'cash' | 'transfer' | 'upi' | 'razorpay',
    notes: formData.get('notes') as string,
  };

  await paymentRepository.update(id, session.user.tenantId, updateData);

  revalidatePath('/payments');
  return { success: true };
}

export async function updatePaymentByMember(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    if (!session.user.tenantId) {
      return { error: 'Tenant not found' };
    }

    const person = await personRepository.findByEmail(session.user.email || '', session.user.tenantId);
    if (!person) {
      return { error: 'Person not found for email: ' + session.user.email };
    }

    const payment = await paymentRepository.findById(id, session.user.tenantId);
    if (!payment) {
      return { error: 'Payment not found with id: ' + id };
    }

    if (String(payment.personId) !== String(person._id)) {
      return { error: 'Payment does not belong to this person' };
    }

    const razorpayPaymentId = formData.get('razorpayPaymentId') as string;
    const razorpayOrderId = formData.get('razorpayOrderId') as string;

    if (!razorpayPaymentId || !razorpayOrderId) {
      return { error: 'Missing Razorpay payment details' };
    }

    const updateData: any = {
      status: 'paid',
      paymentDate: new Date(),
      paymentMethod: 'razorpay',
      razorpayPaymentId,
      razorpayOrderId,
      notes: formData.get('notes') as string || 'Paid via Razorpay',
    };

    await paymentRepository.update(id, session.user.tenantId, updateData);

    revalidatePath('/pay-rent');
    return { success: true };
  } catch (error: any) {
    console.error('Update payment by member error:', error);
    return { error: 'Failed to update payment: ' + (error.message || error) };
  }
}

export async function deletePayment(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const success = await paymentRepository.delete(id, session.user.tenantId);
  revalidatePath('/payments');
  return { success };
}

export async function getPaymentStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  
  const statusCounts = await paymentRepository.countByStatus(session.user.tenantId);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = await paymentRepository.getMonthlyRevenue(session.user.tenantId, currentMonth);
  
  return {
    ...statusCounts,
    monthlyRevenue,
  };
}