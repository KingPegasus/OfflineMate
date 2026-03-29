import type { Tool } from "@/tools/tool-registry";
import { useSettingsStore } from "@/stores/settings-store";
import { runWebSearchPipeline } from "@/tools/web-search-pipeline";

export { WEB_SEARCH_NO_RESULTS_PREFIX, runWebSearchPipeline } from "@/tools/web-search-pipeline";
export type { WebSearchPipelineResult } from "@/tools/web-search-pipeline";

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
    return runWebSearchPipeline(params);
  },
};
