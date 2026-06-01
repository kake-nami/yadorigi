# Yadorigi — Claude Code 実装指示書 v1.0

<!-- このファイルをプロジェクトルートに置いてから Claude Code を起動してください -->
<!-- 作成日：2026-05-04 -->
<!-- ベース：https://github.com/viperrcrypto/Siftly (fork) -->

---

## このプロジェクトについて

**Yadorigi（宿り木）** は、Siftly をフォークして拡張した日本語Xユーザー向けローカルOSSです。

> 「Yadorigi で集めて、Tsuzuri で綴る」

Siftly が提供する「Xブックマーク × AI分析 × Mindmap」の基盤の上に、以下を追加します：
- **4列Kanban**（TO_READ / IN_PROGRESS / DONE / EVERGREEN）
- **ActionLink**（bookmark ↔ プロジェクト/行動予定の型付きリレーション）
- **暗黙クラスタリング**（時間近接 + 共通エンティティ、AIなしで動作）
- **DB暗号化**（SQLCipher、デフォルトON）
- **Day1価値発火**（同意1ステップ + Demoカード8件 + 履歴インポート）
- **見せない計測**（行動シグナル記録、UIには出さない）

---

## 最初にやること（MUST READ BEFORE CODING）

### 1. 設計文書を読む

以下の順番で読んでください：

```
docs/yadorigi-design-philosophy-v1.2.md  ← 全実装判断の上位制約
docs/yadorigi-bridge-doc-v1.2.md         ← PRD・実装仕様の全詳細
```

**設計哲学コードは実装の上位制約です。** bridge-doc に書かれた機能でも、設計哲学に反する場合は実装しないでください。

### 2. 既存コードを壊さない

Siftly 本家の以下はすべて維持してください：
- 4段階AIパイプライン（Entity抽出 → Vision → Semantic tagging → Categorization）
- Mindmap可視化（@xyflow/react）
- AI検索（FTS5 + Claude semantic reranking）
- Import機能（bookmarklet + JSONアップロード）
- Export機能（CSV / JSON / ZIP）
- start.sh / 既存設定ファイル
- カテゴリ管理
- Command Palette（Cmd+K）

### 3. 既存スキーマ確認

実装前に `prisma/schema.prisma` を確認し、既存モデル（Bookmark, MediaItem, BookmarkCategory, Category, Setting, ImportJob）との整合性を確認してください。

---

## 実装優先順位（この順番で進めてください）

### Phase 1：基盤整備（最初に完成させる）

#### Task 1：Prisma スキーマ拡張

`prisma/schema.prisma` に以下を追加してください：

```prisma
enum BookmarkStatus {
  TO_READ
  IN_PROGRESS
  DONE
  EVERGREEN
}

// Bookmarkモデルに追加するフィールド
// status         BookmarkStatus @default(TO_READ)
// statusUpdatedAt DateTime      @default(now())
// lastOpenedAt   DateTime?
// openCount      Int            @default(0)
// implicitClusterId String?
// source         String         @default("x")  // "x" | "history-import" | "demo"

model ActionItem {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?  // hex（例: "#6366f1"）
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

model ImplicitCluster {
  id        String   @id @default(cuid())
  type      String   // "time-proximity" | "shared-entity"
  label     String?
  weight    Float    @default(1.0)
  createdAt DateTime @default(now())
}

// 行動シグナル記録（UIには絶対に表示しない）
model BehaviorLog {
  id         String   @id @default(cuid())
  type       String   // "session_start" | "bookmark_open" | "bookmark_create" | "bookmark_delete"
  bookmarkId String?
  timestamp  DateTime @default(now())
}
```

マイグレーションを実行：
```
npx prisma migrate dev --name add-yadorigi-extensions
```

#### Task 2：DB暗号化基盤

**重要：デフォルトONで実装すること**

1. `better-sqlite3-sqlcipher` を `better-sqlite3` の代わりにインストール
2. OS keychain連携の実装（ライブラリ：`keytar`）
3. `lib/db.ts` を更新して暗号化DBに接続
4. 初回起動時のリカバリーキー生成フロー（`app/setup/page.tsx` 新規作成）

初回起動フロー：
```
1. OS keychainに32-byte鍵を自動生成・保存
2. リカバリーキー（英数字32桁）を別途生成
3. 「リカバリーキーを保存してください」モーダル
   - [コピー] [ファイルでダウンロード] のいずれかを強制
   - 「このキーは1度しか表示されません」
   - 「保存しました」チェック後に進む
4. 「セキュアモードで起動しました」toast（1秒）
```

環境変数 `YADORIGI_NO_ENCRYPTION=1` で無効化（開発・CI専用）。

#### Task 3：API境界（tRPC）

