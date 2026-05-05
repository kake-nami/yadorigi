-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ActionLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookmarkId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionLink_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "Bookmark" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActionLink_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImplicitCluster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BehaviorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "bookmarkId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorHandle" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "tweetCreatedAt" DATETIME,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawJson" TEXT NOT NULL,
    "semanticTags" TEXT,
    "entities" TEXT,
    "enrichedAt" DATETIME,
    "enrichmentMeta" TEXT,
    "source" TEXT NOT NULL DEFAULT 'bookmark',
    "status" TEXT NOT NULL DEFAULT 'TO_READ',
    "statusUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" DATETIME,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "implicitClusterId" TEXT
);
INSERT INTO "new_Bookmark" ("authorHandle", "authorName", "enrichedAt", "enrichmentMeta", "entities", "id", "importedAt", "rawJson", "semanticTags", "source", "text", "tweetCreatedAt", "tweetId") SELECT "authorHandle", "authorName", "enrichedAt", "enrichmentMeta", "entities", "id", "importedAt", "rawJson", "semanticTags", "source", "text", "tweetCreatedAt", "tweetId" FROM "Bookmark";
DROP TABLE "Bookmark";
ALTER TABLE "new_Bookmark" RENAME TO "Bookmark";
CREATE UNIQUE INDEX "Bookmark_tweetId_key" ON "Bookmark"("tweetId");
CREATE INDEX "Bookmark_authorHandle_idx" ON "Bookmark"("authorHandle");
CREATE INDEX "Bookmark_tweetCreatedAt_idx" ON "Bookmark"("tweetCreatedAt");
CREATE INDEX "Bookmark_enrichedAt_idx" ON "Bookmark"("enrichedAt");
CREATE INDEX "Bookmark_source_idx" ON "Bookmark"("source");
CREATE INDEX "Bookmark_status_idx" ON "Bookmark"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ActionLink_bookmarkId_actionId_key" ON "ActionLink"("bookmarkId", "actionId");
