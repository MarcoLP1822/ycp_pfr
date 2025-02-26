/**
 * @file middleware.ts
 * @description
 * This middleware protects routes by checking if the user is authenticated.
 * It intercepts incoming requests to protected routes (e.g., /dashboard, /proofreading)
 * and checks for the presence of an authentication token in the cookies.
 * If no valid token is found, the middleware redirects the user to the login page.
 *
 * Key features:
 * - Checks if the current request URL is for a protected route.
 * - Retrieves the authentication token from cookies.
 * - Redirects unauthenticated users to the login page.
 *
 * @dependencies
 * - Next.js: Provides NextResponse and NextRequest for middleware operations.
 *
 * @notes
 * - This implementation assumes that a valid authentication token is stored in a cookie named "token".
 * - The matcher configuration ensures that the middleware is only applied to protected routes.
 * - In a production environment, consider using HTTP-only cookies for enhanced security.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define the protected routes that require authentication.
  const protectedPaths = ['/dashboard', '/proofreading'];

  // Determine if the current request is for a protected route.
  const isProtectedRoute = protectedPaths.some((path) => pathname.startsWith(path));

  // Retrieve the authentication token from cookies.
  const token = request.cookies.get('token')?.value;

  // If the route is protected and no token is found, redirect to the login page.
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Otherwise, allow the request to continue.
  return NextResponse.next();
}

// Configure the middleware to apply only to specific routes.
export const config = {
  matcher: ['/dashboard/:path*', '/proofreading/:path*'],
};
