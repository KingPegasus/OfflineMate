import { describe, expect, it, vi } from "vitest";
import { createDuckDuckGoProvider, parseDuckHtmlResults } from "@/tools/providers/duckduckgo-provider";

describe("duckduckgo html parser", () => {
  it("extracts title, snippet, and url", () => {
    const html = `
      <div class="result results_links results_links_deep web-result">
        <div class="result__body">
          <h2 class="result__title">
            <a class="result__a" href="https://example.com/page">Example &amp; Result</a>
          </h2>
          <a class="result__snippet">A short &quot;snippet&quot; for testing.</a>
        </div>
      </div>
    `;
    const parsed = parseDuckHtmlResults(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      title: "Example & Result",
      snippet: 'A short "snippet" for testing.',
      url: "https://example.com/page",
    });
  });

  it("returns empty array when no result blocks are found", () => {
    expect(parseDuckHtmlResults("<html><body>No results</body></html>")).toEqual([]);
  });

  it("uses a browser-like User-Agent on React Native so DDG returns parseable HTML", async () => {
    const calls: { url: string; headers?: HeadersInit }[] = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, headers: init?.headers });
      if (url.includes("api.duckduckgo.com")) {
        return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("<html><body></body></html>", { status: 200, headers: { "Content-Type": "text/html" } });
    }) as typeof fetch;

    const prev = (globalThis as { navigator?: unknown }).navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { product: "ReactNative" },
      configurable: true,
      writable: true,
    });
    try {
      const provider = createDuckDuckGoProvider();
      await provider.search("population of Tokyo", { timeoutMs: 5000 });
    } finally {
      globalThis.fetch = origFetch;
      Object.defineProperty(globalThis, "navigator", {
        value: prev,
        configurable: true,
        writable: true,
      });
    }

    expect(calls.length).toBeGreaterThanOrEqual(2);
    const h = calls[0]?.headers;
    const ua =
      h && typeof h === "object" && !(h instanceof Headers)
        ? (h as Record<string, string>)["User-Agent"]
        : new Headers(h as HeadersInit).get("User-Agent");
    expect(ua).toMatch(/Chrome/);
  });

  it("parses DuckDuckGo multi-class markup (links_main links_deep result__body)", () => {
    const html = `
      <div class="links_main links_deep result__body">
        <h2 class="result__title">
          <a rel="nofollow" class="result__a" href="https://example.com/coffee">Best Coffee Near Me</a>
        </h2>
        <a class="result__snippet">Find nearby coffee shops.</a>
      </div>
    </div>
    `;
    const parsed = parseDuckHtmlResults(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.title).toBe("Best Coffee Near Me");
    expect(parsed[0]?.url).toContain("example.com");
  });
});
