'use server';

import { personRepository } from '@/repositories/person.repository';
import { pushSubscriptionRepository, IPushSubscription } from '@/repositories/push-subscription.repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface PushSubscriptionData {
  subscription: any;
  endpoint: string;
}

export async function subscribeToPush(pushSubscription: PushSubscriptionData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  try {
    await pushSubscriptionRepository.create(session.user.tenantId, {
      userId: session.user.email,
      subscription: pushSubscription.subscription,
      endpoint: pushSubscription.endpoint,
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to subscribe' };
  }
}

export async function unsubscribeFromPush() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session?.user?.email) {
    return { error: 'Unauthorized' };
  }

  try {
    await pushSubscriptionRepository.delete(session.user.tenantId, session.user.email);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to unsubscribe' };
  }
}

export async function sendPushToPerson(
  personId: string,
  message: string,
  title: string = 'PG Manager'
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const person = await personRepository.findById(personId, session.user.tenantId);
  if (!person) {
    return { error: 'Person not found' };
  }

  if (!person.email) {
    return { error: 'No email for this person' };
  }

  const subscriptions = await pushSubscriptionRepository.findByUser(session.user.tenantId, person.email);
  
  if (subscriptions.length === 0) {
    return { error: 'No push subscription found for this person. They need to be logged in.' };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      const result = await clientShowPushNotification(title, message, sub.subscription);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { success: true, sent, failed };
}

async function clientShowPushNotification(
  title: string, 
  body: string, 
  subscription: any
): Promise<{ success: boolean; error?: string }> {
  const webPush = await import('web-push');
  
  try {
    await webPush.default.sendNotification(
      JSON.parse(JSON.stringify(subscription)),
      JSON.stringify({ title, body, icon: '/icons/notification-icon.png' }),
      {
        TTL: 86400,
        vapidDetails: {
          subject: 'mailto:admin@pgmanager.com',
          publicKey: process.env.NEXT_PUBLIC_VAPID_KEY || '',
          privateKey: process.env.VAPID_PRIVATE_KEY || '',
        },
      }
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendPushToAllResidents(message: string, title: string = 'PG Manager') {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'member') {
    return { error: 'Unauthorized' };
  }

  const persons = await personRepository.findActive(session.user.tenantId);
  const allSubscriptions = await pushSubscriptionRepository.findAll(session.user.tenantId);
  
  const results = { sent: 0, failed: 0, noSubscription: 0 };

  for (const person of persons) {
    if (!person.email) continue;
    
    const userSubs = allSubscriptions.filter(s => s.userId === person.email);
    
    if (userSubs.length === 0) {
      results.noSubscription++;
      continue;
    }

    for (const sub of userSubs) {
      try {
        await clientShowPushNotification(title, message, sub.subscription);
        results.sent++;
      } catch {
        results.failed++;
      }
    }
  }

  return { success: true, ...results };
}