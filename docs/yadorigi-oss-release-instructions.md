# Yadorigi — OSS公開準備 指示書

<!-- Claude Codeへの指示：公開前必須修正 + OSS公開ファイル一式 -->
<!-- レビューエージェント指摘事項を反映 -->
<!-- 作成日：2026-05-10 -->

---

## このセッションのゴール

**「明日GitHubで公開できる状態」を作る。**

完了条件：
- [ ] /setup の自動リダイレクトが動作する
- [ ] BehaviorLog に import_complete が記録される
- [ ] Vision分析で person tag が生成されない
- [ ] X OAuth の state パラメータ検証が確認済み
- [ ] Dockerfile が node:slim ベースで動作する
- [ ] README.md / CONTRIBUTING.md / SECURITY.md / .env.example / docker-compose.yml が揃っている

---

## Part 1：公開前必須修正（この順番で進める）

### Fix 1：/setup 自動リダイレクト確認と修正

**まず現状を診断してください：**

```bash
# 1. middleware.ts が存在するか
cat middleware.ts 2>/dev/null || echo "middleware.ts なし"

# 2. app/layout.tsx で setup_completed チェックをしているか
grep -n "setup_completed\|/setup" app/layout.tsx

# 3. Setting テーブルに setup_completed が存在するか
npx prisma studio
# Settings テーブルを開いて setup_completed キーを確認
```

**診断結果に応じて対応：**

**ケースA：middleware.ts がない、または /setup チェックがない場合 → 新規作成**

```typescript
// middleware.ts（プロジェクトルート）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/setup', '/api', '/_next', '/favicon'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // パブリックパスはスキップ
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // setup_completed クッキーで判定（DB アクセスは middleware では不可）
  const setupCompleted = request.cookies.get('yadorigi_setup_completed');
  if (!setupCompleted) {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**app/setup/page.tsx の完了処理に追加（まだなければ）：**

```typescript
// /setup の「保存しました」チェック後、以下を実行
// クッキーをセット（1年間）
document.cookie = 'yadorigi_setup_completed=1; max-age=31536000; path=/; SameSite=Strict';
// /kanban または / にリダイレクト
router.push('/kanban');
```

**ケースB：すでにチェックが存在する場合 → 動作確認のみ**

```bash
# シークレットウィンドウでアクセスして /setup に飛ぶか確認
# または Cookie を削除してから localhost:3000 にアクセス
```

---

### Fix 2：BehaviorLog に import_complete を追加

import が成功する箇所すべてに記録を追加します。

**まず import 完了箇所を特定：**

```bash
grep -rn "ImportJob\|import.*complete\|bookmarks.*created\|upsert.*bookmark" app/api/ lib/ --include="*.ts" | grep -v ".test." | head -20
```

**各 import 完了箇所に追加するコード：**

```typescript
// X OAuth fetch/route.ts の成功時
// bookmarklet import の成功時
// JSON import の成功時
// 共通パターン：

await db.behaviorLog.create({
  data: {
    type: 'import_complete',
    // bookmarkId は null でOK、件数は note フィールドを流用
  },
});

// BehaviorLog の type 定義に 'import_complete' を追加
// lib/behavior-tracker.ts の BehaviorEventType を更新
type BehaviorEventType =
  | 'session_start'
  | 'bookmark_open'
  | 'bookmark_create'
  | 'bookmark_delete'
  | 'import_complete';  // ← 追加
```

---

### Fix 3：Vision分析の person tag 禁止確認

```bash
# Vision分析のプロンプトファイルを特定
grep -rn "vision\|Vision\|person\|people\|face\|人物" lib/ --include="*.ts" | grep -v ".test."
```

**lib/vision-analyzer.ts（または相当するファイル）を開いて確認：**

プロンプトに以下が含まれていなければ追加してください：

```typescript
// Vision分析のプロンプトに必ず含めること
const VISION_PROMPT = `
Analyze this image and provide descriptive tags.

CRITICAL RULES:
- DO NOT tag or identify any people, faces, or individuals
- DO NOT generate tags like "person", "man", "woman", "face", "people"
- Focus on: objects, scenes, text, colors, activities, topics
- Maximum 20 tags

...（既存のプロンプト内容）
`;
```

---

### Fix 4：X OAuth の state パラメータ確認

```bash
cat app/api/import/x-oauth/authorize/route.ts
cat app/api/import/x-oauth/callback/route.ts
```

確認ポイント：

1. **state 生成**：`crypto.randomBytes(32).toString('hex')` 等でランダム生成されているか
2. **state 保存**：セッション or HttpOnly Cookie に保存されているか（localStorage はNG）
3. **state 検証**：callback でリクエストの state と保存した state を比較しているか

```typescript
// authorize/route.ts で確認すべきパターン
const state = crypto.randomUUID(); // または randomBytes
// cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax' });

