'use strict'
// H-1: better-sqlite3 を better-sqlite3-multiple-ciphers（SQLCipher 4.x）に差し替え、
// 起動時に scripts/start.mjs が注入した YADORIGI_ENCRYPTION_KEY を PRAGMA key で適用する。
// このファイルは npm overrides によって require('better-sqlite3') から解決される。

const NativeDatabase = require('better-sqlite3-multiple-ciphers')

/**
 * better-sqlite3 互換ラッパー。
 * コンストラクタが呼ばれたとき YADORIGI_ENCRYPTION_KEY があれば PRAGMA key を実行する。
 * new で呼ばれた場合は実際の Database インスタンス（NativeDatabase）を返すため、
 * 呼び出し元はそのまま全メソッドを使用できる。
 */
function KeyedDatabase(filename, options) {
  const db = new NativeDatabase(filename, options)

  const key = process.env.YADORIGI_ENCRYPTION_KEY
  const noEnc = process.env.YADORIGI_NO_ENCRYPTION === '1'

  if (key && !noEnc) {
    // M-B: 文字列補間する前に hex64 形式を強制（防御の二重化）。
    // 通常パスでは crypto.randomBytes(32).toString('hex') から来るので必ず一致する。
    // keychain改ざん等で異常値が入った場合に PRAGMA インジェクションを防ぐ。
    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error('Invalid YADORIGI_ENCRYPTION_KEY format (must be 64 hex chars)')
    }
    // PRAGMA key はデータ操作より前に実行する必要がある（SQLCipher の要件）
    db.pragma(`key='${key}'`)

    // L-D: SQLite Multiple Ciphers が実際にロードされているか runtime 検証（fail-closed）。
    // hmac_check は multi-cipher 固有の pragma で、平文 better-sqlite3 では空配列を返す。
    // npm overrides の解決失敗等で平文SQLiteで動作してしまうのを防ぐ。
    const hmacCheck = db.pragma('hmac_check')
    if (!Array.isArray(hmacCheck) || hmacCheck.length === 0) {
      db.close()
      throw new Error(
        'SQLCipher/Multi-Cipher SQLite not loaded. ' +
        'Encryption is not active. Check npm overrides resolution.'
      )
    }
  }

  return db
}

// better-sqlite3 の export shape に合わせる
// Prisma アダプターは __toESM(require('better-sqlite3')).default を呼ぶ
KeyedDatabase.SqliteError = NativeDatabase.SqliteError
KeyedDatabase.default = KeyedDatabase

module.exports = KeyedDatabase
module.exports.default = KeyedDatabase
