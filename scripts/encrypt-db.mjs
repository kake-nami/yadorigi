/**
 * 平文 SQLite DB を SQLCipher 暗号化 DB に変換する。
 * Prisma migration は暗号化ラッパーを通らないため、migration 後に一度だけ実行する。
 *
 * Usage: node scripts/encrypt-db.mjs
 */
import keytar from 'keytar'
import Database from 'better-sqlite3-multiple-ciphers'
import { resolve } from 'path'
import { existsSync, unlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const dbPath  = resolve(ROOT, 'data', 'yadorigi.db')
const encPath = resolve(ROOT, 'data', 'yadorigi-enc.db')

if (!existsSync(dbPath)) {
  console.error('yadorigi.db が見つかりません。先に npx prisma migrate deploy を実行してください。')
  process.exit(1)
}

const key = await keytar.getPassword('Yadorigi', 'db-encryption-key')
if (!key) {
  console.error('暗号化キーが Windows Credential Manager に見つかりません。npm run dev:secure を一度起動してください。')
  process.exit(1)
}

if (!/^[0-9a-fA-F]{64}$/.test(key)) {
  console.error('キーのフォーマットが不正です。')
  process.exit(1)
}

// 前回の失敗で残った一時ファイルを削除
if (existsSync(encPath)) unlinkSync(encPath)

console.log('平文 DB を暗号化します（PRAGMA rekey）...')

// better-sqlite3-multiple-ciphers を直接使用（ラッパーを経由しないので平文で開ける）
const db = new Database(dbPath)

// PRAGMA rekey で平文 DB をその場で暗号化（SQLite Multiple Ciphers の機能）
db.pragma(`rekey='${key}'`)
db.close()

// 動作確認：暗号化キーで開き直して読めるか確認
const verify = new Database(dbPath)
verify.pragma(`key='${key}'`)
const tables = verify.prepare("SELECT count(*) as n FROM sqlite_master WHERE type='table'").get()
verify.close()

console.log(`完了: data/yadorigi.db を暗号化しました（テーブル数: ${tables.n}）`)
console.log('npm run dev:secure で起動してください。')
