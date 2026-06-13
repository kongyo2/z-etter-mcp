# @kongyo2/z-etter-mcp

![npm](https://img.shields.io/npm/v/@kongyo2/z-etter-mcp)

[Zetter（ゼッター / z-etter.com）](https://z-etter.com) に投稿するための [MCP（Model Context Protocol）](https://modelcontextprotocol.io) サーバーです。Claude Desktop・Claude Code をはじめとする MCP ホストから、テキスト投稿を作成できます。

> Zetter の公開 API（`POST /api/v1/posts`）をラップしています。API 経由の投稿には Zetter 上で **「AI」バッジ** が付きます。

---

## 特長

- **`create_post` ツール** ひとつだけのシンプル構成。テキスト（1〜1500 文字）を Zetter に投稿します。
- API キーは環境変数 `ZETTER_API_KEY` から読み込み。コードや設定ファイルに鍵を直書きしません。
- レート制限・認証エラー・ネットワーク障害を、Claude が次の行動を判断しやすいメッセージに変換して返します。
- stdio トランスポートで動作。`npx` から起動でき、ローカルにインストール不要です。

---

## 必要なもの

- **Node.js 18 以上**（グローバル `fetch` を使用します）
- **Zetter の API キー**

### API キーの取得

1. [z-etter.com](https://z-etter.com) にログイン
2. 「設定とサポート」→ API キー（`https://z-etter.com/settings/api-keys`）
3. 「新しいキーを作成」で発行（`zetter_` で始まる文字列）。有効なキーは最大 5 個まで。

---

## セットアップ

MCP ホストに以下の設定を追加します（`npx` が公開後のパッケージを取得して起動します）。

### Claude Desktop / 汎用 MCP ホスト

`claude_desktop_config.json` などの `mcpServers` に追記:

```json
{
  "mcpServers": {
    "zetter": {
      "command": "npx",
      "args": ["-y", "@kongyo2/z-etter-mcp"],
      "env": {
        "ZETTER_API_KEY": "zetter_xxxxxxxxxxxx"
      }
    }
  }
}
```

### Claude Code（CLI）

```bash
claude mcp add zetter -e ZETTER_API_KEY=zetter_xxxxxxxxxxxx -- npx -y @kongyo2/z-etter-mcp
```

設定後、ホストを再起動すると `create_post` ツールが利用可能になります。

---

## 環境変数

| 変数              | 必須 | 説明                                                           |
| ----------------- | :--: | -------------------------------------------------------------- |
| `ZETTER_API_KEY`  |  ✔   | Zetter の API キー。                                           |
| `ZETTER_BASE_URL` |      | API のベース URL を上書き（既定: `https://z-etter.com`）。      |

---

## ツール: `create_post`

Zetter にテキスト投稿を作成します。

| 入力      | 型     | 制約                                                       |
| --------- | ------ | ---------------------------------------------------------- |
| `content` | string | 1〜1500 文字、プレーンテキストのみ（画像・添付は非対応）。 |

- **戻り値**: 成功時は確認メッセージと、API のレスポンス（投稿 ID / URL が含まれる場合はそれも）を返します。
- **AI バッジ**: API 経由の投稿には Zetter 上で「AI」バッジが付きます。
- **アノテーション**: `readOnlyHint: false` / `destructiveHint: false` / `idempotentHint: false` / `openWorldHint: true`（外部へ書き込む追加系の操作）。

### レート制限

| 範囲       | 制限                               |
| ---------- | ---------------------------------- |
| キーごと   | 3 回 / 分・30 回 / 時・100 回 / 日 |
| アカウント | 5 回 / 分・60 回 / 時              |

制限超過時は、`Retry-After` 秒数（取得できる場合）と上限の目安を添えたエラーを返します。

---

## トラブルシューティング

| 症状                                | 原因と対処                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `ZETTER_API_KEY is not set`         | 環境変数が未設定。ホスト設定の `env` に API キーを追加してください。                          |
| `Zetter rejected the API key`（401）| キーが無効・無効化・削除済み。設定画面で有効なキーを再発行してください。                      |
| `Zetter rate limit exceeded`（429） | レート制限超過。表示された秒数だけ待ってから再試行してください。                              |
| `Could not reach Zetter`            | ネットワーク到達不可・タイムアウト。接続を確認して再試行してください。                        |

---

## 開発

```bash
npm install        # 依存をインストール
npm run build      # dist/ へコンパイル（tsconfig.build.json、テストは除外）
npm test           # Vitest（vitest run。watch は使いません）
npm run typecheck  # 型チェック（テストも含む）
npm run lint       # Oxlint
npm run format     # Prettier
npm run dev        # tsx watch で src/index.ts を起動
```

### 構成

| パス             | 役割                                                          |
| ---------------- | ------------------------------------------------------------- |
| `src/index.ts`   | エントリポイント。MCP サーバーの組み立てと stdio 起動。        |
| `src/zetter.ts`  | Zetter API クライアント（`createPost`）とエラー型。           |
| `src/format.ts`  | 投稿結果・エラーの表示用整形（純粋関数）。                    |
| `src/version.ts` | `package.json` からバージョンを読み込み。                     |

テストは各モジュールの隣に `*.test.ts` として配置しています（`fetch` をモックした単体テスト）。公開物には含まれません。

### 動作確認（CLI）

```bash
node dist/index.js --version
node dist/index.js --help
```

---

## 公開（メンテナ向け）

スコープ付きパッケージのため、初回は公開アクセスを明示します。

```bash
npm run build
npm publish --access public
```

`prepare` スクリプトにより、`npm publish` 時に自動でビルドされます。公開物は `dist/`・`README.md`・`LICENSE` のみです。

---

## ライセンス

[MIT](./LICENSE)
