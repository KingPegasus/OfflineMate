/**
 * Web search provider abstraction. Allows swapping implementations
 * (e.g. DuckDuckGo Instant Answer, Brave Search API) without changing tool logic.
 */
export interface WebSearchResult {
  abstract?: string;
  abstractText?: string;
  relatedTopics?: { Text?: string }[];
  /** Source URL when available. */
  url?: string;
}

export interface WebSearchProvider {
  name: string;
  search(query: string, options?: { timeoutMs?: number }): Promise<WebSearchResult>;
}
