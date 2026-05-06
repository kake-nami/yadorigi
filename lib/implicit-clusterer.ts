/**
 * 暗黙クラスタリングエンジン — AIなし、ルールベースのみ。
 * UIには直接表示しない。KanbanカードとMindmapで小さく見せるだけ。
 */
import prisma from '@/lib/db';

interface BookmarkRow {
  id: string;
  importedAt: Date;
  entities: string | null;
  categories: { categoryId: string }[];
}

// ① 時間近接クラスタ
// 24h窓内に保存されたbookmarkのうち、カテゴリが同一のものをグルーピング
export async function timeProximityCluster(): Promise<number> {
  const bookmarks = await prisma.bookmark.findMany({
    select: {
      id: true,
      importedAt: true,
      entities: true,
      categories: { select: { categoryId: true } },
    },
    orderBy: { importedAt: 'asc' },
  });

  // 24h窓でスライディンググループを作成
  const clusters: string[][] = [];
  const visited = new Set<string>();

  for (let i = 0; i < bookmarks.length; i++) {
    if (visited.has(bookmarks[i].id)) continue;
    const anchor = bookmarks[i];
    const anchorCats = new Set(anchor.categories.map(c => c.categoryId));
    if (anchorCats.size === 0) continue;

    const group = [anchor.id];
    visited.add(anchor.id);

    for (let j = i + 1; j < bookmarks.length; j++) {
      const candidate = bookmarks[j];
      const diff = candidate.importedAt.getTime() - anchor.importedAt.getTime();
      if (diff > 24 * 60 * 60 * 1000) break; // 24h超えたら打ち切り

      if (visited.has(candidate.id)) continue;
      const candidateCats = candidate.categories.map(c => c.categoryId);
      const shared = candidateCats.some(c => anchorCats.has(c));
      if (shared) {
        group.push(candidate.id);
        visited.add(candidate.id);
      }
    }

    if (group.length >= 2) {
      clusters.push(group);
    }
  }

  let created = 0;
  for (const group of clusters) {
    const cluster = await prisma.implicitCluster.create({
      data: { type: 'time-proximity', weight: 1.0 },
    });
    await prisma.bookmark.updateMany({
      where: { id: { in: group } },
      data: { implicitClusterId: cluster.id },
    });
    created++;
  }

  return created;
}

// ② 共通エンティティクラスタ
// entities JSON から共通URLドメイン・@mentionでグルーピング
export async function sharedEntityCluster(): Promise<number> {
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      entities: { not: null },
      implicitClusterId: null, // 時間近接で未クラスタリングのもののみ
    },
    select: { id: true, entities: true },
  });

  // ドメイン → bookmark ID のマップ
  const domainMap = new Map<string, string[]>();
  const mentionMap = new Map<string, string[]>();

  for (const bm of bookmarks) {
    if (!bm.entities) continue;
    try {
      const parsed = JSON.parse(bm.entities) as {
        urls?: string[];
        mentions?: string[];
      };

      for (const url of parsed.urls ?? []) {
        try {
          const domain = new URL(url).hostname.replace(/^www\./, '');
          if (!domain.includes('t.co') && !domain.includes('twitter.com') && !domain.includes('x.com')) {
            const list = domainMap.get(domain) ?? [];
            list.push(bm.id);
            domainMap.set(domain, list);
          }
        } catch { /* ignore malformed URLs */ }
      }

      for (const mention of parsed.mentions ?? []) {
        const list = mentionMap.get(mention) ?? [];
        list.push(bm.id);
        mentionMap.set(mention, list);
      }
    } catch { /* ignore malformed JSON */ }
  }

  // ドメインが共通するbookmarkをグルーピング
  const groups: string[][] = [];
  const visited = new Set<string>();

  for (const [, ids] of [...domainMap, ...mentionMap]) {
    const fresh = ids.filter(id => !visited.has(id));
    if (fresh.length >= 2) {
      groups.push(fresh);
      fresh.forEach(id => visited.add(id));
    }
  }

  let created = 0;
  for (const group of groups) {
    const cluster = await prisma.implicitCluster.create({
      data: { type: 'shared-entity', weight: 1.0 },
    });
    await prisma.bookmark.updateMany({
      where: { id: { in: group } },
      data: { implicitClusterId: cluster.id },
    });
    created++;
  }

  return created;
}

// クラスタリングを実行（既存クラスタをリセットしてから再計算）
export async function runClustering(): Promise<{ timeClusters: number; entityClusters: number }> {
  // 既存のclusterIdをリセット
  await prisma.bookmark.updateMany({
    data: { implicitClusterId: null },
  });
  // 古いImplicitClusterを削除
  await prisma.implicitCluster.deleteMany({});

  const timeClusters = await timeProximityCluster();
  const entityClusters = await sharedEntityCluster();

  return { timeClusters, entityClusters };
}

// クラスタIDに属するbookmarkの件数を取得（Kanbanカード表示用）
export async function getClusterSize(clusterId: string): Promise<number> {
  return prisma.bookmark.count({ where: { implicitClusterId: clusterId } });
}
