# Yadorigi ブリッジドキュメント v1.2

<!-- このドキュメントを Claude Code に渡して実装を開始してください -->
<!-- 設計フェーズ完了：2026-05-04 -->
<!-- v1.0 (2026-05-04): 初版作成 -->
<!-- v1.1 (2026-05-04): プロダクト名 Yadorigi 確定 -->
<!-- v1.2 (2026-05-04): ChatGPT 3ラウンドレビュー反映、構造変更を含む大型アップデート -->
<!-- ベースリポジトリ：https://github.com/viperrcrypto/Siftly （フォーク） -->

---

## 製品名について

**Yadorigi（宿り木）** — 鳥が運んだものが宿る、共生の樹。

Xの青い鳥が運んでくる「保存しておきたい」tweetたちが、この場所に静かに宿る。必要なときに芽吹き、行動へと結びつく。それがこのプロダクトの中心構造。

**設計哲学との対応**：
- 「Xに溶け込み、Xから一歩離れる」= 宿り木は他の樹に依存するが寄生ではなく共生
- 「保存することは未来の自分との約束」= 鳥が運んだ種子が、時を待って芽吹く

**姉妹プロダクト Tsuzuri との narrative pair**：

> **「Yadorigi で集めて、Tsuzuri で綴る」**

| 製品 | 役割 |
|---|---|
| **Yadorigi（宿り木）** | 入力 — 読む、蓄える、再訪する |
| **Tsuzuri（綴り）** | 出力 — 綴る、編む、公開する |

知的生産の入り口と出口を、同じ哲学コードを共有するローカルOSSで支える。

---

## 関連文書ファミリー

実装着手前に以下の文書すべてに目を通すこと：

```
yadorigi-bridge-doc.md（このドキュメント）
  └ 実装着手用PRD・全体マップ

yadorigi-design-philosophy.md
  └ 設計哲学コード（メタ原則 + X親和ノームコア + CONTRIBUTING向け）

yadorigi-review-response-v1.md / v2.md / v3.md
  └ ChatGPT 3ラウンドレビューへの応答記録（判断トレース）

将来追加予定：
  yadorigi-security.md      セキュリティ要件詳細
  yadorigi-ai-ethics.md     AI倫理・コンテンツ責任
  yadorigi-journey.md       カスタマージャーニー詳細
  yadorigi-legal.md         法務要件・OSS LICENSE
  yadorigi-contributing.md  コントリビューター運営指針
```

---

## v1.2 の主要変更点

ChatGPT 3ラウンドの構造的批判レビューを反映した大型アップデート。以下が v1.1 からの主要変更：

| 領域 | 変更内容 |
|---|---|
| **メタ原則** | philosophy に第0章「考えさせないことが、最大のリスペクト」を新設（v3-総括） |
| **入力経路** | X依存リスクを分散、JSONインポート必須化、X URL抽出4段regex仕様化（v1/v3-Q1） |
| **オンボーディング** | Day1価値発火を「擬似ストック生成」に再構築（同意フロー1ステップ + Demo 8件 + 履歴インポート2モード）（v2/v3-Q1） |
| **コア体験** | 成功状態を A1-A4 4並列パスに再構成（v1-Q3） |
| **計測哲学** | 「測らない」→「見せない計測」転換、3行動シグナル + 悪化対応マトリクス（v2/v3-Q3） |
| **セキュリティ** | DB暗号化デフォルトON + リカバリーキー強制生成設計（v2/v3-Q4） |
| **クラスタリング** | MVPは2層のみ（時間近接+エンティティ）、行動ベースv2延期（v3-Q2） |
| **規範性宣言** | サブ規範4「約束は守られなくても価値を生む」追加（v2-総括） |

---

## 1. 確定事項サマリ

### 1.1 コア体験（1文）

> このプロダクトは、**日本語Xユーザー**に、ブックマークを **「読む状態 × 行動予定」の二軸で構造化** することを **可能にし**、**保存と行動のあいだの断絶を解消する**体験を生むプロダクト

### 1.2 設計哲学コード概要

