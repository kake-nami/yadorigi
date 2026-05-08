import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'

// H-3: 信頼済みオリジンは環境変数で固定。動的ホスト検出は Open Redirect の素地になる。
function getTrustedOrigin(): string {
  return process.env.YADORIGI_BASE_URL?.trim().replace(/\/$/, '') ?? 'http://localhost:3000'
}

export async function GET(req: NextRequest) {
  // 環境変数 → DB設定 の順でフォールバック
  const envClientId = process.env.X_OAUTH_CLIENT_ID?.trim()
  const clientIdSetting = await prisma.setting.findUnique({ where: { key: 'x_oauth_client_id' } })
  const resolvedClientId = envClientId ?? clientIdSetting?.value
  if (!resolvedClientId) {
    return NextResponse.json({ error: 'X OAuth Client ID not configured' }, { status: 400 })
  }

  // C-2: code_verifier と state をDBではなく HttpOnly Cookie に保存
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')

  const origin = getTrustedOrigin()
  const redirectUri = `${origin}/api/import/x-oauth/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: resolvedClientId,
    redirect_uri: redirectUri,
    scope: 'bookmark.read tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/api/import/x-oauth/callback',
    maxAge: 600, // 10分
    secure: process.env.NODE_ENV === 'production',
  }

  const response = NextResponse.json({ authUrl: `https://x.com/i/oauth2/authorize?${params}` })
  response.cookies.set('__pkce_v', codeVerifier, cookieOpts)
  response.cookies.set('__pkce_s', state, cookieOpts)
  return response
}
