import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const bookmarks = await prisma.bookmark.findMany({
    orderBy: [{ statusUpdatedAt: 'desc' }, { importedAt: 'desc' }],
    include: {
      mediaItems: { select: { id: true, type: true, url: true, thumbnailUrl: true } },
      categories: {
        include: {
          category: { select: { id: true, name: true, slug: true, color: true } },
        },
      },
      actionLinks: {
        include: {
          actionItem: { select: { id: true, name: true, color: true, description: true, createdAt: true, archivedAt: true } },
        },
      },
    },
  });

  // クラスタIDごとの件数を一括取得（N+1回避）
  const clusterIds = [...new Set(bookmarks.map(b => b.implicitClusterId).filter(Boolean))] as string[];
  const clusterSizeMap = new Map<string, number>();
  if (clusterIds.length > 0) {
    const counts = await prisma.bookmark.groupBy({
      by: ['implicitClusterId'],
      where: { implicitClusterId: { in: clusterIds } },
      _count: true,
    });
    for (const row of counts) {
      if (row.implicitClusterId) clusterSizeMap.set(row.implicitClusterId, row._count);
    }
  }

  const formatted = bookmarks.map((b) => ({
    id: b.id,
    tweetId: b.tweetId,
    text: b.text,
    authorHandle: b.authorHandle,
    authorName: b.authorName,
    source: b.source,
    tweetCreatedAt: b.tweetCreatedAt?.toISOString() ?? null,
    importedAt: b.importedAt.toISOString(),
    status: b.status,
    statusUpdatedAt: b.statusUpdatedAt.toISOString(),
    lastOpenedAt: b.lastOpenedAt?.toISOString() ?? null,
    openCount: b.openCount,
    implicitClusterId: b.implicitClusterId,
    clusterSize: b.implicitClusterId ? clusterSizeMap.get(b.implicitClusterId) ?? 1 : null,
    mediaItems: b.mediaItems,
    categories: b.categories.map((bc) => ({
      id: bc.category.id,
      name: bc.category.name,
      slug: bc.category.slug,
      color: bc.category.color,
      confidence: bc.confidence,
    })),
    actionLinks: b.actionLinks.map((al) => ({
      id: al.id,
      actionId: al.actionId,
      note: al.note,
      actionItem: {
        ...al.actionItem,
        createdAt: al.actionItem.createdAt.toISOString(),
        archivedAt: al.actionItem.archivedAt?.toISOString() ?? null,
      },
    })),
  }));

  return NextResponse.json(formatted);
}
