// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Ottieni la sessione
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rotte protette
  const protectedPaths = ['/dashboard', '/proofreading']
  const isProtectedRoute = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  )

  // Se la rotta è protetta e non c'è sessione, reindirizza a '/'
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Altrimenti prosegui
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/proofreading/:path*'],
}