tRPCをインストールして書き込み系エンドポイントを実装：

```typescript
// 追加するエンドポイント（app/api/trpc/）
bookmarks.updateStatus(id: string, status: BookmarkStatus)
bookmarks.markAsOpened(id: string)
actions.create(name: string, description?: string, color?: string)
actions.update(id: string, fields: Partial<ActionItem>)
actions.archive(id: string)
bookmarks.linkToAction(bookmarkId: string, actionId: string, note?: string)
bookmarks.unlinkFromAction(bookmarkId: string, actionId: string)
clusters.dismiss(clusterId: string)  // 内部的に weight を 0.5× に下げる
clusters.merge(clusterIds: string[])  // 内部的に weight を 1.5× に上げる
```

---

### Phase 2：コア機能（Kanban + ActionLink）

#### Task 4：Kanbanビュー

- `app/kanban/page.tsx` を新規作成
- `@dnd-kit/core` と `@dnd-kit/sortable` を使用（react-beautiful-dnd は不採用）
- 4列構成：TO_READ / IN_PROGRESS / DONE / EVERGREEN
- ドラッグ&ドロップでステータス変更（tRPC `bookmarks.updateStatus` を呼ぶ）
- 既存の `components/bookmark-card.tsx` を拡張して status badge を追加
- サイドバーナビ（`components/nav.tsx`）に「Kanban」リンクを追加

**デザイン原則（哲学コードより）**：
- Kanbanの移動はアクション。「整理しました！」のような祝福表示は禁止
- ドラッグ中のアニメーションは `100-200ms` のみ
- 列ヘッダーはシンプルなラベルのみ（カウント表示はOK、強調禁止）

#### Task 5：ActionLink UI

- 各Kanbanカードに「+ 行動予定」ボタン（小さく、控えめに）
- クリックで ActionItem 選択/作成モーダル（既存の Radix UI Dialog を使用）
- ActionItem がある場合はカードに小さなバッジ表示
- `app/actions/page.tsx` でActionItem一覧管理ページを新規作成

---

### Phase 3：Day1価値発火（オンボーディング）

#### Task 6：初回起動オンボーディング

`app/onboarding/page.tsx` を新規作成。

初回のみ表示（`localStorage` or DB の `Setting` モデルで `onboarding_completed: true` を管理）。

フロー：
```
Step 1: 「過去の閲覧から"再発見"を作りますか？」
        [はい（推奨）] [いいえ]
        - 説明は3行以内
        - プライバシーは補足リンク（/privacy）に逃がす

Step 2a（はい）: ブラウザ履歴インポート
  - モード A: X特化（デフォルト）
    - URLフィルタ: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//
    - パスフィルタ: /(status|i\/web\/status)\/(\d+)/
    - 除外: /home, /explore, /notifications, /messages
    - status IDで重複排除
  - モード B: 全ドメイン（オプション）
  - 対象: 直近7日、最大100件
  - ローカル処理のみ（外部送信なし）を明示
  - 実行後 → Kanban dashboard へ

Step 2b（いいえ）: Demoカード 8件表示
  - 仕事系3件 + 趣味3件 + 調べ物2件
  - うち1件は「再訪済み」表示、1件は「関連あり」表示
  - source="demo" でマーク
  - ユーザーがX importを完了したら自動削除
  - Kanban dashboard へ
```

#### Task 7：1件目のbookmark投入時の意味付与

`lib/rawjson-extractor.ts` を拡張して、投入直後に：
1. Entity抽出（既存機能）→ 自動タグ表示
2. 類似bookmark候補を即座に検索（FTS5で既存DBから）
3. 「これと関連しそう」候補を小さく表示

---

### Phase 4：暗黙クラスタリング

#### Task 8：クラスタリングエンジン

`lib/implicit-clusterer.ts` を新規作成。AIなし、ルールベースのみ。

**① 時間近接クラスタ（メイン実装）**
```typescript
// 24h窓内に保存されたbookmarkのうち、
// カテゴリが同一または類似するものをグルーピング
async function timeProximityCluster(bookmarks: Bookmark[]): Promise<ImplicitCluster[]>
```

**② 共通エンティティクラスタ（補助実装）**
```typescript
// Entity抽出結果から共通URLドメイン/人物名/TF-IDF上位語でグルーピング
async function sharedEntityCluster(bookmarks: Bookmark[]): Promise<ImplicitCluster[]>
```

**行動ベースクラスタは実装しない（v2まで延期）**

**UIルール（厳守）**：
- 「クラスタ作りますか？」のようなモーダルは出さない
- bookmarkカードに「他に3件、似た内容」程度の小さなラベルのみ
- Mindmapでクラスタが見えるだけ、モーダルなし
- dismiss → 内部的に weight を 0.5× に下げる（ユーザーには通知しない）
- 手動結合 → 内部的に weight を 1.5× に上げる（ユーザーには通知しない）

