import { KanbanBoard } from '@/components/kanban/kanban-board';
import type { BookmarkWithMedia } from '@/lib/types';

async function getKanbanBookmarks(): Promise<BookmarkWithMedia[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/kanban`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function KanbanPage() {
  const bookmarks = await getKanbanBookmarks();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Kanban
      </h1>
      <KanbanBoard initialBookmarks={bookmarks} />
    </div>
  );
}
