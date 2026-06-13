import { describe, it, expect } from "vitest";
import { ZetterApiError } from "./zetter.js";
import { formatApiError, formatSuccess } from "./format.js";

describe("formatApiError", () => {
  it("explains an invalid API key for a 401 response", () => {
    const error = new ZetterApiError({
      message: "Invalid API key.",
      status: 401,
      code: "INVALID_API_KEY",
      retryable: false,
    });

    const text = formatApiError(error);

    expect(text).toContain("API key");
    expect(text).toContain("INVALID_API_KEY");
    expect(text).toContain("z-etter.com/settings/api-keys");
  });

  it("explains a rate limit (429) with retry seconds and the documented limits", () => {
    const error = new ZetterApiError({
      message: "Too many requests.",
      status: 429,
      code: "RATE_LIMITED",
      retryable: true,
      retryAfterSeconds: 30,
    });

    const text = formatApiError(error);

    expect(text).toContain("rate limit");
    expect(text).toContain("30s");
    expect(text).toContain("100/day");
  });

  it("explains network and timeout failures without an HTTP code", () => {
    const error = new ZetterApiError({
      message: "Request to Zetter timed out after 20s.",
      status: 0,
      code: "TIMEOUT",
      retryable: true,
    });

    const text = formatApiError(error);

    expect(text).toContain("try again");
    expect(text).not.toContain("HTTP");
  });

  it("explains a validation error (400)", () => {
    const error = new ZetterApiError({
      message: "content too long.",
      status: 400,
      code: "VALIDATION_ERROR",
      retryable: false,
    });

    const text = formatApiError(error);

    expect(text).toContain("rejected the post");
    expect(text).toContain("HTTP 400");
  });

  it("falls back to a generic message for an unknown error", () => {
    const error = new ZetterApiError({
      message: "Teapot.",
      status: 418,
      code: "IM_A_TEAPOT",
      retryable: false,
    });

    const text = formatApiError(error);

    expect(text).toContain("Zetter API error");
    expect(text).toContain("IM_A_TEAPOT");
    expect(text).toContain("HTTP 418");
  });
});

describe("formatSuccess", () => {
  it("confirms success and includes the raw JSON payload", () => {
    const text = formatSuccess({ ok: true });

    expect(text).toContain("Posted to Zetter successfully.");
    expect(text).toContain('"ok": true');
  });

  it("includes the post id when present at the top level", () => {
    const text = formatSuccess({ ok: true, id: "post_123" });

    expect(text).toContain("Post ID: post_123");
  });

  it("includes id and url when nested under a post object", () => {
    const text = formatSuccess({
      ok: true,
      post: { id: 42, url: "https://z-etter.com/posts/42" },
    });

    expect(text).toContain("Post ID: 42");
    expect(text).toContain("URL: https://z-etter.com/posts/42");
  });

  it("omits id and url when none are present", () => {
    const text = formatSuccess({ ok: true, mood: "ありがてぇ" });

    expect(text).not.toContain("Post ID:");
    expect(text).not.toContain("URL:");
  });
});
