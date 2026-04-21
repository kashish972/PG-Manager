import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;
const fromSMS = process.env.TWILIO_SMS_FROM;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface NotificationData {
  phone: string;
  name: string;
  message: string;
  type: 'rent_reminder' | 'rent_overdue' | 'payment_received' | 'custom';
}

export async function sendWhatsAppNotification(data: NotificationData): Promise<{ success: boolean; error?: string }> {
  if (!client || !fromWhatsApp) {
    console.error('Twilio WhatsApp not configured');
    return { success: false, error: 'WhatsApp notifications not configured' };
  }

  try {
    const formattedPhone = formatPhoneNumber(data.phone);
    
    await client.messages.create({
      body: `*PG Manager Notification*\n\nDear ${data.name},\n\n${data.message}\n\n- PG Manager`,
      from: fromWhatsApp,
      to: `whatsapp:${formattedPhone}`,
    });

    return { success: true };
  } catch (error: any) {
    console.error('WhatsApp notification error:', error);
    return { success: false, error: error.message || 'Failed to send notification' };
  }
}

export async function sendSMSNotification(data: NotificationData): Promise<{ success: boolean; error?: string }> {
  if (!client || !fromSMS) {
    console.error('Twilio SMS not configured');
    return { success: false, error: 'SMS notifications not configured' };
  }

  try {
    const formattedPhone = formatPhoneNumber(data.phone);
    
    await client.messages.create({
      body: `PG Manager: Dear ${data.name}, ${data.message}`,
      from: fromSMS,
      to: formattedPhone,
    });

    return { success: true };
  } catch (error: any) {
    console.error('SMS notification error:', error);
    return { success: false, error: error.message || 'Failed to send notification' };
  }
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return cleaned;
}

export function generateRentOverdueMessage(name: string, amount: number, month: string): string {
  return `Your rent of Rs. ${amount} for ${month} is overdue. Please make the payment at the earliest to avoid any inconvenience.`;
}

export function generateRentReminderMessage(name: string, amount: number, dueDate: string): string {
  return `This is a reminder that your rent of Rs. ${amount} is due on ${dueDate}. Please ensure timely payment.`;
}

export function generatePaymentReceivedMessage(name: string, amount: number, month: string): string {
  return `We have received your rent payment of Rs. ${amount} for ${month}. Thank you!`;
}
