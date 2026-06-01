'use client';

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { BookmarkWithMedia, BookmarkStatus } from '@/lib/types';
import { useLocale } from '@/lib/locale-context';
import { KanbanCard } from './kanban-card';

interface Props {
  status: BookmarkStatus;
  bookmarks: BookmarkWithMedia[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export const KanbanColumn = memo(function KanbanColumn({ status, bookmarks, selectedIds, onToggleSelect }: Props) {
  const { t } = useLocale();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const columnKey = `kanban.columns.${status}` as const;

  return (
    <div className="flex flex-col gap-2 min-w-[260px] max-w-[280px]">
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {t(columnKey)}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          {bookmarks.length}
        </span>
      </div>

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
            <KanbanCard
              key={b.id}
              bookmark={b}
              isSelected={selectedIds.has(b.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </SortableContext>
        {bookmarks.length === 0 && (
          <div
            className="flex-1 flex items-center justify-center text-[12px]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('kanban.empty')}
          </div>
        )}
      </div>
    </div>
  );
});
