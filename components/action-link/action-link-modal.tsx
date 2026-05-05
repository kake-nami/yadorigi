'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc-client';
import type { ActionItem, ActionLink } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  bookmarkId: string;
  linkedActions: ActionLink[];
  onLinksChange: (links: ActionLink[]) => void;
}

export function ActionLinkModal({ open, onClose, bookmarkId, linkedActions, onLinksChange }: Props) {
  const [allActions, setAllActions] = useState<ActionItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/actions')
      .then(r => r.json())
      .then(setAllActions);
  }, [open]);

  const linkedIds = new Set(linkedActions.map(al => al.actionId));

  async function handleToggle(action: ActionItem) {
    if (linkedIds.has(action.id)) {
      await trpc.bookmarks.unlinkFromAction.mutate({ bookmarkId, actionId: action.id });
      onLinksChange(linkedActions.filter(al => al.actionId !== action.id));
    } else {
      await trpc.bookmarks.linkToAction.mutate({ bookmarkId, actionId: action.id });
      const newLink: ActionLink = { id: '', actionId: action.id, note: null, actionItem: action };
      onLinksChange([...linkedActions, newLink]);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const created = await trpc.actions.create.mutate({ name: newName.trim() });
      const newAction: ActionItem = {
        id: created.id,
        name: created.name,
        description: created.description,
        color: created.color,
        createdAt: String(created.createdAt),
        archivedAt: null,
      };
      setAllActions(prev => [newAction, ...prev]);
      setNewName('');
      setCreating(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              行動予定に紐づける
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-secondary hover:text-primary transition-colors">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <ul className="space-y-1 max-h-52 overflow-y-auto">
            {allActions.map(action => (
              <li key={action.id}>
                <button
                  onClick={() => handleToggle(action)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-surface"
                  style={{
                    backgroundColor: linkedIds.has(action.id) ? 'var(--color-surface)' : undefined,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: action.color ?? 'var(--color-accent)' }}
                  />
                  <span className="flex-1 truncate">{action.name}</span>
                  {linkedIds.has(action.id) && (
                    <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>✓</span>
                  )}
                </button>
              </li>
            ))}
            {allActions.length === 0 && (
              <li className="text-xs px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                行動予定がありません
              </li>
            )}
          </ul>

          {creating ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="行動予定の名前"
                className="flex-1 text-sm px-3 py-1.5 rounded-lg outline-none"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={handleCreate}
                disabled={loading || !newName.trim()}
                className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                追加
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Plus size={13} />
              新しい行動予定を作成
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
