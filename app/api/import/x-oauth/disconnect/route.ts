import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { clearXTokens } from '@/lib/db-crypto'

export async function POST() {
  // C-1: keychain からトークンを削除
  await clearXTokens()

  // DB からはトークン以外のメタ情報を削除
  await prisma.setting.deleteMany({
    where: {
      key: {
        in: [
          'x_oauth_token_expiry',
          'x_oauth_user_id',
          'x_oauth_user_name',
          'x_oauth_user_username',
        ],
      },
    },
  })

  return NextResponse.json({ ok: true })
}
