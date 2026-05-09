import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { runClustering } from '@/lib/implicit-clusterer'

const RATE_LIMIT_MS = 5 * 60 * 1000 // 5分

export async function POST() {
  const now = Date.now()
  const threshold = now - RATE_LIMIT_MS

  // M-A: SQLite UPSERT を ON CONFLICT WHERE 句で原子化。
  // 既存値が threshold 未満（=5分以上前）のときだけ更新が成功する。
  // changes() = 0 の場合はレート制限内なので拒否する。
  const result = await prisma.$executeRaw`
    INSERT INTO Setting(key, value) VALUES('clusters_last_run', ${String(now)})
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    WHERE CAST(Setting.value AS INTEGER) < ${threshold}
  `

  if (result === 0) {
    // 更新行 0 = 直近5分以内に実行済み
    const lastRun = await prisma.setting.findUnique({ where: { key: 'clusters_last_run' } })
    const elapsed = lastRun ? now - Number(lastRun.value) : 0
    return NextResponse.json(
      { skipped: true, retryAfterMs: Math.max(RATE_LIMIT_MS - elapsed, 0) },
      { status: 429 }
    )
  }

  const clustering = await runClustering()
  return NextResponse.json(clustering)
}
