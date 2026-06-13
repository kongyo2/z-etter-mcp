import { afterEach, describe, expect, it, vi } from "vitest";
import { createPost, ZetterApiError } from "./zetter.js";

const API_KEY = "zetter_test_key";

// A fresh, never-aborted signal so createPost does not arm its real 20s fallback
// timer during the test run.
const stableSignal = (): AbortSignal => new AbortController().signal;

function mockFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createPost", () => {
  it("sends a POST to /api/v1/posts with bearer auth and a JSON body", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ ok: true, id: "p1" }), { status: 201 }));

    await createPost({ content: "こんにちは", apiKey: API_KEY, signal: stableSignal() });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://z-etter.com/api/v1/posts");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ content: "こんにちは" });
  });

  it("returns the parsed body with ok:true on success", async () => {
    mockFetch(() => new Response(JSON.stringify({ ok: true, post: { id: "p1" } }), { status: 201 }));

    const result = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() });

    expect(result).toEqual({ ok: true, post: { id: "p1" } });
  });

  it("forces ok:true even when the success body omits it", async () => {
    mockFetch(() => new Response(JSON.stringify({ id: "p1" }), { status: 200 }));

    const result = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() });

    expect(result.ok).toBe(true);
    expect(result.id).toBe("p1");
  });

  it("returns {ok:true} when the success body is empty", async () => {
    mockFetch(() => new Response("", { status: 200 }));

    const result = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() });

    expect(result).toEqual({ ok: true });
  });

  it("throws ZetterApiError with code and status for a 401", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ ok: false, error: { code: "INVALID_API_KEY", message: "Invalid API key." } }), {
          status: 401,
        }),
    );

    await expect(createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() })).rejects.toMatchObject({
      name: "ZetterApiError",
      status: 401,
      code: "INVALID_API_KEY",
      retryable: false,
    });
  });

  it("marks a 429 as retryable and parses the Retry-After header (seconds)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ ok: false, error: { code: "RATE_LIMITED", message: "slow down" } }), {
          status: 429,
          headers: { "Retry-After": "30" },
        }),
    );

    const error = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() }).catch((e) => e);

    expect(error).toBeInstanceOf(ZetterApiError);
    expect(error.status).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(30);
  });

  it("marks 5xx responses as retryable", async () => {
    mockFetch(() => new Response("oops", { status: 503 }));

    const error = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() }).catch((e) => e);

    expect(error).toBeInstanceOf(ZetterApiError);
    expect(error.retryable).toBe(true);
  });

  it("falls back to HTTP_<status> when the error envelope is missing", async () => {
    mockFetch(() => new Response("Bad Gateway", { status: 502 }));

    const error = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() }).catch((e) => e);

    expect(error.code).toBe("HTTP_502");
    expect(error.message).toContain("Bad Gateway");
  });

  it("wraps a network failure as NETWORK_ERROR (status 0, retryable)", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));

    const error = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() }).catch((e) => e);

    expect(error).toBeInstanceOf(ZetterApiError);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.status).toBe(0);
    expect(error.retryable).toBe(true);
  });

  it("wraps an abort/timeout as TIMEOUT", async () => {
    mockFetch(() => {
      const err = new Error("aborted");
      err.name = "TimeoutError";
      return Promise.reject(err);
    });

    const error = await createPost({ content: "hi", apiKey: API_KEY, signal: stableSignal() }).catch((e) => e);

    expect(error.code).toBe("TIMEOUT");
    expect(error.status).toBe(0);
  });

  it("targets a custom baseUrl when provided", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ ok: true }), { status: 201 }));

    await createPost({
      content: "hi",
      apiKey: API_KEY,
      baseUrl: "https://staging.example.com",
      signal: stableSignal(),
    });

    expect(fetchMock.mock.calls[0]![0]).toBe("https://staging.example.com/api/v1/posts");
  });
});