---

### Phase 5：見せない計測

#### Task 9：行動シグナル記録

`lib/behavior-tracker.ts` を新規作成。

```typescript
// 記録するイベント
type BehaviorEventType = 'session_start' | 'bookmark_open' | 'bookmark_create' | 'bookmark_delete';

// セッション開始時に記録（app/layout.tsx に仕込む）
// bookmark_open は markAsOpened tRPC endpoint 経由
// bookmark_create / delete は既存のimport/delete APIに追加
```

**絶対にUIに表示しない。** Settingsページにも出さない。
開発者が `npx prisma studio` で確認できれば十分。

3つのシグナル計算ロジックも `lib/behavior-tracker.ts` に実装：
```typescript
// 継続利用率: 7日以内に2回以上session_startしたユーザー割合
// データ残存率: 作成後7日後も残っているbookmark割合  
// 再訪発生率: 作成後7日以内に再度openされたbookmark数 ÷ 作成総数
```

---

### Phase 6：X API入力経路（Issue #59 対応）

#### Task 10：X OAuth + Live Import 実装

Issue #59 が指摘している問題を解決してください：

1. `app/api/auth/x/` に OAuth 2.0 PKCE フローのエンドポイントを作成
2. `app/api/auth/x/callback/` にコールバックエンドポイントを作成
3. X API クライアントID/シークレットを Settings に追加（環境変数 `X_OAUTH_CLIENT_ID` / `X_OAUTH_CLIENT_SECRET` にも対応）
4. X API Owned Reads endpoint（`GET /2/users/:id/bookmarks`）の実装
5. ブックマーク取得後は既存のimportパイプラインに流す

X URL抽出regex（ブラウザ履歴インポート用）：
```javascript
const DOMAIN_PATTERN = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//;
const STATUS_PATTERN = /\/(status|i\/web\/status)\/(\d+)/;
const EXCLUDE_PATHS = ['/home', '/explore', '/notifications', '/messages'];
```

---

## 設計哲学コード（実装時の判断基準）

### メタ原則（最上位）

> **「考えさせないことが、最大のリスペクトである」**

- 同意フローは1クリック
- クラスタは説明不要
- 計測は裏でやる
- 暗号化は意識させない

### 禁止事項（PR reject対象）

以下のコードを書いた場合、レビューで reject します：

- ストリーク・バッジ・ゲーミフィケーション要素
- グラデーション・装飾シャドウ・派手なFramer Motionアニメーション（100-200ms超）
- AI全自動分類（承認/却下UIを必ず介すこと）
- 強制プッシュ通知（ただしリカバリーキー保存は例外）
- 詰問調・煽り調のコピー
- person tag 生成（Vision分析のプロンプトで明示禁止）
- 行動シグナルのUI表示
- DB暗号化のデフォルト無効化（`YADORIGI_NO_ENCRYPTION` 環境変数以外で）
- 「クラスタを作りますか？」のような確認モーダル

### コピーの原則

| NG | OK |
|---|---|
| 「32件を整理しました！🎉」 | 「32件を整理しました」 |
| 「未分類のブックマークがあります！」 | 「未分類: 12件」 |
| 「AIが分析しています...✨」 | skeleton screen で待つ |
| 「保存しました！」 | toast なし or 「保存しました」のみ |

---

## デザイントークン

以下の CSS variables を `app/globals.css` に定義してください。
将来のスキン切替のため、**色を直書きしないこと**。

```css
:root {
  /* Yadorigi X-adjacent theme */
  --color-bg: #000000;
  --color-surface: #0f0f0f;
  --color-surface-raised: #1a1a1a;
  --color-border: #2f3336;
  --color-text-primary: #e7e9ea;
  --color-text-secondary: #71767b;
  --color-accent: #1d9bf0;  /* X blue */
  --color-destructive: #f4212e;
  
  --radius-card: 12px;
  --radius-button: 9999px;
  
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 200ms;
}

[data-theme="light"] {
  --color-bg: #ffffff;
  --color-surface: #f7f9f9;
  --color-surface-raised: #eff3f4;
  --color-border: #cfd9de;
  --color-text-primary: #0f1419;
  --color-text-secondary: #536471;
  --color-accent: #1d9bf0;
  --color-destructive: #f4212e;
}
```

---

## テック スタック

