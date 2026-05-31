'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink } from 'lucide-react';
import type { BookmarkWithMedia, ActionLink } from '@/lib/types';
import { ActionBadge } from '../action-link/action-badge';
import { ActionLinkModal } from '../action-link/action-link-modal';
import { useLocale } from '@/lib/locale-context';
import { trpc } from '@/lib/trpc-client';

interface Props {
  bookmark: BookmarkWithMedia;
}

export function KanbanCard({ bookmark }: Props) {
  const { t } = useLocale();
  const [actionLinks, setActionLinks] = useState<ActionLink[]>(bookmark.actionLinks ?? []);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    data: { bookmark },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? `transform var(--duration-normal)`,
    opacity: isDragging ? 0.4 : 1,
  };

  function handleOpen() {
    trpc.bookmarks.markAsOpened.mutate({ id: bookmark.id }).catch(() => {});
  }

  const isUnknownHandle = !bookmark.authorHandle || bookmark.authorHandle === 'unknown'
  const tweetUrl = isUnknownHandle
    ? `https://x.com/i/web/status/${bookmark.tweetId}`
    : `https://x.com/${bookmark.authorHandle}/status/${bookmark.tweetId}`
  const displayAuthor = isUnknownHandle
    ? (bookmark.authorName && bookmark.authorName !== 'Unknown' ? bookmark.authorName : '—')
    : `@${bookmark.authorHandle}`
  const displayText = bookmark.text.replace(/https?:\/\/t\.co\/\S+/g, '').trim();

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          backgroundColor: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
        }}
        {...attributes}
        {...listeners}
        className="rounded-xl p-3 space-y-2 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Author */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {displayAuthor}
          </span>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => { e.stopPropagation(); handleOpen(); }}
            className="shrink-0 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          >
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Text */}
        <div>
          <p
            className={`text-[13px] leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
            style={{ color: 'var(--color-text-primary)' }}
          >
            {displayText}
          </p>
          {displayText.length > 120 && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              className="text-[11px] mt-0.5 transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            >
              {expanded ? t('kanban.showLess') : t('kanban.showMore')}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {actionLinks.length > 0 ? (
            <ActionBadge actionLinks={actionLinks} onClick={() => setModalOpen(true)} />
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setModalOpen(true); }}
              className="text-[11px] transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            >
              {t('kanban.addAction')}
            </button>
          )}

          {bookmark.implicitClusterId && bookmark.clusterSize && bookmark.clusterSize > 1 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {t('kanban.clusterOther', { n: bookmark.clusterSize - 1 })}
            </span>
          )}
        </div>
      </div>

      <ActionLinkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bookmarkId={bookmark.id}
        linkedActions={actionLinks}
        onLinksChange={setActionLinks}
      />
    </>
  );
}
