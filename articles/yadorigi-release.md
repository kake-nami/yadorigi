---
title: "Yadorigi（宿り木）— X ブックマークをAIで整理するローカルOSSを公開しました"
emoji: "🌿"
type: "idea"
topics: ["oss", "nextjs", "ai", "twitter", "typescript"]
published: false
---

## Yadorigi とは

X（旧Twitter）でブックマークした・いいねしたツイートを**ローカルで管理・整理する OSS ツール**です。

https://github.com/kake-nami/yadorigi

すべてのデータはあなたのマシンの SQLite データベースに保存されます。クラウドなし、外部サーバーなし。

---

## 作った理由

X でブックマークやいいねをしても、後から活用できないことが多いと感じていました。

- 検索しようとしても埋もれる
- 「あのツイートどこ行った？」が日常的に起きる
- 読んだ・読んでない・後で読む、の管理ができない
- 面白いと思ったのに、何か行動につながらないまま忘れる

これを解決するために作りました。

---

## 主な機能

### 🤖 4段階 AI パイプライン

インポートしたツイートを自動で分析・整理します。

1. **画像解析（Vision）** — 添付画像・GIF・動画からテキストやコンテキストを抽出
2. **エンティティ抽出** — ハッシュタグ・URL・ツール名を無料で抽出（API不要）
3. **セマンティックタグ生成** — 検索用タグを30〜50個自動生成
4. **カテゴリ自動分類** — 内容に基づいて適切なカテゴリへ割り当て

Anthropic Claude API または OpenAI API に対応しています。

### 📋 Kanban ビュー

`TO_READ` / `IN_PROGRESS` / `DONE` / `EVERGREEN` の4ステータスでツイートを管理します。

### ⚡ ActionLink

ブックマークに「アクション」を紐付けられます。「このツールを試す」「このツイートを参考にブログを書く」といった次のステップをツイートに直接紐付けて管理できます。

### 🔍 AI 検索

セマンティックタグを使った意味的な検索ができます。「TypeScriptのテクニック」のように自然言語で検索できます。

### 🗺️ マインドマップ

カテゴリ・タグの関係をマインドマップで可視化できます。

### 🔐 DB 暗号化

SQLCipher によりデータベースをデフォルトで暗号化します。

---

## インポート方法

X API は有料プラン（$200/月〜）が必要なため、**Bookmarklet 方式**を推奨しています。

インポートページからブックマークレットを取得し、ブックマークバーに追加。`x.com/i/bookmarks` でクリックすると X の内部 API をインターセプトして著者情報付きで全ツイートを自動キャプチャし、JSON ファイルをダウンロードします。そのファイルをアップロードするだけです。

---

## 技術スタック

| 用途 | 採用技術 |
|---|---|
| フレームワーク | Next.js 16 + TypeScript |
| DB | SQLite（FTS5）+ Prisma + SQLCipher |
| AI | Anthropic Claude API / OpenAI API（選択式） |
| UI | Tailwind CSS v4 + Radix UI |
| Kanban | @dnd-kit |
| マインドマップ | @xyflow/react |

---

## Siftly からのフォーク

本プロジェクトは [@viperrcrypto](https://github.com/viperrcrypto) 氏の [Siftly](https://github.com/viperrcrypto/Siftly) をベースに構築しています。Vision 分析・マインドマップ・AI 検索などのコア機能は Siftly から継承しています。MIT ライセンスに従い帰属を明記します。

---

## セットアップ

```bash
git clone https://github.com/kake-nami/yadorigi.git
cd yadorigi
npm install
cp .env.example .env.local
npx prisma migrate dev
npm run dev
```

`http://localhost:3000` で起動します。

---

## こんな方に向いています

- 日本語 X を毎日使う知的ワーカー（エンジニア・ライター・研究者・PM）
- 保存したツイートを後から活用したい方
- データをローカルに置きたい方（クラウド SaaS 不要）
- セルフホスト経験のある方

---

フィードバック・Issue・PR をお待ちしています。

https://github.com/kake-nami/yadorigi
