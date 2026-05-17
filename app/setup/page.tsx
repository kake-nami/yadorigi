'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState<'generate' | 'save' | 'done'>('generate');

  async function handleGenerate() {
    const res = await fetch('/api/setup/init', { method: 'POST' });
    const data = await res.json();
    setRecoveryKey(data.recoveryKey);
    setStep('save');
  }

  function handleCopy() {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setSaved(true);
      // L-3: 60秒後にクリップボードをクリア（Windowsのクリップボード履歴対策）
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, 60_000);
    }
  }

  function handleDownload() {
    if (!recoveryKey) return;
    const blob = new Blob([recoveryKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yadorigi-recovery-key.txt';
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }

  function handleDone() {
    // Cookie は /api/setup/init のレスポンスで HttpOnly としてセット済み
    router.push('/kanban');
  }

  if (step === 'generate') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full p-8 space-y-6">
          <h1 className="text-xl font-semibold">セキュアモードで起動</h1>
          <p className="text-sm text-secondary">
            データベースを暗号化します。リカバリーキーを生成してください。
          </p>
          <button
            onClick={handleGenerate}
            className="w-full py-2 px-4 rounded-full bg-accent text-white text-sm"
          >
            キーを生成する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 space-y-6">
        <h1 className="text-xl font-semibold">リカバリーキーを保存してください</h1>
        <p className="text-sm text-secondary">このキーは1度しか表示されません。</p>

        <div className="font-mono text-sm p-4 rounded-lg bg-surface border border-border break-all">
          {recoveryKey}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 px-4 rounded-full border border-border text-sm"
          >
            コピー
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2 px-4 rounded-full border border-border text-sm"
          >
            ファイルで保存
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={saved}
            onChange={e => setSaved(e.target.checked)}
            className="w-4 h-4"
          />
          保存しました
        </label>

        <button
          onClick={handleDone}
          disabled={!saved}
          className="w-full py-2 px-4 rounded-full bg-accent text-white text-sm disabled:opacity-40"
        >
          Yadorigi を起動する
        </button>
      </div>
    </div>
  );
}
