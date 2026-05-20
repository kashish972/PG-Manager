import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pgRepository } from '@/repositories/pg.repository';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
  }

  const pg = await pgRepository.findBySlug(slug);
  if (!pg) {
    return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
  }

  const response = NextResponse.redirect(
    new URL(`/dashboard?superadmin_tenant=${slug}`, request.url)
  );

  response.cookies.set('superadmin_active_tenant', slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return response;
}