- **メタ原則（v1.2新設）**：「考えさせないことが、最大のリスペクトである」
- **大方針**：「Xに溶け込み、Xから一歩離れる」
- **トーン**：中立 + 事実報告寄り（詰問・煽り・過剰肯定すべて禁止）
- **装飾密度**：「中の下」（X参照点、わずかに余白多め）
- **禁止演出**：ストリーク・バッジ・ゲージ主役化・ゲーミフィケーション全般
- **規範性宣言**：「保存することは、未来の自分との約束である」（4つのサブ規範を伴う）
- **AI as Accelerator**：AIは加速装置、コア体験はAIなしで完結
- 詳細は `yadorigi-design-philosophy.md` 参照

### 1.3 ターゲット

**メインペルソナ B：日本語知的ワーカー（0.7）**
- 32〜45歳、首都圏／関西在住
- 職種：コンサルタント、リサーチャー、ライター・編集者、PM、教員、士業、独立クリエイター
- MacBook + iPhone使い、X Premium加入率高め
- 月50〜100件のXブックマーク
- 保存目的：「将来書く記事のネタ」「企画ヒント」「クライアント参考資料」
- 困りごと：英語UI主体ツールへの違和感／データの他社依存への不安／モバイルとデスクトップの分断

**サブペルソナ A：日本語テック層（0.3）**
- ソフトウェアエンジニア、SRE、AIエンジニア、デザイナー、スタートアップ創業者
- セルフホスト経験あり、GitHub frequent user
- **役割：初期コミュニティ・コントリビューター層**

**周辺関係者**
- 同居家族・パートナー（画面覗き見配慮）
- Xでフォロー/フォロワー関係にある人（demo image での暴露配慮）
- bookmark対象tweetの著者（「他人のtodo」化への配慮）
- tweet画像に写り込む第三者（person tag非生成）
- OSSコントリビューター（哲学コードreview）
- デジタル遺品観点（export手順整備、リカバリーキー喪失時の挙動明示）

**むしろ切る層**（README で明示）
- 英語Xを主に使う人 → Karakeep / Readwise を推奨
- モバイルネイティブをすぐ求める人 → v2 まで待つ
- クラウドSaaS派 → Readwise を推奨
- 全自動化を求める人 → Karakeep + Ollama を推奨

### 1.4 モート位置づけ

**Hybrid（System of Record性が強い設計）**

| 機能 | System of Record性 | Execution Layer性 |
|---|---|---|
| ブックマーク本体 | 弱（Xに原本） | 強 |
| 状態遷移履歴 | **強** | 弱 |
| ActionLink graph | **極強** | 弱 |
| AI accept/reject ログ | 中 | 強 |
| Tsuzuriへのフィード | **極強** | - |

エージェント代替リスクへの防御：**継続性 × 構造性 × ローカル所有**の3点同時。

### 1.5 規制・第三者権利サマリ

**判定：A（該当なし／低リスク）**

OSS + ローカル運用 + 公開機能ゼロの3点で構造的にリスクを消した。詳細はv1.1を継承。

### 1.6 課金モデル

**OSS完全無料（モデル D + G の組み合わせ）**

- **MVP〜v1.x**：完全無償（GitHub Sponsors任意）
- **v1.x〜v2**：Tsuzuri接続でTsuzuri側が課金（本プロダクトは無料のまま）
- **v2以降**：法人化後、ホステッド版の選択肢を検討

### 1.7 無料/有料の境界

OSSなので「境界」の意味は再定義。すべての主機能がOSSで動く（v1.1継承）。

### 1.8 コア操作（Day1価値発火型）★v1.2大幅改訂

**段階的ハイブリッドフロー + 擬似ストック生成**

```
[インストール] 
    ↓
[初回起動：1ステップ同意フロー]
   「過去の閲覧から"再発見"を作りますか？」
   [はい（推奨）] [いいえ]
    ↓
[はい] → ブラウザ履歴インポート
         A: X特化（status URL）デフォルト / B: 全ドメイン軽分類 オプション
         直近7日、最大100件、ローカル処理
[いいえ] → Demoカード 8件表示（仕事3+趣味3+調べ物2、再訪済み1+関連あり1）
    ↓
[Kanban dashboard表示]
    ↑ 価値到達（Day1で「再発見」体験を擬似発火）
    ↓
[X import (任意)] → 全件 TO_READ に投入
    ↓
[「分類実行」ボタン]
   ├─ AI使う → AI提案、Kanbanで承認/却下
   └─ AI使わない → そのままKanban、Entity抽出のみ動作
```