// callback/route.ts で確認すべきパターン
const savedState = cookies.get('oauth_state');
if (requestState !== savedState) {
  return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
}
```

不足があれば修正してください。

---

### Fix 5：Dockerfile 作成（node:slim ベース）

```bash
# 既存の Dockerfile があるか確認
ls Dockerfile* docker-compose* 2>/dev/null
```

**Dockerfile を新規作成（alpine ではなく slim を使うこと）：**

```dockerfile
# Dockerfile
FROM node:20-slim AS base

# better-sqlite3-sqlcipher と keytar のビルド依存関係
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsecret-1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存関係のインストール
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# 本番イメージ
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libsecret-1-dev \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**docker-compose.yml を新規作成：**

```yaml
# docker-compose.yml
version: '3.8'

services:
  yadorigi:
    build: .
    ports:
      - "3000:3000"
    volumes:
      # DBファイルをホストにマウント（データ永続化）
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/yadorigi.db
      # X OAuth（オプション）
      # - X_OAUTH_CLIENT_ID=your_client_id
      # - X_OAUTH_CLIENT_SECRET=your_client_secret
      # 開発用：暗号化を無効化（本番では絶対に設定しない）
      # - YADORIGI_NO_ENCRYPTION=1
    restart: unless-stopped
```

**動作確認：**

```bash
docker build -t yadorigi .
docker run -p 3000:3000 \
  -e YADORIGI_NO_ENCRYPTION=1 \
  -v $(pwd)/data:/app/data \
  yadorigi

# ブラウザで localhost:3000 にアクセスして動作確認
```

---

## Part 2：OSS公開ファイル一式

Fix 1-5 が完了したら、以下のファイルを作成してください。

---

### README.md（Siftly本家から完全置換）

```markdown
# Yadorigi（宿り木）

**Yadorigi で集めて、Tsuzuri で綴る。**

日本語Xユーザー向けのローカルファースト・ブックマーク管理ツール。
Xに保存したtweetを「読む状態 × 行動予定」の二軸で構造化し、保存と行動の断絶を解消します。

---

## Yadorigiとは

Xで気になったtweetをブックマークしても、後から活用できない。
そのギャップを解消するのが Yadorigi です。

- **Kanban管理**：TO_READ / IN_PROGRESS / DONE / EVERGREEN の4状態で流れを作る
- **ActionLink**：ブックマークとあなたのプロジェクト・行動予定を紐付ける
- **暗黙クラスタリング**：AIなしで、時間的・内容的に近いブックマークを自動グルーピング
- **ローカル完結**：すべてのデータはあなたのマシンのSQLite DBに保存される

> Siftly（[@viperrcrypto](https://github.com/viperrcrypto/Siftly)）をベースに構築しています。
> AIによるVision分析・Mindmap・検索等の機能はSiftlyから継承しています。

---

## Siftlyとの違い

| 機能 | Siftly | Yadorigi |
|---|---|---|
| AIビジョン分析 | ✅ | ✅ 継承 |
| Mindmap | ✅ | ✅ 継承 |
| AI検索 | ✅ | ✅ 継承 |
| Kanbanビュー | ✗ | ✅ **新規** |
| ActionLink | ✗ | ✅ **新規** |
| 暗黙クラスタリング | ✗ | ✅ **新規** |
| DB暗号化（デフォルトON） | ✗ | ✅ **新規** |
| 日本語ファーストUI | ✗ | ✅ **新規** |

---

## インストール

### 前提条件

- Node.js 20以上
- npm または yarn

### セットアップ

```bash
git clone https://github.com/[あなたのGitHub]/yadorigi.git
cd yadorigi
npm install
cp .env.example .env.local
npx prisma migrate dev
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

初回起動時に暗号化キーの設定画面が表示されます。
**リカバリーキーを必ず保存してください。失うとデータの復旧ができません。**

### Docker を使う場合

```bash
docker-compose up
```

暗号化を使わない場合（開発・テスト用）：

```bash
YADORIGI_NO_ENCRYPTION=1 docker-compose up
```

### Xブックマークのインポート方法

