import type { WebSearchProvider, WebSearchResult } from "./web-search-provider";

const API_BASE = "https://api.duckduckgo.com/";

/** DuckDuckGo Instant Answer API. No key required. Rate limits undocumented. */
export function createDuckDuckGoProvider(): WebSearchProvider {
  return {
    name: "duckduckgo",
    async search(query: string, options?: { timeoutMs?: number }): Promise<WebSearchResult> {
      const timeoutMs = options?.timeoutMs ?? 5000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const url = `${API_BASE}?q=${encodeURIComponent(query)}&format=json`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          Abstract?: string;
          AbstractText?: string;
          RelatedTopics?: { Text?: string }[];
          Redirect?: string;
        };
        return {
          abstract: data.Abstract,
          abstractText: data.AbstractText,
          relatedTopics: data.RelatedTopics,
          url: data.Redirect,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