| 技術 | バージョン | 用途 |
|---|---|---|
| Next.js | 16（既存） | App Router |
| TypeScript | 5（既存） | 型安全 |
| Prisma | 7（既存） | ORM |
| better-sqlite3-sqlcipher | 最新 | **暗号化SQLite（better-sqlite3を置換）** |
| keytar | 最新 | **OS keychain連携** |
| @dnd-kit/core + @dnd-kit/sortable | 最新 | **Kanban DnD** |
| tRPC | 最新 | **書き込み系API境界** |
| Tailwind CSS v4 | 既存 | スタイリング |
| Anthropic SDK | 既存 | AIパイプライン |
| @xyflow/react | 12（既存） | Mindmap |
| Framer Motion | 12（既存） | アニメーション（**控えめに使用**） |
| Radix UI | 既存 | UIプリミティブ |

---

## ファイル構造（新規追加分）

```
app/
├── kanban/
│   └── page.tsx              # Kanbanビュー（Task 4）
├── actions/
│   └── page.tsx              # ActionItem管理（Task 5）
├── onboarding/
│   └── page.tsx              # Day1オンボーディング（Task 6）
├── setup/
│   └── page.tsx              # 暗号化セットアップ（Task 2）
├── api/
│   ├── trpc/
│   │   └── [trpc]/
│   │       └── route.ts      # tRPC endpoint（Task 3）
│   └── auth/
│       └── x/
│           ├── route.ts      # X OAuth開始（Task 10）
│           └── callback/
│               └── route.ts  # X OAuth callback（Task 10）

components/
├── kanban/
│   ├── kanban-board.tsx      # Kanbanボード本体
│   ├── kanban-column.tsx     # 列コンポーネント
│   └── kanban-card.tsx       # カードコンポーネント
├── action-link/
│   ├── action-link-modal.tsx # ActionLink作成/編集
│   └── action-badge.tsx      # カード上のバッジ
└── onboarding/
    ├── history-import.tsx    # 履歴インポートUI
    └── demo-cards.tsx        # Demoカード8件

lib/
├── implicit-clusterer.ts     # 暗黙クラスタリング（Task 8）
├── behavior-tracker.ts       # 行動シグナル記録（Task 9）
├── db-crypto.ts              # DB暗号化（Task 2）
└── x-api-client.ts           # X API クライアント（Task 10）

docs/
├── yadorigi-bridge-doc-v1.2.md
├── yadorigi-design-philosophy-v1.2.md
└── yadorigi-review-response-v*.md  # 設計判断の根拠記録
```

---

## 注意事項

### start.sh を壊さない

既存の `start.sh` はそのまま動くこと。
暗号化セットアップは、初回起動時に `/setup` ページへリダイレクトする形で実装。

### upstream との互換性を保つ

`prisma/schema.prisma` への追加は**追記のみ**（既存モデルのフィールド変更は最小限に）。
Siftly本家の更新を `git merge` できる状態を維持。

### Issue #59 の修正は必須

X OAuth フローが動作しないと「Live Import」タブが壊れたまま。
4/20のX API値下げ後は `$0.001/件` で動作するため、Task 10 の実装は優先度が高い。

### Windows での開発

このプロジェクトは Windows PC（Claude Code）で主に開発する。
macOS Keychain の代わりに Windows Credential Manager を使用。
`keytar` が両方のOSに対応しているため、そのまま使用可能。

---

## 参考：Siftly 本家の重要ファイル

実装前に必ず読むべきファイル：

```
lib/db.ts               # Prismaクライアント singleton → 暗号化版に更新
lib/rawjson-extractor.ts # Entity抽出 → ツール辞書の追加場所
lib/categorizer.ts       # カテゴリ管理 → デフォルトカテゴリの変更場所
lib/vision-analyzer.ts   # Vision分析 → person tag 禁止プロンプト追加
CLAUDE.md               # Siftly本家のClaude Code指示 → 参考にしつつ本ファイルを優先
```

---

## 実装済み機能（2026-06-01 時点）

以下は実装完了済みです。再実装不要。

| 機能 | 状態 |
|---|---|
| Kanban（4ステータス + DnD） | ✅ |
| Kanban チェックボックス一括移動 | ✅ `updateStatusBatch` tRPC |
| ActionLink（Kanbanカード ↔ ActionItem） | ✅ |
| 全ページ日本語化（i18n） | ✅ `lib/i18n.ts` + `lib/locale-context.tsx` |
| DB暗号化（SQLCipher + keytar） | ✅ |
| X OAuth 2.0 ライブインポート | ✅ |
| Bookmarklet インポート | ✅ |
| AIパイプライン（4段階）| ✅ |
| レート制限エラー検出・自動停止 | ✅ |
| マインドマップ | ✅ |
| AI検索 | ✅ |
| カテゴリ管理（AI提案付き） | ✅ |

## 更新履歴

- 2026-05-04 v1.0 初版作成
- 2026-06-01 v1.1 実装済み機能一覧追記、Kanban一括移動・全ページi18n完了
