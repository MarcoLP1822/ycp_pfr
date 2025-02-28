// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Otteniamo la sessione
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rotte protette
  const protectedPaths = ['/dashboard', '/proofreading']
  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Se l'utente non è loggato e la rotta è protetta, redirect alla home
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/proofreading/:path*'],
}
