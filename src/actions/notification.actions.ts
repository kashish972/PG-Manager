'use server';

import { personRepository } from '@/repositories/person.repository';
import { paymentRepository } from '@/repositories/payment.repository';
import { blockRepository } from '@/repositories/block.repository';
import { notificationRepository } from '@/repositories/notification.repository';
import { sendWhatsAppNotification, sendSMSNotification, generateRentOverdueMessage, NotificationData } from '@/lib/notification.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function sendNotificationToPerson(
  personId: string,
  message: string,
  method: 'whatsapp' | 'sms' = 'whatsapp'
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const person = await personRepository.findById(personId, session.user.tenantId);
  if (!person) {
    return { error: 'Person not found' };
  }

  if (!person.phone) {
    return { error: 'Phone number not available for this person' };
  }

  const notificationData: NotificationData = {
    phone: person.phone,
    name: person.name,
    message,
    type: 'custom',
  };

  const result = method === 'whatsapp' 
    ? await sendWhatsAppNotification(notificationData)
    : await sendSMSNotification(notificationData);

  if (person.email) {
    await notificationRepository.create(session.user.tenantId, {
      userId: person.email,
      title: 'Notification',
      message,
      type: method === 'whatsapp' ? 'whatsapp' : 'sms',
    });
  }

  return result;
}

export async function sendBulkRentReminders() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const persons = await personRepository.findActive(session.user.tenantId);
  const payments = await paymentRepository.findAll(session.user.tenantId);
  const blocks = await blockRepository.findAll(session.user.tenantId);
  
  const results: { personId: string; name: string; status: string; error?: string }[] = [];
  const overduePayments = payments.filter(p => 
    p.status === 'pending' || p.status === 'overdue'
  );

  for (const person of persons) {
    const personOverduePayments = overduePayments.filter(p => 
      String(p.personId) === String(person._id)
    );
    
    if (personOverduePayments.length === 0) continue;
    if (!person.phone) {
      results.push({ personId: person._id.toString(), name: person.name, status: 'skipped', error: 'No phone number' });
      continue;
    }

    const totalAmount = personOverduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const months = personOverduePayments.map(p => p.month).join(', ');
    
    const block = blocks.find(b => b._id.toString() === person.blockId?.toString());
    const roomInfo = block ? `${block.name} - Room ${person.roomNumber}` : `Room ${person.roomNumber}`;
    
    const message = `Your rent of Rs. ${totalAmount} for ${months} (${roomInfo}) is overdue. Please make the payment at the earliest.`;

    const notificationData: NotificationData = {
      phone: person.phone,
      name: person.name,
      message,
      type: 'rent_overdue',
    };

    const result = await sendWhatsAppNotification(notificationData);
    
    results.push({
      personId: person._id.toString(),
      name: person.name,
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });
  }

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  return {
    success: true,
    summary: { total: results.length, sent, failed, skipped },
    details: results,
  };
}

export async function checkAndNotifyOverduePayments(): Promise<{ notified: number; errors: string[] }> {
  const tenants = await getAllTenants();
  const results = { notified: 0, errors: [] as string[] };

  for (const tenantId of tenants) {
    try {
      const currentDate = new Date();
      const persons = await personRepository.findActive(tenantId);
      const payments = await paymentRepository.getOverduePayments(tenantId);
      
      for (const payment of payments) {
        const person = persons.find(p => String(p._id) === String(payment.personId));
        if (!person || !person.phone) continue;

        const message = generateRentOverdueMessage(
          person.name,
          payment.amount,
          payment.month
        );

        const notificationData: NotificationData = {
          phone: person.phone,
          name: person.name,
          message,
          type: 'rent_overdue',
        };

        const result = await sendWhatsAppNotification(notificationData);
        if (result.success) {
          results.notified++;
        } else {
          results.errors.push(`${person.name}: ${result.error}`);
        }
      }
    } catch (error: any) {
      results.errors.push(`Tenant ${tenantId}: ${error.message}`);
    }
  }

  return results;
}

async function getAllTenants(): Promise<string[]> {
  return [];
}
