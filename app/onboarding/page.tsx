'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, History, LayoutGrid, ExternalLink } from 'lucide-react';

type Step = 'choice' | 'history' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choice');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  async function completeOnboarding() {
    await fetch('/api/onboarding', { method: 'POST' });
  }

  async function handleNoDemos() {
    setLoading(true);
    try {
      await fetch('/api/demo', { method: 'POST' });
      await completeOnboarding();
      router.push('/kanban');
    } finally {
      setLoading(false);
    }
  }

  async function handleHistoryImport() {
    if (!urlInput.trim()) return;
    setLoading(true);
    try {
      const urls = urlInput.split('\n').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/history-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json() as { imported: number; skipped: number };
      setResult(data);
      await completeOnboarding();
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipHistory() {
    setLoading(true);
    try {
      await completeOnboarding();
      router.push('/kanban');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'choice') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Yadorigi
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
              過去の閲覧から<br />
              &quot;再発見&quot; を作りますか？
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              X/Twitter で見たツイートのURLを<br />
              貼り付けるだけで取り込めます。<br />
              すべてローカル処理です。
              {' '}
              <a href="/privacy" className="underline underline-offset-2" style={{ color: 'var(--color-accent)' }}>
                プライバシー
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('history')}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              <span className="flex items-center gap-2">
                <History size={15} />
                はい（推奨）
              </span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={handleNoDemos}
              disabled={loading}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid size={15} />
                いいえ（サンプルで試す）
              </span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'history') {
    if (result) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1">
              <p className="text-[15px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                取り込み完了
              </p>
              <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                {result.imported} 件を追加、{result.skipped} 件はスキップ
              </p>
            </div>
            <button
              onClick={() => router.push('/kanban')}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              Kanbanで確認する
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="w-full max-w-sm space-y-5">
          <div className="space-y-2">
            <h2 className="text-[15px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
              ツイートURLを貼り付け
            </h2>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              ブラウザの履歴から X/Twitter の URL をコピーして貼り付けてください（1行1URL）。
            </p>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px]"
              style={{ color: 'var(--color-accent)' }}
            >
              x.com を開く
              <ExternalLink size={11} />
            </a>
          </div>

          <textarea
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder={'https://x.com/user/status/123456789\nhttps://x.com/user/status/987654321'}
            rows={8}
            className="w-full text-[12px] px-3 py-2.5 rounded-xl resize-none outline-none font-mono leading-relaxed"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSkipHistory}
              disabled={loading}
              className="text-[12px] px-3 py-1.5 rounded-full disabled:opacity-40"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              スキップ
            </button>
            <button
              onClick={handleHistoryImport}
              disabled={loading || !urlInput.trim()}
              className="flex-1 text-[13px] px-4 py-2 rounded-full font-medium disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {loading ? '取り込み中...' : '取り込む'}
            </button>
          </div>

          <details className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            <summary className="cursor-pointer hover:opacity-80">ヘルプ: URLの探し方</summary>
            <div className="mt-2 space-y-1 pl-2 border-l" style={{ borderColor: 'var(--color-border)' }}>
              <p>1. Chrome で <code className="bg-zinc-800 px-1 rounded">chrome://history/</code> を開く</p>
              <p>2. 検索欄に <code className="bg-zinc-800 px-1 rounded">x.com/status</code> と入力</p>
              <p>3. 各URLを右クリック → アドレスをコピー</p>
              <p>4. ここに貼り付け</p>
            </div>
          </details>
        </div>
      </div>
    );
  }

  return null;
}
