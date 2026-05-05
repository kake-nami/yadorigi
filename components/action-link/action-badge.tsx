'use client';

import type { ActionLink } from '@/lib/types';

interface Props {
  actionLinks: ActionLink[];
  onClick?: () => void;
}

export function ActionBadge({ actionLinks, onClick }: Props) {
  if (actionLinks.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-secondary border border-border hover:border-accent/50 transition-colors"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {actionLinks.length === 1 ? (
        <>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: actionLinks[0].actionItem.color ?? 'var(--color-accent)' }}
          />
          <span className="truncate max-w-[100px]">{actionLinks[0].actionItem.name}</span>
        </>
      ) : (
        <span>{actionLinks.length} 件の行動予定</span>
      )}
    </button>
  );
}
