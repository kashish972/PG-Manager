import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const token = req.nextauth.token;
    
    const userRole = token?.role as string;
    
    if (pathname.startsWith('/users') && userRole === 'member') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/persons/:path*', 
    '/payments/:path*', 
    '/users/:path*', 
    '/my-details',
    '/notices/:path*',
    '/maintenance/:path*',
    '/rooms/:path*',
    '/visitors/:path*',
    '/inventory/:path*',
    '/analytics/:path*'
  ],
};