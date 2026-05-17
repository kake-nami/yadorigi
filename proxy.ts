import { NextRequest, NextResponse } from 'next/server'

// Paths that are always accessible without setup completion
const SETUP_BYPASS_PREFIXES = ['/setup', '/api', '/_next', '/favicon', '/icon']

// Edge Runtime では Node の crypto が使えないため TextEncoder で定数時間比較
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  let result = 0
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i]
  }
  return result === 0
}

/**
 * 1. /setup redirect: send un-initialized users to /setup before they reach any page.
 *    Completion is tracked via the `yadorigi_setup_completed` HttpOnly cookie set by
 *    /api/setup/init after the recovery-key acknowledgement step.
 *
 * 2. Optional HTTP Basic Auth protection.
 *    Set SIFTLY_USERNAME and SIFTLY_PASSWORD in your .env to enable.
 *    Leave both unset (the default) for unrestricted local access.
 *    The bookmarklet endpoint is excluded so cross-origin imports from x.com
 *    continue to work regardless of auth configuration.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // ── Setup redirect ────────────────────────────────────────────────────────
  if (!SETUP_BYPASS_PREFIXES.some(p => pathname.startsWith(p))) {
    const setupCompleted = request.cookies.get('yadorigi_setup_completed')
    if (!setupCompleted) {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
  }

  // ── Optional Basic Auth ───────────────────────────────────────────────────
  const username = process.env.SIFTLY_USERNAME?.trim()
  const password = process.env.SIFTLY_PASSWORD?.trim()

  if (!username || !password) return NextResponse.next()

  // The bookmarklet endpoint is called cross-origin from x.com and cannot
  // include Basic Auth credentials.
  if (pathname === '/api/import/bookmarklet') {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('Authorization')

  if (authHeader?.startsWith('Basic ')) {
    try {
      const decoded = atob(authHeader.slice(6))
      const colonIdx = decoded.indexOf(':')
      if (colonIdx !== -1) {
        const user = decoded.slice(0, colonIdx)
        const pass = decoded.slice(colonIdx + 1)
        if (timingSafeStringEqual(user, username) && timingSafeStringEqual(pass, password)) {
          return NextResponse.next()
        }
      }
    } catch {
      // malformed base64 → fall through to 401
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Siftly"' },
  })
}

export const config = {
  matcher: [
    // Match everything except Next.js internals (_next/static, _next/image,
    // _next/webpack-hmr dev HMR websocket, etc.) and static root files.
    '/((?!_next/|favicon.ico|icon.svg).*)',
  ],
}