**Day1コア体験の発火条件**：
- ストックゼロでも擬似ストックで再発見が起きる
- Demoカードは Day1 のみ表示、import完了後に自動削除
- 1件目の bookmark が入った瞬間に Entity抽出 + 関連候補表示

### 1.9 成功状態（4並列パス）★v1.2再構成

ActionLink単一依存リスクを回避するための複線設計：

**コア体験 A（4並列パスのいずれかが起きた瞬間）**：
- **A1**：明示ActionLink経由で過去bookmarkを参照
- **A2**：暗黙クラスタ（自動提案 Project）経由で参照
- **A3**：検索で過去bookmarkを発見し、現在の作業に活用
- **A4**：Mindmap で偶発的に過去bookmarkに再会

**サブ体験**：
- **B（v1.x育成）**：新しいテーマで過去bookmarkがActionLink経由で再発見される瞬間
- **C（v2 + Tsuzuri接続後）**：「読んだ」「Evergreen」のbookmarkがnote草稿に繋がる瞬間

**前提**：
- ActionLink利用率は全ユーザーの30%程度を想定（楽観的に60%ではない）
- 70%のユーザーは検索 / Mindmap / 暗黙クラスタで価値を得る
- これにより「**整理しないユーザーでも価値が出る**」設計が成立

**周辺関係者の成功状態**（v1.1継承）

### 1.10 想定論点 8つ（防御線）

v1.1継承。README向け（1〜5）と内部戦略メモ向け（6〜8）の2層運用。

### 1.11 計測哲学（「見せない計測」）★v1.2全面書き換え

**基本原則**：「**見せることが、信頼を毀損してはならない**」

完全に測らないのではなく、**ユーザーUIには一切表示しない**。Goodhart's Law を構造的に回避しつつ、改善ループを維持する。

**3つの行動シグナル**（ローカルで取得、UIには出さない）：

| # | シグナル | 計算方法 | 死活閾値 |
|---|---|---|---|
| 1 | **継続利用率** | 7日以内に2回以上起動した user 割合 | < 30% で価値発火失敗 |
| 2 | **データ残存率** | 作成された bookmark が7日後も残っている割合 | < 70% で価値なし |
| 3 | **再訪発生率（コアKPI）** | 作成後7日以内に再度開かれたbookmark数 ÷ 作成総数（bookmark単位×7日窓） | < 15% でコア体験届かず |

**シグナル悪化対応マトリクス**：

| パターン | 対応 |
|---|---|
| 全部悪い | プロダクト成立せず → コンセプトから見直し → やらなかった集行きの可能性 |
| 再訪だけ悪い | コア価値崩壊 → 最優先で修正 |
| 継続だけ悪い | 初期体験 or 習慣設計の問題 |
| 残存だけ悪い | ノイズ多 or 保存価値低 |

**サーベイの位置づけ**：
- N=30 サーベイは**仮説生成・違和感の検知のみ**に使用
- **定量判断・優先順位決定には使わない**（N=30で判断すると普通に間違える）

**v2 以降**：opt-in テレメトリを default OFF で実装

### 1.12 カスタマージャーニー要約 ★v1.2 Day1改訂

| フェーズ | 設計内容 |
|---|---|
| 認知 | GitHub Trending／作者プロダクト群相互リンク／はてな・Zenn・Qiita記事／Xシェアボタン（v1.x以降）／Reddit |
| 検討 | Karakeep / Siftly本家との比較／信頼の根拠（哲学コード明文化、demo動画） |
| インストール | 1ステップ同意フロー + 履歴インポート / Demoカード 8件で **Day1から再発見体験** |
| **初回1分** | **Demoカード8件 or 履歴インポート結果**が Kanban grid に並ぶ。**Day1で再発見体験が擬似発火** |
| 1日目 | 1件目のbookmark投入 → Entity抽出 + 関連候補表示で「これも関連していた」体験 |
| 7日目 | 習慣化判定（status遷移複数回） / 行動シグナル「継続利用率」観測点 |
| 30日目 | コア体験 A1-A4 のいずれかが発生（複線パスで発生確率向上） / 行動シグナル全指標観測 |
| 継続期 | 飽き対策（季節アップデート）／ActionLink graph + 暗黙クラスタから関心パターン発見 |
| 離脱・休眠 | 2週間アクセスなしを予兆／Tsuzuri接続が再開動機／**解約という概念がない（OSS）** |
| 口コミ・紹介 | コア体験A発生時のXシェアボタン押下（v1.x以降） |

