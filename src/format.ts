import type { ZetterApiError, ZetterPostResult } from "./zetter.js";

/** Build a human-readable, recovery-oriented message for a Zetter API failure. */
export function formatApiError(error: ZetterApiError): string {
  const httpPart = error.status > 0 ? `, HTTP ${error.status}` : "";
  const detail = `${error.message} (code: ${error.code}${httpPart})`;

  if (error.status === 401 || error.code === "UNAUTHORIZED" || error.code === "INVALID_API_KEY") {
    return (
      `Zetter rejected the API key: ${detail}\n` +
      "Make sure ZETTER_API_KEY is a valid, active key from " +
      "https://z-etter.com/settings/api-keys (keys can be disabled or deleted there)."
    );
  }

  if (error.status === 429 || error.code === "TOO_MANY_REQUESTS" || error.code.includes("RATE")) {
    const retry = error.retryAfterSeconds !== undefined ? ` Retry after about ${error.retryAfterSeconds}s.` : "";
    return (
      `Zetter rate limit exceeded: ${detail}.${retry}\n` +
      "Limits are 3/min, 30/hour and 100/day per key, and 5/min, 60/hour per account."
    );
  }

  if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") {
    return `${detail} Please check connectivity and try again.`;
  }

  if (error.status === 400 || error.status === 422 || error.code.includes("VALID")) {
    return `Zetter rejected the post: ${detail}.`;
  }

  return `Zetter API error: ${detail}.`;
}

/** Build a success confirmation, surfacing the post id/url when the API provides them. */
export function formatSuccess(result: ZetterPostResult): string {
  const post = extractPost(result);
  const id = pickField(post, ["id", "postId", "post_id"]);
  const url = pickField(post, ["url", "link", "permalink", "shareUrl"]);

  const lines = ["Posted to Zetter successfully."];
  if (id !== undefined) lines.push(`Post ID: ${id}`);
  if (url !== undefined) lines.push(`URL: ${url}`);
  lines.push("", JSON.stringify(result, null, 2));
  return lines.join("\n");
}

/** The post fields may sit at the top level or be nested under `post`/`data`. */
function extractPost(result: ZetterPostResult): Record<string, unknown> {
  for (const key of ["post", "data"]) {
    const candidate = result[key];
    if (candidate !== null && typeof candidate === "object") {
      return candidate as Record<string, unknown>;
    }
  }
  return result;
}

function pickField(source: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}
