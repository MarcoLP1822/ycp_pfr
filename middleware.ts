/**
 * @file middleware.ts
 * @description
 * This middleware protects routes by checking if the user is authenticated.
 * It intercepts incoming requests to protected routes (e.g., /dashboard, /proofreading)
 * and checks for a valid authentication session via Supabase.
 * If no valid session is found, the middleware redirects the user to the login page.
 *
 * Key features:
 * - Checks if the current request URL is for a protected route.
 * - Retrieves the authentication session using Supabase Auth Helpers.
 * - Redirects unauthenticated users to the login page.
 *
 * @dependencies
 * - Next.js: Provides NextResponse and NextRequest for middleware operations.
 * - @supabase/auth-helpers-nextjs: Provides authentication utilities.
 *
 * @notes
 * - This implementation uses Supabase to verify user sessions instead of relying on a custom token cookie.
 * - The matcher configuration ensures that the middleware is only applied to protected routes.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define the protected routes that require authentication.
  const protectedPaths = ['/dashboard', '/proofreading'];

  // Determine if the current request is for a protected route.
  const isProtectedRoute = protectedPaths.some((path) => pathname.startsWith(path));

  // Initialize the Supabase client for the middleware.
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient({ req: request, res });

  // Retrieve the user session from Supabase.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If the route is protected and no session is found, redirect to the login page.
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Otherwise, allow the request to continue.
  return res;
}

// Configure the middleware to apply only to specific routes.
export const config = {
  matcher: ['/dashboard/:path*', '/proofreading/:path*'],
};
