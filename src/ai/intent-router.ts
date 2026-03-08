export type IntentType = "direct" | "context" | "tool";

const TOOL_KEYWORDS = ["remind", "schedule", "call", "message", "contact", "event", "note"];
const CONTEXT_KEYWORDS = ["summarize", "what did i", "history", "memory", "notes", "meeting"];

export function routeIntent(input: string): IntentType {
  const normalized = input.toLowerCase();
  if (TOOL_KEYWORDS.some((k) => normalized.includes(k))) return "tool";
  if (CONTEXT_KEYWORDS.some((k) => normalized.includes(k))) return "context";
  return "direct";
}

