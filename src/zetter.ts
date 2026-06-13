import { VERSION } from "./version.js";

/** Default base URL of the Zetter API. Override with the `ZETTER_BASE_URL` env var. */
export const ZETTER_DEFAULT_BASE_URL = "https://z-etter.com";

/** Minimum length (in characters) of a post body accepted by the Zetter API. */
export const ZETTER_MIN_CONTENT_LENGTH = 1;

/** Maximum length (in characters) of a post body accepted by the Zetter API. */
export const ZETTER_MAX_CONTENT_LENGTH = 1500;

/** How long to wait for the Zetter API before aborting a request. */
const REQUEST_TIMEOUT_MS = 20_000;

const USER_AGENT = `kongyo2-z-etter-mcp/${VERSION} (+https://z-etter.com)`;

/** Error envelope returned by the Zetter API: `{ "ok": false, "error": { "code", "message" } }`. */
interface ZetterErrorEnvelope {
  ok?: boolean;
  error?: { code?: unknown; message?: unknown };
}

/**
 * A successful response from the Zetter API. The documented contract only
 * guarantees `ok: true`; any additional fields (such as the created post's id
 * or url) are surfaced as-is but treated as best-effort.
 */
export interface ZetterPostResult {
  ok: true;
  [key: string]: unknown;
}

/** Options for {@link createPost}. */
export interface CreatePostOptions {
  /** The text body of the post (1-1500 characters). */
  content: string;
  /** A Zetter API key (looks like `zetter_…`). */
  apiKey: string;
  /** API base URL. Defaults to {@link ZETTER_DEFAULT_BASE_URL}. */
  baseUrl?: string;
  /** Optional abort signal. When omitted, a built-in request timeout is applied. */
  signal?: AbortSignal;
}

/**
 * Raised when a request to the Zetter API fails. `status` holds the HTTP status
 * code, or `0` for a transport-level failure (network error / timeout).
 */
export class ZetterApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;

  constructor(params: {
    message: string;
    status: number;
    code: string;
    retryable: boolean;
    retryAfterSeconds?: number;
  }) {
    super(params.message);
    this.name = "ZetterApiError";
    this.status = params.status;
    this.code = params.code;
    this.retryable = params.retryable;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }
}

/**
 * Publish a text post to Zetter via `POST /api/v1/posts`.
 *
 * @throws {@link ZetterApiError} when the request cannot be completed or the
 * API responds with a non-2xx status.
 */
export async function createPost(options: CreatePostOptions): Promise<ZetterPostResult> {
  const { content, apiKey, baseUrl = ZETTER_DEFAULT_BASE_URL, signal } = options;
  const endpoint = new URL("/api/v1/posts", baseUrl).toString();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ content }),
      signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
    throw new ZetterApiError({
      message: timedOut
        ? `Request to Zetter timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`
        : `Could not reach Zetter: ${cause instanceof Error ? cause.message : String(cause)}`,
      status: 0,
      code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      retryable: true,
    });
  }

  const bodyText = await response.text();
  const parsed = safeJsonParse(bodyText);

  if (!response.ok) {
    const envelope = (parsed ?? {}) as ZetterErrorEnvelope;
    const code = typeof envelope.error?.code === "string" ? envelope.error.code : `HTTP_${response.status}`;
    const message =
      typeof envelope.error?.message === "string"
        ? envelope.error.message
        : bodyText.trim() || response.statusText || "Unknown error";
    const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
    throw new ZetterApiError({
      message,
      status: response.status,
      code,
      retryable: response.status === 429 || response.status >= 500,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    });
  }

  if (parsed !== null && typeof parsed === "object") {
    return { ...(parsed as Record<string, unknown>), ok: true };
  }
  return { ok: true };
}

function safeJsonParse(text: string): unknown {
  if (text.trim().length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (headerValue === null) return undefined;
  const asSeconds = Number(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) return Math.ceil(asSeconds);
  const asDate = Date.parse(headerValue);
  if (!Number.isNaN(asDate)) return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  return undefined;
}
