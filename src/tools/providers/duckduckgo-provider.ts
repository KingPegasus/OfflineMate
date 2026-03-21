import type { WebSearchProvider, WebSearchResult } from "./web-search-provider";

const API_BASE = "https://api.duckduckgo.com/";
const HTML_SEARCH_BASE = "https://html.duckduckgo.com/html/";

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanText(input: string): string {
  return decodeHtmlEntities(stripTags(input)).replace(/\s+/g, " ").trim();
}

export function parseDuckHtmlResults(html: string): { title?: string; snippet?: string; url?: string }[] {
  const results: { title?: string; snippet?: string; url?: string }[] = [];
  // DuckDuckGo uses multiple classes, e.g. class="links_main links_deep result__body"
  const blockRegex = /<div[^>]*class="[^"]*result__body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) && results.length < 5) {
    const block = blockMatch[1] ?? "";
    const linkMatch = block.match(
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/,
    );
    const snippetMatch = block.match(
      /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    );

    const rawUrl = linkMatch?.[1]?.trim();
    const title = linkMatch?.[2] ? cleanText(linkMatch[2]) : undefined;
    const snippetCandidate = snippetMatch?.[1] ?? snippetMatch?.[2] ?? "";
    const snippet = snippetCandidate ? cleanText(snippetCandidate) : undefined;

    if (!title && !snippet && !rawUrl) continue;
    results.push({ title, snippet, url: rawUrl });
  }
  return results;
}

/** DuckDuckGo Instant Answer API. No key required. Rate limits undocumented. */
export function createDuckDuckGoProvider(): WebSearchProvider {
  return {
    name: "duckduckgo",
    async search(query: string, options?: { timeoutMs?: number }): Promise<WebSearchResult> {
      const timeoutMs = options?.timeoutMs ?? 5000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const url = `${API_BASE}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          Answer?: string;
          Heading?: string;
          Abstract?: string;
          AbstractText?: string;
          RelatedTopics?: { Text?: string }[];
          Redirect?: string;
        };
        const instantResult: WebSearchResult = {
          answer: data.Answer,
          heading: data.Heading,
          abstract: data.Abstract,
          abstractText: data.AbstractText,
          relatedTopics: data.RelatedTopics,
          url: data.Redirect,
        };
        const hasInstantContent =
          !!instantResult.answer?.trim() ||
          !!instantResult.abstractText?.trim() ||
          !!instantResult.abstract?.trim() ||
          !!instantResult.relatedTopics?.length;
        if (hasInstantContent) {
          return instantResult;
        }

        // Fallback: HTML endpoint often has regular SERP results even when instant API is empty.
        const htmlUrl = `${HTML_SEARCH_BASE}?q=${encodeURIComponent(query)}`;
        const htmlRes = await fetch(htmlUrl, {
          signal: controller.signal,
          headers: {
            Accept: "text/html",
          },
        });
        if (!htmlRes.ok) throw new Error(`HTTP ${htmlRes.status}`);
        const html = await htmlRes.text();
        const results = parseDuckHtmlResults(html);
        return {
          ...instantResult,
          results,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
