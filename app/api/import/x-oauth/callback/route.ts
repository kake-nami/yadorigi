import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/db'
import { storeXTokens } from '@/lib/db-crypto'

// H-3: 信頼済みオリジンは環境変数で固定
function getTrustedOrigin(): string {
  return process.env.YADORIGI_BASE_URL?.trim().replace(/\/$/, '') ?? 'http://localhost:3000'
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const importPage = `${getTrustedOrigin()}/import`

  if (error) {
    return NextResponse.redirect(`${importPage}?x_error=${encodeURIComponent(error)}`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${importPage}?x_error=missing_params`)
  }

  // C-2: PKCE state/verifier を Cookie から読み取る（DBには書いていない）
  const cookieVerifier = req.cookies.get('__pkce_v')?.value
  const cookieState = req.cookies.get('__pkce_s')?.value

  if (!cookieVerifier || !cookieState) {
    return NextResponse.redirect(`${importPage}?x_error=missing_pkce`)
  }

  // H-2: タイミング攻撃対策として timingSafeEqual で state を比較
  const stateBufSaved = Buffer.from(cookieState)
  const stateBufRecv = Buffer.from(state)
  const stateValid =
    stateBufSaved.length === stateBufRecv.length &&
    crypto.timingSafeEqual(stateBufSaved, stateBufRecv)
  if (!stateValid) {
    return NextResponse.redirect(`${importPage}?x_error=state_mismatch`)
  }

  const clientIdSetting = await prisma.setting.findUnique({ where: { key: 'x_oauth_client_id' } })
  const clientSecretSetting = await prisma.setting.findUnique({ where: { key: 'x_oauth_client_secret' } })
  const resolvedClientId = process.env.X_OAUTH_CLIENT_ID?.trim() ?? clientIdSetting?.value
  const resolvedClientSecret = process.env.X_OAUTH_CLIENT_SECRET?.trim() ?? clientSecretSetting?.value

  if (!resolvedClientId) {
    return NextResponse.redirect(`${importPage}?x_error=missing_config`)
  }

  const redirectUri = `${getTrustedOrigin()}/api/import/x-oauth/callback`

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: cookieVerifier,
    client_id: resolvedClientId,
  })

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (resolvedClientSecret) {
    headers['Authorization'] = `Basic ${Buffer.from(`${resolvedClientId}:${resolvedClientSecret}`).toString('base64')}`
  }

  const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body: tokenBody,
  })

  if (!tokenRes.ok) {
    // L-1: レスポンスボディ（トークン断片が含まれる可能性）はログしない
    console.error('X OAuth token exchange failed: HTTP', tokenRes.status)
    return NextResponse.redirect(`${importPage}?x_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
  }

  // C-1: アクセストークン・リフレッシュトークンを OS keychain に保存
  await storeXTokens(tokens.access_token, tokens.refresh_token)
  // 有効期限とユーザー情報のみ DB に残す
  const expiry = String(Date.now() + tokens.expires_in * 1000)
  await prisma.setting.upsert({
    where: { key: 'x_oauth_token_expiry' },
    create: { key: 'x_oauth_token_expiry', value: expiry },
    update: { value: expiry },
  })

  try {
    const userRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (userRes.ok) {
      const userData = await userRes.json() as { data: { id: string; name: string; username: string } }
      await prisma.setting.upsert({ where: { key: 'x_oauth_user_id' }, create: { key: 'x_oauth_user_id', value: userData.data.id }, update: { value: userData.data.id } })
      await prisma.setting.upsert({ where: { key: 'x_oauth_user_name' }, create: { key: 'x_oauth_user_name', value: userData.data.name }, update: { value: userData.data.name } })
      await prisma.setting.upsert({ where: { key: 'x_oauth_user_username' }, create: { key: 'x_oauth_user_username', value: userData.data.username }, update: { value: userData.data.username } })
    }
  } catch {
    // 非クリティカル
  }

  // C-2: PKCE Cookie をクリア
  const response = NextResponse.redirect(importPage)
  const clearOpts = { httpOnly: true, sameSite: 'lax' as const, path: '/api/import/x-oauth/callback', maxAge: 0 }
  response.cookies.set('__pkce_v', '', clearOpts)
  response.cookies.set('__pkce_s', '', clearOpts)
  return response
}
