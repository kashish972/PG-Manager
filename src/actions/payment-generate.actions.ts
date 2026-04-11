'use server';

import { paymentRepository } from '@/repositories/payment.repository';
import { personRepository } from '@/repositories/person.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date(dateStr);
}

function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export async function generateMonthlyPayments() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const tenantId = session.user.tenantId;
    const currentMonth = getCurrentMonth();
    
    const persons = await personRepository.findActive(tenantId);
    console.log('Active persons:', persons.length, persons.map(p => ({ name: p.name, rent: p.monthlyRent, moveIn: p.moveInDate })));
    
    const existingPayments = await paymentRepository.findByMonth(currentMonth, tenantId);
    console.log('Existing payments:', existingPayments.length, existingPayments.map(p => p.personId.toString()));
    const existingPersonIds = new Set(existingPayments.map(p => p.personId.toString()));
    
    let created = 0;
    let skipped = 0;

    for (const person of persons) {
      const personId = person._id.toString();
      console.log('Processing person:', personId, person.name);
      
      if (existingPersonIds.has(personId)) {
        console.log('Skipped - already exists');
        skipped++;
        continue;
      }

      const moveInDate = parseDate(person.moveInDate);
      const moveInMonth = `${moveInDate.getFullYear()}-${String(moveInDate.getMonth() + 1).padStart(2, '0')}`;
      console.log('Move in month:', moveInMonth, 'Current:', currentMonth);
      
      if (moveInMonth > currentMonth) {
        console.log('Skipped - future move-in');
        skipped++;
        continue;
      }

      const amount = Number(person.monthlyRent) || 0;
      console.log('Amount:', amount);
      if (amount <= 0) {
        console.log('Skipped - no rent');
        skipped++;
        continue;
      }

      const paymentDate = new Date();
      const dueDay = 5;
      paymentDate.setDate(dueDay);
      
      await paymentRepository.create(tenantId, {
        personId,
        amount,
        paymentDate,
        month: currentMonth,
        status: 'pending',
        paymentMethod: 'transfer',
        notes: `Auto-generated for ${getMonthName(currentMonth)}`,
      });
      
      console.log('Created payment for:', person.name);
      created++;
    }

    revalidatePath('/payments');
    revalidatePath('/dashboard');
    
    return { 
      success: true, 
      message: `Created ${created} payment(s), skipped ${skipped} resident(s). Check console for details.` 
    };
  } catch (error) {
    console.error('Generate monthly payments error:', error);
    return { error: 'Failed to generate payments' };
  }
}

export async function checkAndGeneratePayments() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  try {
    const tenantId = session.user.tenantId;
    const currentMonth = getCurrentMonth();
    
    const persons = await personRepository.findActive(tenantId);
    
    const existingPayments = await paymentRepository.findByMonth(currentMonth, tenantId);
    const existingPersonIds = new Set(existingPayments.map(p => p.personId.toString()));
    
    let created = 0;

    for (const person of persons) {
      const personId = person._id.toString();
      
      if (existingPersonIds.has(personId)) continue;

      const moveInDate = parseDate(person.moveInDate);
      const moveInMonth = `${moveInDate.getFullYear()}-${String(moveInDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (moveInMonth > currentMonth) continue;

      const paymentDate = new Date();
      paymentDate.setDate(5);
      
      await paymentRepository.create(tenantId, {
        personId,
        amount: person.monthlyRent,
        paymentDate,
        month: currentMonth,
        status: 'pending',
        paymentMethod: 'transfer',
        notes: `Auto-generated for ${getMonthName(currentMonth)}`,
      });
      
      created++;
    }

    return { success: true, created };
  } catch (error) {
    console.error('Check and generate payments error:', error);
    return { error: 'Failed to check payments' };
  }
}