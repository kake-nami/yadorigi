import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/app/generated/prisma/client'
import path from 'path'

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'data', 'yadorigi.db')}`

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  // H-1: npm overrides により require('better-sqlite3') は
  // lib/better-sqlite3-sqlcipher-keyed/index.cjs（SQLCipher ラッパー）に解決される。
  // ラッパーが YADORIGI_ENCRYPTION_KEY を PRAGMA key で適用するため、
  // ここでは通常通り URL ベースのアダプターを渡すだけでよい。
  // YADORIGI_ENCRYPTION_KEY は scripts/start.mjs が OS keychain から読み取り注入する。
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl }),
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const db = prisma
export default prisma
