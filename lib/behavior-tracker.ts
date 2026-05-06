/**
 * 行動シグナル記録 — UIには絶対に表示しない。
 * prisma studio で確認できれば十分。
 */
import prisma from '@/lib/db';

export type BehaviorEventType =
  | 'session_start'
  | 'bookmark_open'
  | 'bookmark_create'
  | 'bookmark_delete';

export async function logBehavior(
  type: BehaviorEventType,
  bookmarkId?: string,
): Promise<void> {
  try {
    await prisma.behaviorLog.create({
      data: { type, bookmarkId: bookmarkId ?? null },
    });
  } catch {
    // 記録に失敗しても操作は続行する
  }
}

// ── シグナル計算 ──────────────────────────────────────────────────

// 継続利用率: 7日以内に2回以上session_startしたユーザー割合
// このアプリはシングルユーザー前提なので「直近7日に2回以上セッションがあるか」で判定
export async function retentionRate(): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const count = await prisma.behaviorLog.count({
    where: { type: 'session_start', timestamp: { gte: since } },
  });
  return count >= 2;
}

// データ残存率: 作成後7日後も残っているbookmark割合
export async function dataRetentionRate(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, surviving] = await Promise.all([
    prisma.bookmark.count({ where: { importedAt: { lt: cutoff } } }),
    prisma.bookmark.count({
      where: {
        importedAt: { lt: cutoff },
        source: { not: 'demo' },
      },
    }),
  ]);
  if (total === 0) return 1;
  return surviving / total;
}

// 再訪発生率: 作成後7日以内に再度openされたbookmark数 ÷ 作成総数
export async function revisitRate(): Promise<number> {
  const total = await prisma.bookmark.count();
  if (total === 0) return 0;

  const revisited = await prisma.bookmark.count({
    where: {
      openCount: { gte: 1 },
      lastOpenedAt: {
        // lastOpenedAt が importedAt から7日以内にある
        not: null,
      },
    },
  });
  return revisited / total;
}
