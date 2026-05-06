'use client';

import { useEffect } from 'react';

// セッション開始時にサーバーへ行動ログを送る。UIには何も表示しない。
// 同一セッション内の重複送信を防ぐため sessionStorage を使う。
export function SessionTracker() {
  useEffect(() => {
    if (sessionStorage.getItem('session_logged')) return;
    sessionStorage.setItem('session_logged', '1');
    fetch('/api/behavior/session', { method: 'POST' }).catch(() => {});
  }, []);

  return null;
}