**方法A：X API（推奨）**
1. [X Developer Portal](https://developer.x.com) でアプリを作成
2. `.env.local` に `X_OAUTH_CLIENT_ID` と `X_OAUTH_CLIENT_SECRET` を設定
3. Settings > Import > X Account で認証

**方法B：JSONインポート**
1. X設定 > アカウント > データのアーカイブ をリクエスト
2. DL後、ZIPの中の `data/bookmarks.js` をアップロード

**方法C：bookmarklet**
設定画面からbookmarkletを取得してブックマークバーに追加。

---

## このツールは誰向けか

✅ **こんな方に向いています**
- 日本語Xを毎日使う知的ワーカー（コンサル・ライター・研究者・PM）
- 保存したtweetを後から活用したい方
- データをローカルに置きたい方（クラウドSaaS不要）
- セルフホスト経験のある方

❌ **こんな方には他のツールを推奨します**
- モバイルネイティブアプリが必要な方 → v2以降で対応予定
- クラウドSaaSが良い方 → [Readwise Reader](https://readwise.io/read)
- 英語Xが中心の方 → [Karakeep](https://karakeep.app)
- 全自動化したい方 → [Karakeep + Ollama](https://karakeep.app)

---

## 技術スタック

- **フレームワーク**：Next.js 16 + TypeScript
- **DB**：SQLite（FTS5）+ Prisma + SQLCipher暗号化
- **AI**：Anthropic Claude API（オプトイン、APIキー必要）
- **UI**：Tailwind CSS v4 + Radix UI + Framer Motion
- **Kanban**：@dnd-kit
- **Mindmap**：@xyflow/react

---

## 姉妹プロダクト

> **[Tsuzuri（綴り）](https://github.com/[あなたのGitHub]/tsuzuri)**  
> X投稿からnote下書きを自動生成するローカルOSS  
> Yadorigiで集めた素材を、Tsuzuriで記事に変える。

---

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) を読んでからPRを送ってください。
このプロダクトには設計哲学コードがあります。哲学コードに反するPRはrejectされます。

---

## License

MIT
```

---

### CONTRIBUTING.md

```markdown
# Contributing to Yadorigi

Yadorigi への貢献を歓迎します。ただし、このプロダクトには**設計哲学コード**があります。
PRを送る前に必ずこのドキュメントを読んでください。

---

## 設計哲学（最重要）

### メタ原則

> **「考えさせないことが、最大のリスペクトである」**

- 同意フローは1クリックで完結する
- クラスタリングはユーザーに説明せず、そこにあるように見せる
- 計測はUIに出さず、裏でやる
- 暗号化はユーザーに意識させない（ただしリカバリーは明示する）

### 規範性

> 「保存することは、未来の自分との約束である」

Yadorigiは「整理ツール」ではなく「約束を育てるツール」です。
ユーザーが何もしなくても価値が漏れ出す設計を目指しています。

---

## PR を送る前のチェックリスト

### ✅ 許容されるPR

- バグ修正
- パフォーマンス改善
- テストの追加
- 日本語ドキュメントの改善
- アクセシビリティの改善
- Mindmapや検索の機能強化
- クラスタリング精度の向上

### ❌ reject されるPR

以下を含むPRは哲学コード違反として reject します：

**ゲーミフィケーション系**
- ストリーク（連続使用日数）の追加
- バッジ・実績解除の追加
- ポイント・レベル・ランキングの追加
- 「N件整理しました！🎉」のような祝福UI

**焦り・煽り系**
- 未読件数の赤バッジ強調
- 「あとN件で達成！」のような目標煽り
- カウントダウンタイマー

**AI過信系**
- AIによる全自動分類（承認/却下UIを省略する実装）
- AI処理中の擬人化アニメーション
- 「AIが学習中」の可視化

**プライバシー違反系**
- 行動シグナルのUI表示
- Vision分析でのperson tag生成
- DB暗号化のデフォルト無効化（環境変数以外での）

**デザイン系**
- グラデーションの追加
- 装飾目的のシャドウ
- 200msを超えるアニメーション
- Web Fontの追加
- CSS変数を使わないHEXの直書き

---

## コードスタイル

- TypeScript strict mode
- Prismaのマイグレーションは必ず `npx prisma migrate dev --name <説明的な名前>`
- コンポーネントはデザイントークン（CSS variables）経由でのみ色を指定
- UIコピーはすべて i18n strings ファイル経由

---

## demo データについて

**実際のXユーザーのツイートURLをテストデータに使わないでください。**

demo カードや fixture データは必ず架空のURLを使用してください：
```
https://x.com/demo_user/status/0000000000000000001
```

---

## Issue の報告

バグ報告は歓迎します。以下を含めてください：
- OS / Node.js バージョン
- エラーメッセージ（あれば）
- 再現手順

セキュリティ脆弱性は Issue ではなく [SECURITY.md](./SECURITY.md) の手順で報告してください。

---

## 言語について

- Issue / Discussion / PR description は **日本語を推奨**します
- 英語でのコントリビューションも歓迎しますが、設計哲学の議論は日本語で行います
- コードのコメントは英語・日本語どちらでも構いません
```

---

### SECURITY.md

```markdown
# セキュリティについて

## DBの暗号化とリカバリーキー

Yadorigiは起動時にローカルDBをAES-256で暗号化します。
暗号化キーはOSのキーチェーン（macOS Keychain / Windows Credential Manager）に保存されます。

### リカバリーキーの重要性

初回起動時に生成されるリカバリーキーは、以下の場合にDBへのアクセスを回復するために必要です：
- OSの再インストール
- PCの交換・クラッシュ
- keychainデータの破損

**リカバリーキーを失った場合、DBの内容は復旧できません。**

安全な場所（パスワードマネージャー、印刷して保管等）に保存してください。

### 定期バックアップの推奨

Settings > Backup からJSONエクスポートを定期的に行うことを推奨します。
暗号化キーとは独立して、コンテンツのバックアップを保持できます。

---

## 脆弱性の報告

セキュリティ脆弱性を発見した場合、**GitHub Issueではなく**以下の方法で報告してください：

GitHub の [Security Advisories](https://github.com/[あなたのGitHub]/yadorigi/security/advisories/new) を使用してください。

報告内容に含めてください：
- 脆弱性の説明
- 再現手順
- 影響範囲
- 可能であれば修正案

---

## データのプライバシー

- すべてのbookmarkデータはローカルのSQLite DBに保存されます
- クラウドへの送信は行われません
- AI機能（Vision分析）を有効にした場合のみ、tweet内容と画像がAnthropicのAPIに送信されます
- X OAuth認証情報はローカルのSettingテーブルに保存されます
```

---

### .env.example 更新

```bash
# 現在の .env.example を確認して更新
cat .env.example
```

以下の内容で更新してください（既存の内容は保持）：

```env
# Yadorigi 環境変数

# データベース
DATABASE_URL="file:./data/yadorigi.db"

# Anthropic API（AI機能用・オプション）
ANTHROPIC_API_KEY=

# X OAuth（Live Import用・オプション）
# X Developer Portal で取得: https://developer.x.com
X_OAUTH_CLIENT_ID=
X_OAUTH_CLIENT_SECRET=

# 開発用：DB暗号化を無効化（本番では絶対に設定しない）
# YADORIGI_NO_ENCRYPTION=1

# Next.js
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

---

### .dockerignore

```
node_modules
.next
.env.local
.env.*.local
data/*.db
*.log
.DS_Store
.git
```

---

## Part 3：動作確認チェックリスト

すべての修正とファイル作成が完了したら、以下を確認してください。

```bash
# 1. TypeScript エラーがないか
npx tsc --noEmit

# 2. 通常起動
npm run dev
# → localhost:3000 にアクセス
# → Cookieをクリアして / にアクセス → /setup にリダイレクトされるか確認

# 3. Docker 起動
docker-compose up
# → localhost:3000 にアクセス
# → 同様のリダイレクト確認

# 4. 暗号化なし起動（Docker）
YADORIGI_NO_ENCRYPTION=1 docker-compose up
# → エラーなく起動するか確認

# 5. Prisma Studio でテーブル確認
npx prisma studio
# → BehaviorLog に type カラムが存在するか
# → ImplicitCluster テーブルが存在するか
```

---

## 完了後の次ステップ

このセッションが完了したら：

```
1. GitHub でリポジトリを public に設定
2. Description：「日本語Xユーザー向けのローカルOSSブックマーク管理ツール。Kanban/ActionLink/暗黙クラスタリング。」
3. Topics：x-bookmarks, kanban, local-first, sqlite, nextjs, japanese, oss, typescript
4. Zenn / はてなブログで告知記事を公開
5. X（Twitter）でYadorigi公開を告知
```

次のフェーズ（公開後）：
- Chrome履歴SQLite直読みの実装
- Mindmapへのクラスタ表示

---

更新履歴:
- 2026-05-10 v1.0 初版作成（レビューエージェント指摘事項を全反映）
```
