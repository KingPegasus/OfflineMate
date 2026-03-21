import type { Tool } from "@/tools/tool-registry";
import { useSettingsStore } from "@/stores/settings-store";
import { createDuckDuckGoProvider } from "@/tools/providers/duckduckgo-provider";

const provider = createDuckDuckGoProvider();
const MAX_OUTPUT_CHARS = 2000;

/** Empty-SERP UX prefix; chat skips LLM synthesis so this full string is shown verbatim. */
export const WEB_SEARCH_NO_RESULTS_PREFIX = "No web results found for that query.";

function isDateQuery(lower: string): boolean {
  return /\b(today('| i)?s date|date today|current date|what('?s| is) the date|what day is it)\b/.test(lower);
}

function isTimeQuery(lower: string): boolean {
  return /\b(current time|time now|what('?s| is) the time|local time)\b/.test(lower);
}

function isDayQuery(lower: string): boolean {
  return /\b(what day is it|day today|today day|weekday)\b/.test(lower);
}

function buildLocalDateTimeAnswer(rawQuery: string): string | null {
  const lower = rawQuery.toLowerCase();
  const needDate = isDateQuery(lower);
  const needTime = isTimeQuery(lower);
  const needDay = isDayQuery(lower);
  if (!needDate && !needTime && !needDay) return null;

  const now = new Date();
  const dateText = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
  const timeText = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(now);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time zone";

  if (needDate && needTime) return `It is ${dateText}, and the current time is ${timeText} (${zone}).`;
  if (needTime) return `The current time is ${timeText} (${zone}).`;
  if (needDay && !needDate) return `Today is ${weekday} (${zone}).`;
  return `Today is ${dateText} (${zone}).`;
}

function buildSearchSummary(result: {
  answer?: string;
  heading?: string;
  abstract?: string;
  abstractText?: string;
  relatedTopics?: { Text?: string }[];
  results?: { title?: string; snippet?: string; url?: string }[];
}): string {
  const parts: string[] = [];
  if (result.answer?.trim()) {
    parts.push(result.answer.trim());
  }
  const text = result.abstractText || result.abstract;
  if (text && text.trim()) {
    parts.push(text.trim());
  }
  if (parts.length === 0 && result.heading?.trim()) {
    parts.push(result.heading.trim());
  }
  const topics = result.relatedTopics ?? [];
  for (let i = 0; i < Math.min(topics.length, 5); i++) {
    const t = topics[i]?.Text?.trim();
    if (t) parts.push(`- ${t}`);
  }
  const links = result.results ?? [];
  for (let i = 0; i < Math.min(links.length, 4); i++) {
    const item = links[i];
    const title = item.title?.trim();
    const snippet = item.snippet?.trim();
    if (title && snippet) {
      parts.push(`- ${title}: ${snippet}`);
    } else if (snippet) {
      parts.push(`- ${snippet}`);
    } else if (title) {
      parts.push(`- ${title}`);
    }
  }
  const joined = parts.join("\n");
  return joined.length > MAX_OUTPUT_CHARS ? joined.slice(0, MAX_OUTPUT_CHARS) + "…" : joined;
}

export const webSearchTool: Tool = {
  name: "search.web",
  description: "Search the web for current information. Requires internet.",
  keywords: [
    // Explicit search / lookup
    "search the web",
    "search the internet",
    "search the net",
    "search for",
    "search online",
    "search",
    "look up online",
    "look it up",
    "look something up",
    "look up",
    "check online",
    "check the web",
    "check the internet",
    "check from the internet",
    "from the internet",
    "from the web",
    "find out online",
    "find online",
    "get information from",
    "get info from the web",
    // Question / factual intent (omit bare "what is" — definitional Qs handled on-device)
    "what's the current",
    "what is the current",
    // Current / latest
    "latest on",
    "latest news",
    "latest about",
    "current information",
    "current date",
    "today's date",
    "up to date on",
    // Verification / fact-check
    "is it true that",
    "verify online",
    "fact check",
    // Weather (implies live/search)
    "today's weather",
    "current weather",
    "weather now",
    "near me",
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
    const localAnswer = buildLocalDateTimeAnswer(query);
    if (localAnswer) {
      return {
        ok: true,
        message: localAnswer,
        payload: { query, source: "local_datetime" },
      };
    }
    try {
      const result = await provider.search(query, { timeoutMs: 5000 });
      const summary = buildSearchSummary(result);
      if (!summary) {
        const nearMe = /\bnear\s+me\b/i.test(query);
        const message = nearMe
          ? `${WEB_SEARCH_NO_RESULTS_PREFIX} Try adding a city or place (e.g. 'coffee near Seattle').`
          : `${WEB_SEARCH_NO_RESULTS_PREFIX} Try a more specific phrase.`;
        return {
          ok: true,
          message,
        };
      }
      return {
        ok: true,
        message: summary,
        payload: { query, hasAbstract: !!result.abstract, resultCount: result.results?.length ?? 0 },
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
