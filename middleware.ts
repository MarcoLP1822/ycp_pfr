/**
 * @file middleware.ts
 * @description
 * This middleware protects routes by checking if the user is authenticated.
 * It intercepts incoming requests to protected routes (e.g., /dashboard, /proofreading)
 * and checks for the presence of an authentication token in the cookies.
 * If no valid token is found, the middleware redirects the user to the login page.
 *
 * @dependencies
 * - Next.js: Provides NextResponse and NextRequest for middleware operations.
 *
 * @notes
 * - This implementation assumes that a valid authentication token is stored in a cookie named "token".
 * - The "matcher" configuration ensures that the middleware is only applied to protected routes.
 * - In a production environment, consider using HTTP-only cookies for enhanced security.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes that require authentication.
  const protectedPaths = ['/dashboard', '/proofreading'];

  // Check if the current pathname is a protected route.
  const isProtectedRoute = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Retrieve the authentication token from cookies. This token should be set upon successful login.
  const token = request.cookies.get('token')?.value;

  // If accessing a protected route and no token is present, redirect to the login page.
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated or route is not protected, allow the request to proceed.
  return NextResponse.next();
}

// Configure middleware to apply only to specific routes.
export const config = {
  matcher: ['/dashboard/:path*', '/proofreading/:path*'],
};
