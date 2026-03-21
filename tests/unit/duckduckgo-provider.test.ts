import { describe, expect, it } from "vitest";
import { parseDuckHtmlResults } from "@/tools/providers/duckduckgo-provider";

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
