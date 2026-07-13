import { NextResponse } from 'next/server';
import { connectToMainDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const db = await connectToMainDb();
    const existingSuperAdmin = await db.collection('users').findOne({ role: 'superadmin' });

    if (existingSuperAdmin) {
      return NextResponse.json({ error: 'Super admin already exists' }, { status: 400 });
    }

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      name,
      role: 'superadmin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Super admin created successfully' });
  } catch (error) {
    console.error('Setup super admin error:', error);
    return NextResponse.json({ error: 'Failed to create super admin' }, { status: 500 });
  }
}
