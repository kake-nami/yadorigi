// X OAuth で使用する信頼済みオリジンを返す。
// 本番環境では YADORIGI_BASE_URL の明示設定を必須にする（fail-closed）。
// 開発環境では http://localhost:3000 にフォールバック。
export function getTrustedOrigin(): string {
  const configured = process.env.YADORIGI_BASE_URL?.trim().replace(/\/$/, '')
  if (configured) return configured

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'YADORIGI_BASE_URL must be set in production. ' +
      'Configure it to the canonical app URL (e.g., https://yadorigi.example.com) ' +
      'to prevent Open Redirect via Host header injection.'
    )
  }

  return 'http://localhost:3000'
}