### 1.13 リリース計画

**MVP（v0.1〜v0.x、3ヶ月以内）**
- Xブックマーク取り込み（X API + bookmarklet + JSONインポート 三本柱）
- 4列Kanbanビュー（TO_READ / IN_PROGRESS / DONE / EVERGREEN）
- ActionLink + プロジェクト管理
- **暗黙クラスタリング 2層**（時間近接 + 共通エンティティ）
- Entity抽出（AI不要）
- AI Vision tagging + Semantic tagging（オプトイン）
- 全文検索、Mindmap基本ビュー、CSV/JSONエクスポート
- ダーク/ライトモード対応
- **DB暗号化デフォルトON + リカバリーキー強制生成**
- **オンボーディング：1ステップ同意 + Demoカード8件 + 履歴インポート2モード**
- 哲学コード文書整備
- 行動シグナル記録（裏で取得、UIには出さない）

**v1.x（3〜9ヶ月後）**
- Mindmap本格対応
- PWA対応（manifest.json + service worker）
- Xシェアボタン（タイプβのみ）
- Tsuzuri接続のAPI公開とドキュメント
- 集中モード（カードぼかしトグル）
- 死後アクセス手順書
- サーベイによる仮説生成 / 違和感検知

**v2（1年以降、法人化後）**
- iOS/Androidネイティブアプリ
- Tsuzuri統合の本格運用
- ホステッド版（選択肢として）
- スキン選択UI
- **暗黙クラスタリング 行動ベース層追加**
- opt-in テレメトリ（default OFF）
- 多言語対応（i18n、英語UI追加）

### 1.14 成長ループ

v1.1継承。Phase 0（Tech層）→ Phase 1（知的ワーカー層）→ Phase 2（一般X層）の段階展開。

---

## 2. PRD

### 概要
Siftly本家（ローカルXブックマーク管理 + AIビジョン分析 + Mindmap）をフォーク・拡張し、**「読む状態 × 行動予定」の二軸構造**を加える日本語Xユーザー向けOSS製品。

### 目的
日本語Xユーザーが直面する「ブックマークを保存しても活用されない」問題を、Kanban + ActionLink + 暗黙クラスタで構造化することで解消する。**ユーザーが整理に手間をかけなくても価値が漏れ出る設計**を採る。

### ターゲット
1.3 参照。

### モート位置づけ
Hybrid（System of Record性が強い）。1.4 参照。

### 規制・第三者権利
判定A（該当なし／低リスク）。1.5 参照。

### 設計哲学コード
1.2 参照。詳細は別文書。

### 機能（OSSなので「無料版」がすべて）
1.7 参照。

### 「有料」の意味
OSSのため本プロダクト自体に有料版なし。Tsuzuri送客 / 将来のホステッド版で間接的収益動線。

### 非目標 ★v1.2拡張

1. AIによる全自動分類・全自動ステータス遷移
2. クラウド/SaaS提供
3. 英語圏ユーザーへの最適化（i18n対応自体は否定しない）
4. モバイルネイティブアプリのMVP同梱（v2まで延期）
5. **Xへの完全依存（リスク分散としての複数入力経路を MVP から実装）**（v1.2追加）
6. **行動ベースの暗黙クラスタ（v2まで延期、ノイズ過大）**（v1.2追加）

### 想定論点
1.10 参照。

### KPI
NSM公式設定なし。3つの行動シグナルで質的評価。1.11 参照。

### カスタマージャーニー / リリース計画 / 成長ループ
1.12 / 1.13 / 1.14 参照。

---

## 3. 実装への申し送り

### 3.1 プラットフォーム
- **MVP**：Web App（デスクトップブラウザ主体）
- **v1.x**：Web + PWA（モバイル使用感向上）
- **v2**：上記 + iOS/Android ネイティブ（法人化後）

### 3.2 技術スタック

