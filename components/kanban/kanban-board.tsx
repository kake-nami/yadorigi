'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { BookmarkWithMedia, BookmarkStatus } from '@/lib/types';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { trpc } from '@/lib/trpc-client';

const STATUSES: BookmarkStatus[] = ['TO_READ', 'IN_PROGRESS', 'DONE', 'EVERGREEN'];

interface Props {
  initialBookmarks: BookmarkWithMedia[];
}

export function KanbanBoard({ initialBookmarks }: Props) {
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byStatus = Object.fromEntries(
    STATUSES.map(s => [s, bookmarks.filter(b => (b.status ?? 'TO_READ') === s)])
  ) as Record<BookmarkStatus, BookmarkWithMedia[]>;

  const activeBookmark = activeId ? bookmarks.find(b => b.id === activeId) : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const bookmarkId = active.id as string;
    const targetStatus = over.id as BookmarkStatus;

    if (!STATUSES.includes(targetStatus)) return;

    const current = bookmarks.find(b => b.id === bookmarkId);
    if (!current || current.status === targetStatus) return;

    setBookmarks(prev =>
      prev.map(b => b.id === bookmarkId ? { ...b, status: targetStatus } : b)
    );

    trpc.bookmarks.updateStatus.mutate({ id: bookmarkId, status: targetStatus }).catch(() => {
      setBookmarks(prev =>
        prev.map(b => b.id === bookmarkId ? { ...b, status: current.status } : b)
      );
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={e => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map(status => (
          <KanbanColumn key={status} status={status} bookmarks={byStatus[status]} />
        ))}
      </div>

      <DragOverlay>
        {activeBookmark && (
          <div style={{ transform: 'rotate(2deg)', opacity: 0.95 }}>
            <KanbanCard bookmark={activeBookmark} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
