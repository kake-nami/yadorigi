import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { runClustering } from '@/lib/implicit-clusterer'

const RATE_LIMIT_MS = 5 * 60 * 1000 // 5分

export async function POST() {
  // H-5: 連続実行によるDB負荷を防ぐため5分のレート制限を設ける
  const lastRun = await prisma.setting.findUnique({ where: { key: 'clusters_last_run' } })
  if (lastRun?.value) {
    const elapsed = Date.now() - Number(lastRun.value)
    if (elapsed < RATE_LIMIT_MS) {
      return NextResponse.json(
        { skipped: true, retryAfterMs: RATE_LIMIT_MS - elapsed },
        { status: 429 }
      )
    }
  }

  await prisma.setting.upsert({
    where: { key: 'clusters_last_run' },
    create: { key: 'clusters_last_run', value: String(Date.now()) },
    update: { value: String(Date.now()) },
  })

  const result = await runClustering()
  return NextResponse.json(result)
}
