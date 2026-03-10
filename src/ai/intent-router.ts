export type IntentType = "direct" | "context" | "tool";

const TOOL_KEYWORDS = [
  "remind",
  "reminder",
  "set reminder",
  "schedule",
  "call",
  "message",
  "contact",
  "event",
  "note",
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

