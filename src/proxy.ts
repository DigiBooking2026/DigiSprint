import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

export default async function proxy(request: NextRequest) {
  const publicPaths = ['/login', '/register', '/logo.png', '/api/auth/login', '/api/auth/register', '/api/auth/logout']
  
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  const session = await getSessionFromRequest(request)

  if (!session && !isPublicPath) {
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && isPublicPath && !request.nextUrl.pathname.startsWith('/api/auth/logout')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