**継承（Siftly本家から）**
- Next.js (App Router) + TypeScript
- Prisma + SQLite（FTS5 含む）
- Anthropic API（Claude Sonnet 4.6 / Opus 4.7 でVision分析強化）
- shadcn/ui + Tailwind + Radix UI + Framer Motion

**新規追加**
- **DB暗号化**：SQLCipher（デフォルトON）
- **OS keychain連携**：macOS Keychain / Windows Credential Manager / Linux secret-tool
- **Kanban DnD**：`@dnd-kit`
- **API境界**：tRPC（type-safe）
- **状態管理**：Zustand or React Context（軽量）
- **クラスタリング**：自前実装（TF-IDF / 時間ウィンドウ）

### 3.3 データモデル拡張（Prisma）

```prisma
enum BookmarkStatus {
  TO_READ
  IN_PROGRESS
  DONE
  EVERGREEN
}

model Bookmark {
  // 既存フィールド継承
  status         BookmarkStatus @default(TO_READ)
  statusUpdatedAt DateTime      @default(now())
  actionLinks    ActionLink[]
  
  // v1.2追加：再訪追跡用
  lastOpenedAt   DateTime?
  openCount      Int            @default(0)
  
  // v1.2追加：暗黙クラスタ用
  implicitClusterId String?
  
  // v1.2追加：source識別
  source         String         @default("x")  // "x" | "history-import" | "demo"
}

model ActionItem {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?
  createdAt   DateTime @default(now())
  archivedAt  DateTime?
  actionLinks ActionLink[]
}

model ActionLink {
  id           String     @id @default(cuid())
  bookmarkId   String
  actionId     String
  note         String?
  createdAt    DateTime   @default(now())
  bookmark     Bookmark   @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  actionItem   ActionItem @relation(fields: [actionId], references: [id], onDelete: Cascade)
  
  @@unique([bookmarkId, actionId])
}

// v1.2追加：暗黙クラスタ
model ImplicitCluster {
  id        String   @id @default(cuid())
  type      String   // "time-proximity" | "shared-entity"
  label     String?  // 自動生成された軽いラベル
  weight    Float    @default(1.0)  // dismiss/手動結合で更新
  createdAt DateTime @default(now())
  bookmarks Bookmark[] @relation("BookmarkCluster")
}

// v1.2追加：行動シグナル記録（ローカルのみ、UIに出さない）
model BehaviorLog {
  id        String   @id @default(cuid())
  type      String   // "open" | "create" | "delete" | "session_start"
  bookmarkId String?
  timestamp DateTime @default(now())
}
```

### 3.4 API境界の確立（tRPC routes）

書き込みエンドポイント（Mobile / Tsuzuri接続で必要）：

```typescript
- bookmarks.updateStatus(id, status)
- bookmarks.linkToAction(bookmarkId, actionId, note?)
- bookmarks.unlinkFromAction(bookmarkId, actionId)
- bookmarks.markAsOpened(id)  // v1.2追加：再訪トラッキング
- actions.create(name, description?, color?)
- actions.update(id, fields)
- actions.archive(id)
- categories.acceptSuggestion(bookmarkId, categoryId)
- categories.rejectSuggestion(bookmarkId, categoryId)
- clusters.dismiss(clusterId)  // v1.2追加：dismiss → 重み下げ
- clusters.merge(clusterIds[])  // v1.2追加：手動結合 → 重み上げ
```

### 3.5 入力経路の三本柱 ★v1.2新設

**A. X API**（フルOAuth、自動同期、最強だが脆弱）
- 2026年4月20日のOwned Reads値下げを活用
- $0.001/件、上限・契約なし
- API故障時に他経路にフォールバック

**B. Bookmarklet**（DOM依存、フォールバック）
- 既存Siftly本家の機能を維持
- DOM変更で壊れる前提で運用

**C. JSONインポート**（最も安定、MVP必須）
- X公式のデータエクスポート（archive ZIP）から bookmarks.js を抽出
- 上記2つが故障してもこれで運用継続可能

**D. ブラウザ履歴インポート**（オンボーディング Day1価値用、オプトイン）

X URL抽出4段regex仕様：

