'use client';

import { useState, useMemo, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { BookmarkWithMedia, BookmarkStatus } from '@/lib/types';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { trpc } from '@/lib/trpc-client';
import { useLocale } from '@/lib/locale-context';

const STATUSES: BookmarkStatus[] = ['TO_READ', 'IN_PROGRESS', 'DONE', 'EVERGREEN'];

interface Props {
  initialBookmarks: BookmarkWithMedia[];
}

export function KanbanBoard({ initialBookmarks }: Props) {
  const { t } = useLocale();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byStatus = useMemo(() =>
    Object.fromEntries(
      STATUSES.map(s => [s, bookmarks.filter(b => (b.status ?? 'TO_READ') === s)])
    ) as Record<BookmarkStatus, BookmarkWithMedia[]>,
    [bookmarks]
  );

  const activeBookmark = useMemo(
    () => activeId ? bookmarks.find(b => b.id === activeId) : null,
    [activeId, bookmarks]
  );

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBatchMove = useCallback(async (targetStatus: BookmarkStatus) => {
    const ids = [...selectedIds];
    const prevStatuses = new Map(ids.map(id => [id, bookmarks.find(b => b.id === id)?.status ?? 'TO_READ']));

    setBookmarks(prev =>
      prev.map(b => selectedIds.has(b.id) ? { ...b, status: targetStatus } : b)
    );
    setSelectedIds(new Set());

    try {
      await trpc.bookmarks.updateStatusBatch.mutate({ ids, status: targetStatus });
    } catch {
      setBookmarks(prev =>
        prev.map(b => prevStatuses.has(b.id) ? { ...b, status: prevStatuses.get(b.id)! } : b)
      );
    }
  }, [selectedIds, bookmarks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const bookmarkId = active.id as string;

    let targetStatus: BookmarkStatus;
    if (STATUSES.includes(over.id as BookmarkStatus)) {
      targetStatus = over.id as BookmarkStatus;
    } else {
      const overBookmark = bookmarks.find(b => b.id === over.id);
      if (!overBookmark) return;
      targetStatus = overBookmark.status ?? 'TO_READ';
    }

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
  }, [bookmarks]);

  const selectedCount = selectedIds.size;

  return (
    <div className="relative">
      <DndContext
        id="kanban-dnd-context"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={e => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              bookmarks={byStatus[status]}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>

        <DragOverlay>
          {activeBookmark && (
            <div style={{ transform: 'rotate(2deg)', opacity: 0.95 }}>
              <KanbanCard bookmark={activeBookmark} isSelected={false} onToggleSelect={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* 一括移動バー */}
      {selectedCount > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl"
          style={{
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-sm font-medium mr-2" style={{ color: 'var(--color-text-primary)' }}>
            {selectedCount}件を移動：
          </span>
          {STATUSES.map(status => (
            <button
              key={status}
              onClick={() => void handleBatchMove(status)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors font-medium"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-accent)';
                (e.currentTarget as HTMLElement).style.color = '#fff';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              }}
            >
              {t(`kanban.columns.${status}` as Parameters<typeof t>[0])}
            </button>
          ))}
          <button
            onClick={handleClearSelection}
            className="text-xs px-2 py-1.5 rounded-full ml-1 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
