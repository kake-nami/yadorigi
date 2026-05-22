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
git clone https://github.com/kake-nami/yadorigi.git
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

> **注意：** Docker環境ではOSキーチェーンが利用できないため、DB暗号化は無効化されます。
> ホストマシンで直接起動する場合のみ暗号化が有効になります。

---

## Xブックマークのインポート方法

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

> **[Tsuzuri（綴り）](https://github.com/kake-nami/tsuzuri)**
> X投稿からnote下書きを自動生成するローカルOSS
> Yadorigiで集めた素材を、Tsuzuriで記事に変える。

---

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) を読んでからPRを送ってください。
このプロダクトには設計哲学コードがあります。哲学コードに反するPRはrejectされます。

---

## License

MIT
