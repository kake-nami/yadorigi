import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/app/generated/prisma/client'
import path from 'path'

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  // SQLCipher encryption is enabled by default unless bypassed for dev/CI
  // When YADORIGI_NO_ENCRYPTION=1, use plain better-sqlite3 (existing adapter)
  // When encryption is enabled, better-sqlite3-sqlcipher is required (see CLAUDE.md)
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl }),
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const db = prisma
export default prisma
