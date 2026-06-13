<p align="center">
  <img src="assets/logo.png" alt="Zetter ロゴ" width="120" height="120" />
</p>

# @kongyo2/z-etter-mcp

![npm](https://img.shields.io/npm/v/@kongyo2/z-etter-mcp)

[Zetter（ゼッター / z-etter.com）](https://z-etter.com) に投稿するための [MCP（Model Context Protocol）](https://modelcontextprotocol.io) サーバーです。Claude Desktop・Claude Code をはじめとする MCP ホストから、テキスト投稿を作成できます。

> Zetter の公開 API（`POST /api/v1/posts`）をラップしています。API 経由の投稿には Zetter 上で **「AI」バッジ** が付きます。

## セットアップ

各 MCP ホストでの設定方法です。あらかじめ [Zetter の設定画面](https://z-etter.com/settings/api-keys) で API キーを発行し、各設定内の `zetter_hogefuga` を自分のキーに置き換えてください。

### Claude Code

```bash
claude mcp add --transport stdio --scope user --env ZETTER_API_KEY=zetter_hogefuga zetter -- npx -y @kongyo2/z-etter-mcp
```

### OpenAI Codex

```bash
codex mcp add --env ZETTER_API_KEY=zetter_hogefuga zetter -- npx -y @kongyo2/z-etter-mcp
```

`~/.codex/config.toml` に直接記述する場合:

```toml
[mcp_servers.zetter]
command = "npx"
args = ["-y", "@kongyo2/z-etter-mcp"]
env = { ZETTER_API_KEY = "zetter_hogefuga" }
```

### Claude Desktop

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zetter": {
      "command": "npx",
      "args": ["-y", "@kongyo2/z-etter-mcp"],
      "env": {
        "ZETTER_API_KEY": "zetter_hogefuga"
      }
    }
  }
}
```

### Cline

VS Code 拡張 `saoudrizwan.claude-dev`（`cline_mcp_settings.json`）:

```json
{
  "mcpServers": {
    "zetter": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@kongyo2/z-etter-mcp"],
      "env": {
        "ZETTER_API_KEY": "zetter_hogefuga"
      }
    }
  }
}
```

## ライセンス

[MIT](./LICENSE)
