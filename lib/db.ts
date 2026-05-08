import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/app/generated/prisma/client'
import path from 'path'

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl }),
  })

  // H-1: YADORIGI_ENCRYPTION_KEY は scripts/start.mjs が OS keychain から読み取り注入する。
  // better-sqlite3-sqlcipher に置換済みの場合のみ有効。
  // PrismaBetterSqlite3 アダプターが Database インスタンスを受け付けるよう
  // better-sqlite3-sqlcipher へ移行したタイミングで以下のコメントを実装に切り替える:
  //   const sqlite = new Database(dbPath)
  //   if (process.env.YADORIGI_ENCRYPTION_KEY) sqlite.pragma(`key='${encKey}'`)
  //   new PrismaClient({ adapter: new PrismaBetterSqlite3(sqlite) })

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const db = prisma
export default prisma
