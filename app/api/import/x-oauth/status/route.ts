import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getXAccessToken } from '@/lib/db-crypto'

export async function GET() {
  const clientIdSetting = await prisma.setting.findUnique({ where: { key: 'x_oauth_client_id' } })
  const tokenExpiry = await prisma.setting.findUnique({ where: { key: 'x_oauth_token_expiry' } })
  const userName = await prisma.setting.findUnique({ where: { key: 'x_oauth_user_name' } })
  const userUsername = await prisma.setting.findUnique({ where: { key: 'x_oauth_user_username' } })

  const configured = !!(process.env.X_OAUTH_CLIENT_ID?.trim() ?? clientIdSetting?.value)

  // C-1: トークン存在確認は keychain から行う
  const accessToken = await getXAccessToken()
  const connected = !!accessToken
  const tokenExpired = tokenExpiry?.value ? Date.now() > Number(tokenExpiry.value) : false

  return NextResponse.json({
    configured,
    connected: connected && !tokenExpired,
    tokenExpired: connected && tokenExpired,
    // M-5: user.id は不要なのでレスポンスから除外
    user: connected
      ? { name: userName?.value, username: userUsername?.value }
      : null,
  })
}
