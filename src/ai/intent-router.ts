export type IntentType = "direct" | "context" | "tool";

/** Multi-word matches first (higher priority), then single words. */
const TOOL_KEYWORDS = [
  "set reminder",
  "set alarm",
  "set an alarm",
  "search the",
  "search for",
  "search online",
  "look up",
  "look up online",
  "find out",
  "check from the internet",
  "from the internet",
  "check online",
  "add event",
  "create event",
  "schedule meeting",
  "remind",
  "reminder",
  "alarm",
  "schedule",
  "call",
  "message",
  "contact",
  "event",
  "calendar",
  "note",
  "search",
  "what is",
  "when is",
];
const CONTEXT_KEYWORDS = ["summarize", "what did i", "history", "memory", "notes", "meeting"];

function hasKeywordMatch(input: string, keyword: string): boolean {
  if (keyword.includes(" ")) {
    return input.includes(keyword);
  }
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(input);
}

export function routeIntent(input: string): IntentType {
  const normalized = input.toLowerCase();
  // Action-oriented tool commands should win when both sets match
  // (e.g. "remind me about the meeting").
  if (TOOL_KEYWORDS.some((k) => hasKeywordMatch(normalized, k))) return "tool";
  if (CONTEXT_KEYWORDS.some((k) => hasKeywordMatch(normalized, k))) return "context";
  return "direct";
}

