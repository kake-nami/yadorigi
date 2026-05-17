# セキュリティについて

## DBの暗号化とリカバリーキー

Yadorigiは起動時にローカルDBをAES-256で暗号化します。
暗号化キーはOSのキーチェーン（macOS Keychain / Windows Credential Manager）に保存されます。

> **注意：** Docker環境ではOSキーチェーンが利用できないため、`YADORIGI_NO_ENCRYPTION=1` を設定してください。

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
