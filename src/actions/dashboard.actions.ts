'use server';

import { personRepository } from '@/repositories/person.repository';
import { paymentRepository } from '@/repositories/payment.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardStats } from '@/types';

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  
  const tenantId = session.user.tenantId;
  
  const totalPersons = await personRepository.count(tenantId);
  const activePersons = await personRepository.countActive(tenantId);
  const totalRent = await personRepository.getTotalRent(tenantId);
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const paidPayments = await paymentRepository.getPaidPaymentsByMonth(tenantId);
  const pendingPayments = await paymentRepository.getPendingPaymentsByMonth(tenantId);
  const overduePayments = await paymentRepository.getOverduePayments(tenantId);
  
  const monthlyRevenue = await paymentRepository.getMonthlyRevenue(tenantId, currentMonth);
  
  return {
    totalPersons,
    activePersons,
    totalRent,
    pendingPayments: pendingPayments.length,
    paidPayments: paidPayments.length,
    overduePayments: overduePayments.length,
    monthlyRevenue,
  };
}