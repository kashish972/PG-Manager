import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paymentRepository } from '@/repositories/payment.repository';
import { personRepository } from '@/repositories/person.repository';
import { connectToTenantDb } from '@/lib/db';

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const currentMonth = getCurrentMonth();
    
    const persons = await personRepository.findActive(tenantId);
    let created = 0;
    
    for (const person of persons) {
      const personId = person._id.toString();
      const moveInDate = parseDate(person.moveInDate);
      const moveInMonth = `${moveInDate.getFullYear()}-${String(moveInDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (moveInMonth > currentMonth) continue;
      
      const amount = Number(person.monthlyRent) || 0;
      if (amount <= 0) continue;
      
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
        
        if (hasPayment) continue;
        
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
        
        created++;
      }
    }
    
    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error('Auto-generate payments error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
