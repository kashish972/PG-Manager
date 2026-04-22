import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

function isMobileDevice(userAgent: string): boolean {
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile', 'mobi'];
  const ua = userAgent.toLowerCase();
  return mobileKeywords.some((keyword) => ua.includes(keyword));
}

export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;
  
  if (
    userAgent.toLowerCase().includes('linkedin') ||
    userAgent.toLowerCase().includes('linkedinappbrowser')
  ) {
    const url = request.nextUrl.clone();
    
    if (isMobileDevice(userAgent)) {
      url.port = '443';
      url.protocol = 'https:';
      return NextResponse.redirect(
        `googlechrome://navigate?url=${encodeURIComponent(url.toString())}`
      );
    } else {
      return NextResponse.redirect(new URL('/browser-warning', request.url));
    }
  }
  
  const protectedPaths = [
    '/dashboard',
    '/persons',
    '/payments',
    '/users',
    '/my-details',
    '/notifications',
    '/notices',
    '/maintenance',
    '/rooms',
    '/visitors',
    '/inventory',
    '/analytics',
  ];
  
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  
  if (isProtectedPath) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const userRole = token.role as string;
    
    if (pathname.startsWith('/users') && userRole === 'member') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};