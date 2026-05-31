export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import type { BookmarkWithMedia } from '@/lib/types'
import DashboardContent, { EmptyState } from '@/components/dashboard-content'

const RECENT_QUERY = {
  take: 6,
  orderBy: [{ tweetCreatedAt: 'desc' as const }, { importedAt: 'desc' as const }],
  include: {
    mediaItems: { select: { id: true, type: true, url: true, thumbnailUrl: true } },
    categories: {
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
      },
    },
  },
}

const TOP_CATS_QUERY = {
  include: { _count: { select: { bookmarks: true } } },
  orderBy: { bookmarks: { _count: 'desc' as const } },
  take: 10,
} as const

async function getDashboardData() {
  try {
    const [totalBookmarks, totalCategories, totalMedia, uncategorizedCount, recentRaw, catsRaw, bookmarkSourceCount, likeSourceCount] =
      await Promise.all([
        prisma.bookmark.count(),
        prisma.category.count(),
        prisma.mediaItem.count(),
        prisma.bookmark.count({ where: { categories: { none: {} } } }),
        prisma.bookmark.findMany(RECENT_QUERY),
        prisma.category.findMany(TOP_CATS_QUERY),
        prisma.bookmark.count({ where: { source: 'bookmark' } }),
        prisma.bookmark.count({ where: { source: 'like' } }),
      ])

    const recentBookmarks: BookmarkWithMedia[] = recentRaw.map((b) => ({
      id: b.id,
      tweetId: b.tweetId,
      text: b.text,
      authorHandle: b.authorHandle,
      authorName: b.authorName,
      tweetCreatedAt: b.tweetCreatedAt?.toISOString() ?? null,
      importedAt: b.importedAt.toISOString(),
      mediaItems: b.mediaItems,
      categories: b.categories.map((bc) => ({
        id: bc.category.id,
        name: bc.category.name,
        slug: bc.category.slug,
        color: bc.category.color,
        confidence: null,
      })),
    }))

    return {
      totalBookmarks,
      bookmarkSourceCount,
      likeSourceCount,
      totalCategories,
      totalMedia,
      uncategorizedCount,
      recentBookmarks,
      topCategories: catsRaw.map((c) => ({
        name: c.name,
        slug: c.slug,
        color: c.color,
        count: c._count.bookmarks,
      })),
    }
  } catch {
    return {
      totalBookmarks: 0,
      bookmarkSourceCount: 0,
      likeSourceCount: 0,
      totalCategories: 0,
      totalMedia: 0,
      uncategorizedCount: 0,
      recentBookmarks: [] as BookmarkWithMedia[],
      topCategories: [] as { name: string; slug: string; color: string; count: number }[],
    }
  }
}

export default async function DashboardPage() {
  const onboardingSetting = await prisma.setting.findUnique({ where: { key: 'onboarding_completed' } }).catch(() => null)
  if (!onboardingSetting || onboardingSetting.value !== 'true') {
    redirect('/onboarding')
  }

  const data = await getDashboardData()

  if (data.totalBookmarks === 0) {
    return <EmptyState />
  }

  return <DashboardContent data={data} />
}
