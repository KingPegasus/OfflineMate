/**
 * Web search provider abstraction. Allows swapping implementations
 * (e.g. DuckDuckGo Instant Answer, Brave Search API) without changing tool logic.
 */
export interface WebSearchResult {
  answer?: string;
  heading?: string;
  abstract?: string;
  abstractText?: string;
  relatedTopics?: { Text?: string }[];
  results?: { title?: string; snippet?: string; url?: string }[];
  /** Source URL when available. */
  url?: string;
}

export interface WebSearchProvider {
  name: string;
  search(query: string, options?: { timeoutMs?: number }): Promise<WebSearchResult>;
}
