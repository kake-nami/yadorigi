'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { BookmarkWithMedia, BookmarkStatus } from '@/lib/types';
import { KanbanCard } from './kanban-card';

const COLUMN_LABELS: Record<BookmarkStatus, string> = {
  TO_READ: '読む',
  IN_PROGRESS: '読んでいる',
  DONE: '読了',
  EVERGREEN: '永続保存',
};

interface Props {
  status: BookmarkStatus;
  bookmarks: BookmarkWithMedia[];
}

export function KanbanColumn({ status, bookmarks }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col gap-2 min-w-[260px] max-w-[280px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {COLUMN_LABELS[status]}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          {bookmarks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 rounded-xl p-2 min-h-[120px] transition-colors"
        style={{
          backgroundColor: isOver ? 'var(--color-surface)' : 'transparent',
          border: `1px solid ${isOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
          transition: `border-color var(--duration-fast), background-color var(--duration-fast)`,
        }}
      >
        <SortableContext items={bookmarks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {bookmarks.map(b => (
            <KanbanCard key={b.id} bookmark={b} />
          ))}
        </SortableContext>
        {bookmarks.length === 0 && (
          <div
            className="flex-1 flex items-center justify-center text-[12px]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            なし
          </div>
        )}
      </div>
    </div>
  );
}
