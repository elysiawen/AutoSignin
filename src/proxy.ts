import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol;
  const isSecure = proto === 'https';
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token',
  });
  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  if (isLoggedIn && (pathname.startsWith('/auth') || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname.startsWith('/auth') || pathname === '/') {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

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
