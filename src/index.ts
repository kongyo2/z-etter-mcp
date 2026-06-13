#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { VERSION } from "./version.js";
import { formatApiError, formatSuccess } from "./format.js";
import {
  createPost,
  ZetterApiError,
  ZETTER_DEFAULT_BASE_URL,
  ZETTER_MAX_CONTENT_LENGTH,
  ZETTER_MIN_CONTENT_LENGTH,
} from "./zetter.js";

const CREATE_POST_DESCRIPTION = [
  "Publish a plain-text post to Zetter (z-etter.com), a Japanese microblogging SNS.",
  "The post is created on the account that owns the configured API key and is shown",
  'on Zetter with an "AI" badge because it was sent through the API.',
  `Body must be plain text, ${ZETTER_MIN_CONTENT_LENGTH}-${ZETTER_MAX_CONTENT_LENGTH} characters; images and other attachments`,
  "are not supported. Returns the created post's identifier when the API provides one.",
  "Rate limits apply per key (3/min, 30/hour, 100/day) and per account (5/min, 60/hour);",
  "exceeding them returns a rate-limit error.",
].join(" ");

const CONTENT_DESCRIPTION = `The text body of the post. ${ZETTER_MIN_CONTENT_LENGTH}-${ZETTER_MAX_CONTENT_LENGTH} characters, plain text only (no images or attachments).`;

const server = new McpServer(
  { name: "z-etter-mcp", version: VERSION },
  {
    instructions:
      "Provides a tool for posting to the Zetter SNS (https://z-etter.com). " +
      "A Zetter API key must be supplied to the server through the ZETTER_API_KEY environment variable.",
  },
);

server.registerTool(
  "create_post",
  {
    title: "Create Zetter Post",
    description: CREATE_POST_DESCRIPTION,
    inputSchema: {
      content: z
        .string({ error: "content must be a string." })
        .min(ZETTER_MIN_CONTENT_LENGTH, { error: "content must not be empty." })
        .max(ZETTER_MAX_CONTENT_LENGTH, {
          error: `content must be at most ${ZETTER_MAX_CONTENT_LENGTH} characters.`,
        })
        .refine((value) => value.trim().length > 0, {
          error: "content must contain non-whitespace text.",
        })
        .describe(CONTENT_DESCRIPTION),
    },
    annotations: {
      title: "Create Zetter Post",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ content }): Promise<CallToolResult> => {
    const apiKey = process.env.ZETTER_API_KEY?.trim();
    if (!apiKey) {
      return errorResult(
        "ZETTER_API_KEY is not set. Create an API key at " +
          "https://z-etter.com/settings/api-keys and provide it to this server " +
          "through the ZETTER_API_KEY environment variable.",
      );
    }

    const baseUrl = process.env.ZETTER_BASE_URL?.trim() || ZETTER_DEFAULT_BASE_URL;

    try {
      const result = await createPost({ content, apiKey, baseUrl });
      return { content: [{ type: "text", text: formatSuccess(result) }] };
    } catch (error) {
      if (error instanceof ZetterApiError) {
        return errorResult(formatApiError(error));
      }
      return errorResult(
        `Unexpected error while posting to Zetter: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);

function errorResult(text: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text }] };
}

function helpText(): string {
  return [
    `z-etter-mcp v${VERSION}`,
    "",
    "An MCP (Model Context Protocol) server that posts to the Zetter SNS",
    "(https://z-etter.com). It speaks MCP over stdio and is meant to be launched",
    "by an MCP host such as Claude Desktop or Claude Code, not run directly.",
    "",
    "Environment variables:",
    "  ZETTER_API_KEY   (required) API key from https://z-etter.com/settings/api-keys",
    "  ZETTER_BASE_URL  (optional) Override the API base URL",
    `                   (default: ${ZETTER_DEFAULT_BASE_URL})`,
    "",
    "Example MCP host configuration:",
    '  "mcpServers": {',
    '    "zetter": {',
    '      "command": "npx",',
    '      "args": ["-y", "@kongyo2/z-etter-mcp"],',
    '      "env": { "ZETTER_API_KEY": "zetter_xxxxxxxx" }',
    "    }",
    "  }",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${helpText()}\n`);
    return;
  }

  if (!process.env.ZETTER_API_KEY) {
    process.stderr.write(
      "[z-etter-mcp] Warning: ZETTER_API_KEY is not set; create_post will return an error until it is provided.\n",
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[z-etter-mcp] v${VERSION} ready (stdio).\n`);
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`[z-etter-mcp] Fatal: ${detail}\n`);
  process.exitCode = 1;
});
