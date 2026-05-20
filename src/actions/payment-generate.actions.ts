'use server';

import { paymentRepository } from '@/repositories/payment.repository';
import { personRepository } from '@/repositories/person.repository';
import { connectToTenantDb } from '@/lib/db';
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
    
    let created = 0;
    let skipped = 0;
    
    for (const person of persons) {
      const personId = person._id.toString();
      console.log('Processing person:', personId, person.name);
      
      const moveInDate = parseDate(person.moveInDate);
      const moveInMonth = `${moveInDate.getFullYear()}-${String(moveInDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (moveInMonth > currentMonth) {
        console.log('Skipped - future move-in');
        skipped++;
        continue;
      }
      
      const amount = Number(person.monthlyRent) || 0;
      if (amount <= 0) {
        console.log('Skipped - no rent');
        skipped++;
        continue;
      }
      
      // Generate payments for all months from move-in to current month
      const startMonthParts = moveInMonth.split('-').map(Number);
      const startNum = startMonthParts[0] * 12 + startMonthParts[1];
      const currentParts = currentMonth.split('-').map(Number);
      const currentNum = currentParts[0] * 12 + currentParts[1];
      
      for (let m = startNum; m <= currentNum; m++) {
        const year = Math.floor(m / 12);
        const month = m % 12 || 12;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        // Check if payment already exists for this month
        const existing = await paymentRepository.findByMonth(monthStr, tenantId);
        const hasPayment = existing.some(p => p.personId.toString() === personId);
        
        if (hasPayment) {
          console.log('Skipped - already exists for', monthStr);
          continue;
        }
        
        const paymentDate = new Date();
        paymentDate.setDate(5);
        
        // Mark as overdue if it's a past month
        const status = monthStr < currentMonth ? 'overdue' : 'pending';
        
        await paymentRepository.create(tenantId, {
          personId,
          amount,
          paymentDate,
          month: monthStr,
          status,
          paymentMethod: 'transfer',
          notes: `Auto-generated for ${getMonthName(monthStr)}`,
        });
        
        console.log('Created payment for:', person.name, 'month:', monthStr, 'status:', status);
        created++;
      }
    }
    
    // Mark any remaining pending payments from past months as overdue
    await paymentRepository.markOverduePayments(tenantId, currentMonth);
    
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

async function markOverduePayments(tenantId: string, currentMonth: string) {
  const db = await connectToTenantDb(tenantId);
  
  // Mark all pending payments from previous months as overdue
  const result = await db.collection('rentPayments').updateMany(
    { 
      status: 'pending',
      month: { $lt: currentMonth }
    },
    { $set: { status: 'overdue' } }
  );
  
  console.log('Marked overdue:', result.modifiedCount, 'payments');
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