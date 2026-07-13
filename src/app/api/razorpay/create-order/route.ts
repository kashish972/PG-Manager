import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pgRepository } from '@/repositories/pg.repository';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pg = await pgRepository.findBySlug(session.user.tenantId);
    if (!pg || !pg.isRazorpayEnabled || !pg.razorpayKeyId || !pg.razorpayKeySecret) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 400 });
    }

    const { amount, currency = 'INR', receipt, notes } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: pg.razorpayKeyId,
      key_secret: pg.razorpayKeySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
      notes,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: pg.razorpayKeyId,
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
