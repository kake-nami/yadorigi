export interface MediaItem {
  id: string
  type: string
  url: string
  thumbnailUrl: string | null
  imageTags?: string | null
}

export interface BookmarkCategory {
  id: string
  name: string
  slug: string
  color: string
  confidence: number | null
}

export type BookmarkStatus = 'TO_READ' | 'IN_PROGRESS' | 'DONE' | 'EVERGREEN'

export interface ActionItem {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: string
  archivedAt: string | null
}

export interface ActionLink {
  id: string
  actionId: string
  note: string | null
  actionItem: ActionItem
}

export interface BookmarkWithMedia {
  id: string
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  tweetCreatedAt: string | null
  importedAt?: string
  mediaItems: MediaItem[]
  categories: BookmarkCategory[]
  // Yadorigi 拡張
  status?: BookmarkStatus
  statusUpdatedAt?: string
  lastOpenedAt?: string | null
  openCount?: number
  actionLinks?: ActionLink[]
}

export interface Category {
  id: string
  name: string
  slug: string
  color: string
  description: string | null
  isAiGenerated: boolean
  createdAt: string
  bookmarkCount: number
}

export interface StatsResponse {
  totalBookmarks: number
  totalCategories: number
  totalMedia: number
  recentBookmarks: BookmarkWithMedia[]
  topCategories: { name: string; slug: string; color: string; count: number }[]
}

export interface BookmarksResponse {
  bookmarks: BookmarkWithMedia[]
  total: number
  page: number
  limit: number
}
