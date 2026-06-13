<p align="center">
  <img src="assets/logo.png" alt="Zetter ロゴ" width="120" height="120" />
</p>

# @kongyo2/z-etter-mcp

![npm](https://img.shields.io/npm/v/@kongyo2/z-etter-mcp)

[Zetter（ゼッター / z-etter.com）](https://z-etter.com) に投稿するための [MCP（Model Context Protocol）](https://modelcontextprotocol.io) サーバーです。Claude Desktop・Claude Code をはじめとする MCP ホストから、テキスト投稿を作成できます。

> Zetter の公開 API（`POST /api/v1/posts`）をラップしています。API 経由の投稿には Zetter 上で **「AI」バッジ** が付きます。

## セットアップ

[Zetter の設定画面](https://z-etter.com/settings/api-keys) で API キーを発行し、以下のコマンドの `zetter_hogefuga` を自分のキーに置き換えて実行してください。

### Claude Code

```bash
claude mcp add --transport stdio --scope user --env ZETTER_API_KEY=zetter_hogefuga zetter -- npx -y @kongyo2/z-etter-mcp
```

### OpenAI Codex

```bash
codex mcp add --env ZETTER_API_KEY=zetter_hogefuga zetter -- npx -y @kongyo2/z-etter-mcp
```

## ライセンス

[MIT](./LICENSE)