```javascript
// Step1: ドメインフィルタ
const DOMAIN_PATTERN = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//;

// Step2: 有効パス抽出（投稿URLのみ）
const STATUS_PATTERN = /\/(status|i\/web\/status)\/(\d+)/;

// Step3: ノイズ除去
const EXCLUDE_PATHS = ['/home', '/explore', '/notifications', '/messages'];

// Step4: 重複排除
function extractUniqueStatusIds(urls) {
  return [...new Set(urls.map(url => {
    const m = url.match(STATUS_PATTERN);
    return m ? m[2] : null;
  }).filter(Boolean))];
}
```

履歴インポートモード：
- **A: X特化（デフォルト）**：上記regexでstatus URLのみ抽出
- **B: 全ドメイン**：全URLをbookmark化、軽分類のみ
- B選択後も「X以外を非表示」フィルタで切替可能

### 3.6 暗黙クラスタリング実装 ★v1.2新設

**MVP採用：2層**

**① 時間近接クラスタ（メイン）**
```javascript
// 24h以内に保存 + カテゴリ類似 でグルーピング
function timeProximityCluster(bookmarks) {
  const window = 24 * 60 * 60 * 1000;  // 24h
  // 隣接bookmarksをカテゴリでグループ化
}
```

**② 共通エンティティクラスタ（補助）**
```javascript
// URL domain / 人物名（辞書） / TF-IDF上位語 で同一性判定
function sharedEntityCluster(bookmarks) {
  // Entity抽出結果から共通項を見つける
}
```

**未採用（v2以降）**：行動ベース（短時間複数閲覧 / 連続クリック）

**UI原則**（philosophy 第11章準拠）：
- 「クラスタ作りますか？」と聞かない（NG）
- 「すでにまとまっている」ように見せる（OK）
- 軽いラベル表示のみ（「他に3件、似た内容」程度）
- 自動フォルダ化はしない、提案レベルに留める
- 1クリックで dismiss可能
- dismiss → 内部的に重み下げ、ユーザーには「学習している」と見せない

### 3.7 セキュリティ設計の骨子 ★v1.2全面改訂

**A. ローカルDB暗号化（デフォルトON）**

```
初回起動フロー：
1. Yadorigi 起動
2. OS keychain にアクセス
3. ランダム32-byte 鍵を自動生成、OS keychain に保存
4. SQLCipher で DB を AES-256 暗号化
5. リカバリーキー（32桁英数字）を別途生成
6. 「リカバリーキーを保存してください」モーダル表示
   - [コピー] [ファイルでダウンロード] のいずれかを強制
   - 警告：「このキーは1度しか表示されません。失うとデータ復旧不可です」
   - 確認チェック「保存しました」で進む
7. 「セキュアモードで起動しました」toast表示
```

**B. APIキー管理**
- OS keychain 優先、フォールバックで `.env`（gitignored）
- UI上で「OS keychainに保存されています」と明示
- キーを画面に**復元表示しない**（書き直し再入力のみ）

**C. 著作権/利用規約リスク（X）**
- README で「私的複製の範囲、再配布禁止」明記
- X規約遵守義務をユーザーに明示
- API rate limit を尊重する実装

**D. ローカル漏洩経路**
- スクショ／画面共有：集中モード（v1.x、カードぼかしトグル）
- 同期（Dropbox等）：DB暗号化ON前提なら問題なし
- ブラウザキャッシュ：OAuth token のlocalStorage保存禁止

**E. OSS改ざん・悪意fork対策**
- main branch への commit signing 義務化
- リリースに checksum (SHA256) 添付
- LICENSE と SECURITY.md を整備

**F. 鍵喪失リカバリー**
- 定期エクスポート推奨（設定画面に「バックアップを推奨」）
- 月1回など定期通知（強制ではない）
- 鍵喪失時：復旧不可を明示、新規DBで再スタート

**G. 開発者用例外**
- 環境変数 `YADORIGI_NO_ENCRYPTION=1` で暗号化を無効化（CI/開発専用）
- README に「production使用では絶対に設定しない」と警告

### 3.8 実装上の優先順位 ★v1.2再構成

