import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ftsSearch } from '@/lib/fts';

// 1件目のbookmark投入直後に「関連しそう」候補を返すエンドポイント（Task 7）
// FTS5でキーワード検索し、自分自身を除いた上位3件を返す
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ related: [] });

  const bookmark = await prisma.bookmark.findUnique({
    where: { id },
    select: { text: true, entities: true, semanticTags: true },
  });
  if (!bookmark) return NextResponse.json({ related: [] });

  // キーワード抽出: テキストから長い単語 + semanticTags
  const words = bookmark.text
    .replace(/https?:\/\/\S+/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .slice(0, 6);

  // M-2: エンリッチ失敗時など不正 JSON が入り得るため try-catch で保護
  let tags: string[] = []
  try {
    if (bookmark.semanticTags) tags = (JSON.parse(bookmark.semanticTags) as string[]).slice(0, 4)
  } catch { /* ignore */ }

  const keywords = [...new Set([...words, ...tags])];

  if (keywords.length === 0) return NextResponse.json({ related: [] });

  const ids = await ftsSearch(keywords);
  const candidateIds = ids.filter(i => i !== id).slice(0, 5);

  if (candidateIds.length === 0) return NextResponse.json({ related: [] });

  const related = await prisma.bookmark.findMany({
    where: { id: { in: candidateIds } },
    select: {
      id: true,
      tweetId: true,
      text: true,
      authorHandle: true,
    },
    take: 3,
  });

  return NextResponse.json({ related });
}
