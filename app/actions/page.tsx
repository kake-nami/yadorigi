'use client';

import { useEffect, useState } from 'react';
import { Archive, Plus } from 'lucide-react';
import type { ActionItem } from '@/lib/types';
import { trpc } from '@/lib/trpc-client';

const COLOR_PRESETS = ['#1d9bf0', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];

export default function ActionsPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/actions').then(r => r.json()).then(setItems);
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const created = await trpc.actions.create.mutate({ name: name.trim(), color });
      setItems(prev => [{
        id: created.id,
        name: created.name,
        description: created.description,
        color: created.color,
        createdAt: String(created.createdAt),
        archivedAt: null,
      }, ...prev]);
      setName('');
      setCreating(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(id: string) {
    await trpc.actions.archive.mutate({ id });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          行動予定
        </h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={14} />
          追加
        </button>
      </div>

      {creating && (
        <div
          className="p-4 rounded-xl space-y-3"
          style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            placeholder="行動予定の名前"
            className="w-full text-sm px-3 py-2 rounded-lg outline-none"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>色:</span>
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  transform: color === c ? 'scale(1.25)' : 'scale(1)',
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setCreating(false)}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="text-xs px-3 py-1.5 rounded-full disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              作成
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {items.map(item => (
          <li
            key={item.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color ?? 'var(--color-accent)' }}
            />
            <span className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {item.name}
            </span>
            <button
              onClick={() => handleArchive(item.id)}
              className="transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-destructive)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              title="アーカイブ"
            >
              <Archive size={14} />
            </button>
          </li>
        ))}
        {items.length === 0 && !creating && (
          <li className="text-sm text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            行動予定がありません
          </li>
        )}
      </ul>
    </div>
  );
}
