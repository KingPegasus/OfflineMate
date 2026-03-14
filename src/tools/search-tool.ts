import type { Tool } from "@/tools/tool-registry";
import { useSettingsStore } from "@/stores/settings-store";
import { createDuckDuckGoProvider } from "@/tools/providers/duckduckgo-provider";

const provider = createDuckDuckGoProvider();
const MAX_OUTPUT_CHARS = 2000;

function buildSearchSummary(result: {
  abstract?: string;
  abstractText?: string;
  relatedTopics?: { Text?: string }[];
}): string {
  const parts: string[] = [];
  const text = result.abstractText || result.abstract;
  if (text && text.trim()) {
    parts.push(text.trim());
  }
  const topics = result.relatedTopics ?? [];
  for (let i = 0; i < Math.min(topics.length, 5); i++) {
    const t = topics[i]?.Text?.trim();
    if (t) parts.push(`- ${t}`);
  }
  const joined = parts.join("\n");
  return joined.length > MAX_OUTPUT_CHARS ? joined.slice(0, MAX_OUTPUT_CHARS) + "…" : joined;
}

export const webSearchTool: Tool = {
  name: "search.web",
  description: "Search the web for current information. Requires internet.",
  keywords: [
    "check from the internet",
    "from the internet",
    "search online",
    "look up online",
    "search",
    "look up",
    "what is",
    "find out",
    "when is",
    "who is",
    "current date",
    "today's date",
  ],
  params: { optional: ["query"] },
  execute: async (params) => {
    if (!useSettingsStore.getState().webSearchEnabled) {
      return {
        ok: false,
        message: "Web search is disabled. Enable it in Settings to search the internet.",
        errorCode: "PERMISSION_DENIED",
      };
    }
    const query = (params.query || params.text || "").trim();
    if (!query) {
      return {
        ok: false,
        message: "What would you like to search for?",
        errorCode: "PARSE_FAILURE",
      };
    }
    try {
      const result = await provider.search(query, { timeoutMs: 5000 });
      const summary = buildSearchSummary(result);
      if (!summary) {
        return {
          ok: true,
          message: "No instant answer found for that query. Try rephrasing or ask something more specific.",
        };
      }
      return {
        ok: true,
        message: summary,
        payload: { query, hasAbstract: !!result.abstract },
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const isNetwork =
        err.name === "AbortError" ||
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("fetch");
      return {
        ok: false,
        message: isNetwork
          ? "Internet unavailable. Please check your connection and try again."
          : `Search failed: ${err.message}`,
        errorCode: isNetwork ? "NETWORK_UNAVAILABLE" : "UNKNOWN",
        retryable: true,
      };
    }
  },
};
