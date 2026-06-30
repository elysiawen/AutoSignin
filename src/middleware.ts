import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and API auth routes - skip
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check session token - 从代理头判断是否 HTTPS
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol;
  const isSecure = proto === 'https';
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token',
  });
  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  // Logged in user visiting login/register/home -> redirect to dashboard
  if (isLoggedIn && (pathname.startsWith('/auth') || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Public routes - no auth needed
  if (pathname.startsWith('/auth') || pathname === '/') {
    return NextResponse.next();
  }

  // Not logged in -> redirect to login
  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Admin routes - require ADMIN role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '权限不足' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/).*)',
  ],
};
