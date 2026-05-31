'use client'

import Link from 'next/link'
import { BookmarkIcon, Tag, Image, Layers, Upload, Sparkles, Search, ArrowRight, TrendingUp, Bookmark } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import type { BookmarkWithMedia } from '@/lib/types'
import BookmarkCard from '@/components/bookmark-card'

interface DashboardData {
  totalBookmarks: number
  bookmarkSourceCount: number
  likeSourceCount: number
  totalCategories: number
  totalMedia: number
  uncategorizedCount: number
  recentBookmarks: BookmarkWithMedia[]
  topCategories: { name: string; slug: string; color: string; count: number }[]
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  iconBg: string
  borderColor: string
  trend?: string
  href?: string
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, borderColor, trend, href }: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        {trend && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <TrendingUp size={11} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-zinc-100 mb-1 tracking-tight">{value.toLocaleString()}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </>
  )
  const cls = `bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all duration-200 relative overflow-hidden border-t-2 ${borderColor} ${href ? 'cursor-pointer hover:bg-zinc-800/60' : ''}`
  if (href) {
    return <Link href={href} className={cls}>{inner}</Link>
  }
  return <div className={cls}>{inner}</div>
}

export function EmptyState() {
  const { t } = useLocale()
  return (
    <div className="p-6 md:p-8 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 mx-auto mb-6">
          <BookmarkIcon size={36} className="text-indigo-400 opacity-80" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">{t('dashboard.empty.title')}</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">{t('dashboard.empty.description')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/import"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            <Upload size={16} />
            {t('dashboard.empty.import')}
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-colors border border-zinc-700"
          >
            {t('dashboard.empty.settings')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DashboardContent({ data }: { data: DashboardData }) {
  const { t, locale } = useLocale()

  const hour = new Date().getHours()
  const greeting = hour < 12
    ? t('dashboard.greeting.morning')
    : hour < 17
      ? t('dashboard.greeting.afternoon')
      : t('dashboard.greeting.evening')

  const dateStr = new Date().toLocaleDateString(t('dashboard.dateLocale'), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const categorizedCount = data.totalBookmarks - data.uncategorizedCount

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* Hero */}
      <div>
        <p className="text-sm text-zinc-500 mb-1 uppercase tracking-widest font-medium">{dateStr}</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">
              {greeting} <span className="text-indigo-400">&#128075;</span>
            </h1>
            <p className="text-zinc-400 mt-1.5">
              {t('dashboard.savedCount', { n: data.totalBookmarks.toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US') })}
              {data.likeSourceCount > 0 && (
                <span className="text-zinc-500">
                  {' '}{t('dashboard.savedCountSplit', {
                    n: data.totalBookmarks,
                    b: data.bookmarkSourceCount,
                    l: data.likeSourceCount,
                  })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/import"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
            >
              <Upload size={15} />
              {t('dashboard.importMore')}
            </Link>
            <Link
              href="/categorize"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700"
            >
              <Sparkles size={15} />
              {t('dashboard.aiCategorize')}
            </Link>
            <Link
              href="/ai-search"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Search size={15} />
              {t('dashboard.aiSearch')}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={data.likeSourceCount > 0
            ? t('dashboard.stat.totalSplit', { b: data.bookmarkSourceCount, l: data.likeSourceCount })
            : t('dashboard.stat.totalBookmarks')}
          value={data.totalBookmarks}
          icon={BookmarkIcon}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
          borderColor="border-t-indigo-500"
        />
        <StatCard
          label={t('dashboard.stat.categorized')}
          value={categorizedCount}
          icon={Tag}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          borderColor="border-t-emerald-500"
        />
        <StatCard
          label={t('dashboard.stat.media')}
          value={data.totalMedia}
          icon={Image}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
          borderColor="border-t-violet-500"
        />
        <StatCard
          label={t('dashboard.stat.uncategorized')}
          value={data.uncategorizedCount}
          icon={Layers}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          borderColor="border-t-amber-500"
          href="/bookmarks?uncategorized=true"
        />
      </div>

      {/* Recently Added */}
      {data.recentBookmarks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">{t('dashboard.latest')}</p>
              <h2 className="text-xl font-semibold text-zinc-100">{t('dashboard.recentlyAdded')}</h2>
            </div>
            <Link
              href="/bookmarks"
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              {t('dashboard.viewAll')}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="masonry-grid">
            {data.recentBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="masonry-item">
                <BookmarkCard bookmark={bookmark} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Categories */}
      {data.topCategories.length > 0 && (
        <section className="pb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">{t('dashboard.browseByTopic')}</p>
              <h2 className="text-xl font-semibold text-zinc-100">{t('dashboard.topCategories')}</h2>
            </div>
            <Link
              href="/categories"
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              {t('dashboard.manage')}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {data.topCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-200 text-sm group"
              >
                <Bookmark
                  size={13}
                  className="shrink-0 transition-colors"
                  style={{ color: cat.color, fill: cat.color }}
                />
                <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors font-medium">{cat.name}</span>
                <span className="text-zinc-500 text-xs tabular-nums">{cat.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
