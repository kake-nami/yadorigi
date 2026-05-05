import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 8件のデモブックマーク: 仕事系3 + 趣味系3 + 調べ物2
const DEMO_BOOKMARKS = [
  // 仕事系
  {
    tweetId: 'demo_0000000000001',
    authorHandle: 'yuki_dev',
    authorName: 'Yuki Dev',
    text: 'Claude 3.5 SonnetでAIエージェントを作ってみた。ツール呼び出しの精度が上がって実用的になってきた。特にコードレビューの自動化が想像以上に使える。プロンプトの工夫次第でかなり変わる。',
    openCount: 0,
  },
  {
    tweetId: 'demo_0000000000002',
    authorHandle: 'ts_architect',
    authorName: 'TypeScript Architect',
    text: 'TypeScriptのsatisfies演算子、使いこなせてる？型推論を維持しながら型チェックできるから、as const の代替として超便利。特にconfig objectの定義で威力を発揮する。',
    openCount: 0,
  },
  {
    tweetId: 'demo_0000000000003',
    authorHandle: 'pm_notes',
    authorName: 'PM Notes',
    text: 'OKRを四半期ごとに立てるの、もうやめた。月次サイクルに変えたら開発チームとの認識ズレが激減した。長すぎる目標設定期間は変化への適応を遅くするだけ。',
    openCount: 2, // 再訪済み
  },
  // 趣味系
  {
    tweetId: 'demo_0000000000004',
    authorHandle: 'coffee_roaster',
    authorName: 'コーヒー焙煎士',
    text: 'エチオピア・イルガチェフェの浅煎り、ようやく狙い通りの味に。華やかなジャスミンと柑橘の香りを出すには、1ハゼ直後に温度を落とすのがコツ。フルシティ以上に焼くと台無し。',
    openCount: 0,
  },
  {
    tweetId: 'demo_0000000000005',
    authorHandle: 'book_log',
    authorName: '読書ログ',
    text: '「動かすことを止めよ」読了。著者が言う「静けさとは無活動ではなく、不必要な動きを排除すること」という定義が刺さった。忙しさを生産性と勘違いしている現代人への処方箋。',
    openCount: 0,
  },
  {
    tweetId: 'demo_0000000000006',
    authorHandle: 'run_weekly',
    authorName: '週次ランナー',
    text: '6月のフルマラソンに向けてトレーニング計画を組み直し。ポイント練習は週2回（閾値走+インターバル）、残りはゾーン2の有酸素。80/20ルールを徹底する。',
    openCount: 0,
  },
  // 調べ物
  {
    tweetId: 'demo_0000000000007',
    authorHandle: 'tax_memo',
    authorName: '確定申告メモ',
    text: '確定申告の期限は毎年3月15日。e-Taxなら延長なしで3月15日まで。医療費控除は年10万円超or所得の5%超から。領収書はデジタル保存でもOKになった（電帳法対応済みなら）。',
    openCount: 0,
  },
  {
    tweetId: 'demo_0000000000008',
    authorHandle: 'life_hacks_jp',
    authorName: 'ライフハックJP',
    text: '賃貸更新の交渉、実は更新の2〜3ヶ月前が最適タイミング。「周辺相場と比較して〇〇円高い」という具体的なデータを持参すると成功率が上がる。礼儀正しく、でも論理的に。',
    openCount: 0,
  },
];

export async function POST() {
  // 既存のデモカードがあればスキップ
  const existing = await prisma.bookmark.findFirst({ where: { source: 'demo' } });
  if (existing) {
    return NextResponse.json({ ok: true, created: 0 });
  }

  const now = new Date();
  let created = 0;

  for (const demo of DEMO_BOOKMARKS) {
    const importedAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    await prisma.bookmark.upsert({
      where: { tweetId: demo.tweetId },
      update: {},
      create: {
        tweetId: demo.tweetId,
        authorHandle: demo.authorHandle,
        authorName: demo.authorName,
        text: demo.text,
        rawJson: JSON.stringify({ id: demo.tweetId, text: demo.text }),
        source: 'demo',
        status: 'TO_READ',
        openCount: demo.openCount,
        lastOpenedAt: demo.openCount > 0 ? new Date(importedAt.getTime() + 60 * 60 * 1000) : null,
        importedAt,
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}

// X importが完了したらデモカードを削除
export async function DELETE() {
  const result = await prisma.bookmark.deleteMany({ where: { source: 'demo' } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
