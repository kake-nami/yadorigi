import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logBehavior } from '@/lib/behavior-tracker';

const DOMAIN_PATTERN = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//;
const STATUS_PATTERN = /\/(status|i\/web\/status)\/(\d+)/;
const EXCLUDE_PATHS = ['/home', '/explore', '/notifications', '/messages', '/search', '/settings', '/i/flow'];

function extractTweetId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!DOMAIN_PATTERN.test(url)) return null;
    for (const exc of EXCLUDE_PATHS) {
      if (parsed.pathname.startsWith(exc)) return null;
    }
    const match = STATUS_PATTERN.exec(parsed.pathname);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

function extractHandle(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[0] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function POST(req: NextRequest) {
  const { urls } = (await req.json()) as { urls: string[] };

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'urls required' }, { status: 400 });
  }

  // M-3: 各要素が文字列であることを保証（数値やオブジェクトが混入しても安全）
  const validUrls = urls.filter((u): u is string => typeof u === 'string').slice(0, 500)

  // 上限100件、重複排除
  const seen = new Set<string>();
  const toImport: { tweetId: string; handle: string; url: string }[] = [];

  for (const raw of validUrls) {
    const url = raw.trim();
    const tweetId = extractTweetId(url);
    if (!tweetId || seen.has(tweetId)) continue;
    seen.add(tweetId);
    toImport.push({ tweetId, handle: extractHandle(url), url });
    if (toImport.length >= 100) break;
  }

  if (toImport.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  let imported = 0;
  let skipped = 0;

  for (const item of toImport) {
    const exists = await prisma.bookmark.findUnique({ where: { tweetId: item.tweetId } });
    if (exists) { skipped++; continue; }

    await prisma.bookmark.create({
      data: {
        tweetId: item.tweetId,
        authorHandle: item.handle,
        authorName: item.handle,
        text: `（未取得） https://x.com/${item.handle}/status/${item.tweetId}`,
        rawJson: JSON.stringify({ id: item.tweetId, url: item.url }),
        source: 'history-import',
        status: 'TO_READ',
      },
    });
    imported++;
  }

  // デモカードを削除（実データが入ったので）
  await prisma.bookmark.deleteMany({ where: { source: 'demo' } });

  if (imported > 0) {
    await logBehavior('bookmark_create');
    await logBehavior('import_complete');
  }

  return NextResponse.json({ imported, skipped });
}
