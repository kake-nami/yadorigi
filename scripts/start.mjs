#!/usr/bin/env node
/**
 * Yadorigi セキュア起動スクリプト
 * OS keychainから暗号化キーを読み取り YADORIGI_ENCRYPTION_KEY を注入してから Next.js を起動する。
 *
 * Usage:
 *   node scripts/start.mjs        # next start (本番)
 *   node scripts/start.mjs dev    # next dev (開発)
 */
import keytar from 'keytar'
import { spawn } from 'child_process'
import crypto from 'crypto'

const SERVICE_NAME = 'Yadorigi'
const ACCOUNT_NAME = 'db-encryption-key'

async function main() {
  if (process.env.YADORIGI_NO_ENCRYPTION === '1') {
    startNext(undefined)
    return
  }

  let key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
  if (!key) {
    key = crypto.randomBytes(32).toString('hex')
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key)
    console.log('暗号化キーを生成してOSキーチェーンに保存しました')
  }

  startNext(key)
}

function startNext(encKey) {
  const mode = process.argv[2] ?? 'start'
  const cmd = mode === 'dev' ? ['next', 'dev'] : ['next', 'start']
  const env = { ...process.env }
  if (encKey) env.YADORIGI_ENCRYPTION_KEY = encKey

  const proc = spawn('npx', cmd, { env, stdio: 'inherit', shell: true })
  proc.on('exit', code => process.exit(code ?? 0))
}

main().catch(err => {
  console.error('キーチェーン初期化失敗:', err.message)
  process.exit(1)
})
