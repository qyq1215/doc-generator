import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// 需要登录才能访问的页面
const protectedRoutes = ['/generate', '/settings'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute && !req.auth) {
    // 未登录，重定向到登录页面
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // 匹配所有需要保护的路由
    '/generate/:path*',
    '/settings/:path*',
  ],
};

