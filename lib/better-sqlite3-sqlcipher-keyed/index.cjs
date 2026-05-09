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
    // PRAGMA key はデータ操作より前に実行する必要がある（SQLCipher の要件）
    db.pragma(`key='${key}'`)
  }

  return db
}

// better-sqlite3 の export shape に合わせる
// Prisma アダプターは __toESM(require('better-sqlite3')).default を呼ぶ
KeyedDatabase.SqliteError = NativeDatabase.SqliteError
KeyedDatabase.default = KeyedDatabase

module.exports = KeyedDatabase
module.exports.default = KeyedDatabase
