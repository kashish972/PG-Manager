'use server';

import { staffRepository } from '@/repositories/staff.repository';
import { salaryRepository } from '@/repositories/salary.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { StaffRole } from '@/types';

export async function getStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return staffRepository.findAll(session.user.tenantId);
}

export async function getActiveStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return staffRepository.findActive(session.user.tenantId);
}

export async function getStaffById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return staffRepository.findById(id, session.user.tenantId);
}

export async function getStaffSalaryHistory(staffId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  return salaryRepository.findByStaff(staffId, session.user.tenantId);
}

export async function getStaffStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { total: 0, active: 0, monthlySalary: 0, pendingSalary: 0 };

  const tenantId = session.user.tenantId;
  const staff = await staffRepository.findAll(tenantId);
  const activeStaff = staff.filter(s => s.isActive);
  const monthlySalary = activeStaff.reduce((sum, s) => sum + s.salary, 0);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = await salaryRepository.getTotalPaidThisMonth(tenantId);
  const pendingSalary = monthlySalary - paidThisMonth;

  return {
    total: staff.length,
    active: activeStaff.length,
    monthlySalary,
    pendingSalary: Math.max(0, pendingSalary),
  };
}

export async function getStaffPendingMonths(staffId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const staff = await staffRepository.findById(staffId, session.user.tenantId);
  if (!staff) return [];

  const paidMonths = await salaryRepository.getPaidMonths(staffId, session.user.tenantId);
  
  const joinDate = new Date(staff.joinDate);
  const now = new Date();
  const pending: string[] = [];

  const startMonth = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`;
  const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const start = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  const months: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    months.push(monthKey);
    current.setMonth(current.getMonth() + 1);
  }

  for (const month of months) {
    if (!paidMonths.includes(month) && month <= endMonth) {
      pending.push(month);
    }
  }

  return pending;
}

export async function createStaff(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const role = formData.get('role') as StaffRole;
  const joinDate = formData.get('joinDate') as string;
  const salary = Number(formData.get('salary')) || 0;

  if (!name || !phone || !role || !joinDate) {
    return { error: 'All fields are required' };
  }

  await staffRepository.create(session.user.tenantId, {
    name,
    phone,
    role,
    joinDate: new Date(joinDate),
    salary,
  });

  revalidatePath('/staff');
  return { success: true };
}

export async function updateStaff(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const role = formData.get('role') as StaffRole;
  const joinDate = formData.get('joinDate') as string;
  const salary = Number(formData.get('salary'));
  const isActive = formData.get('isActive') === 'true';

  const updateData: any = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (role) updateData.role = role;
  if (joinDate) updateData.joinDate = new Date(joinDate);
  if (!isNaN(salary)) updateData.salary = salary;
  updateData.isActive = isActive;

  await staffRepository.update(id, session.user.tenantId, updateData);

  revalidatePath('/staff');
  revalidatePath(`/staff/${id}`);
  return { success: true };
}

export async function deleteStaff(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const success = await staffRepository.delete(id, session.user.tenantId);
  revalidatePath('/staff');
  return { success };
}

export async function paySalary(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const staffId = formData.get('staffId') as string;
  const amount = Number(formData.get('amount')) || 0;
  const month = formData.get('month') as string;
  const paymentDate = formData.get('paymentDate') as string;
  const notes = formData.get('notes') as string;

  if (!staffId || !amount || !month || !paymentDate) {
    return { error: 'All fields are required' };
  }

  const alreadyPaid = await salaryRepository.isMonthPaid(staffId, month, session.user.tenantId);
  if (alreadyPaid) {
    return { error: 'Salary already paid for this month' };
  }

  await salaryRepository.create(session.user.tenantId, {
    staffId,
    amount,
    month,
    paymentDate: new Date(paymentDate),
    notes,
  });

  revalidatePath('/staff');
  revalidatePath(`/staff/${staffId}`);
  return { success: true };
}