1. **データモデル拡張**（Prismaスキーマ：status enum + ActionLink + ActionItem + ImplicitCluster + BehaviorLog）
2. **DB暗号化基盤**（SQLCipher + OS keychain連携）
3. **API境界の確立**（tRPC routes）
4. **入力経路三本柱**（X API + Bookmarklet + JSONインポート）
5. **オンボーディング**（同意フロー1ステップ + Demoカード8件 + 履歴インポート2モード）
6. **Kanbanビュー**（@dnd-kit、4列、ドラッグ&ドロップ）
7. **ActionLink紐付けUI**
8. **暗黙クラスタリング2層**（時間近接 + 共通エンティティ）
9. **AI提案フロー強化**（既存4段階パイプラインに承認/却下UI）
10. **行動シグナル記録**（BehaviorLog、UIには出さない）
11. **設定画面**（AIキー入力、API使用オプトイン、データexport、リカバリーキー再生成）
12. **哲学コード文書整備**（CONTRIBUTING.md / DESIGN_PHILOSOPHY.md）

### 3.9 Siftly本家との関係

- フォーク元：https://github.com/viperrcrypto/Siftly
- 既存4段階AIパイプライン（Entity抽出 → Vision → Semantic tagging → Categorization）は維持
- 既存機能はすべて維持
- start.sh / 既存設定を壊さない
- 新規追加部分（Kanban、ActionLink、暗黙クラスタ、暗号化、行動ログ）は別ファイル / 新ディレクトリ
- upstream の更新を取り込み続ける（rebase可能性を維持）

### 3.10 Tsuzuri接続点の予約（v1.x実装）

- ActionItem / ActionLink を「外部リソースID」を抽象的に持てるスキーマ
- export API を JSON Schema で公開
- 配慮対象辞書を別リポジトリ化する設計余地

---

## 4. 反証可能性（このドキュメント全体への自己検証）

実装後、以下のシグナルが点灯したら、bridge-doc / 関連文書の見直しを実施：

- **Phase 0 でTech層が集まらない**（Stars < 100、Contributors < 3）→ 認知チャネル見直し
- **Phase 1 への移行で知的ワーカー層が流入しない** → Tsuzuri接続体験 / Xシェアボタン設計見直し
- **行動シグナル全悪化** → コンセプトから見直し、やらなかった集行きの可能性
- **再訪発生率 < 15%** → コア体験崩壊、最優先で修正
- **Karakeepが日本語特化アップデート発表** → 差別化軸再検討
- **Siftly本家がIssue #59を直し、kanban + status実装** → upstream合流 or 撤退
- **AIエージェントが「kanban状態 + project紐付け」をネイティブ化** → moat再評価
- **暗黙クラスタリングのノイズ多発** → MVP段階での即修正、行動ベース永久延期検討

---

## 5. 開発環境

NomuToki / LatteGram / Tsuzuri と同様のハイブリッドワークフロー：

- **主開発**：Claude Code on Windows PC
- **Mac作業**：必要に応じて MacBook Air M1
- **iOS関連**：v2以降（法人化後にXcode対応）
- **CI/CD**：GitHub Actions
- **デプロイ**：Self-host前提（Docker compose）。法人化後にホステッド版（Vercel / Cloudflare Pages 等）の選択肢

---

## 更新履歴

- 2026-05-04 v1.0 初版作成
- 2026-05-04 v1.1 プロダクト名「Yadorigi（宿り木）」確定。製品名セクション追加、姉妹プロダクトとの narrative pair 明記
- 2026-05-04 v1.2 ChatGPT 3ラウンドレビュー反映の大型アップデート：
  - メタ原則 第0章「考えさせないことが、最大のリスペクト」追加（philosophy）
  - 入力経路の三本柱化（JSONインポート必須）、X URL抽出4段regex仕様化
  - オンボーディング Day1価値発火再構築（同意フロー1ステップ + Demo 8件 + 履歴インポート2モード）
  - 成功状態を A1-A4 4並列パスに再構成（ActionLink単一依存リスク回避）
  - 計測哲学を「測らない」→「見せない計測」に転換、3行動シグナル + 悪化対応マトリクス
  - DB暗号化デフォルトON + リカバリーキー強制生成設計
  - 暗黙クラスタリング2層（時間近接+エンティティ）、行動ベースv2延期
  - 規範性宣言サブ規範4「約束は守られなくても価値を生む」追加（philosophy）
  - データモデル拡張（ImplicitCluster, BehaviorLog, lastOpenedAt等）
