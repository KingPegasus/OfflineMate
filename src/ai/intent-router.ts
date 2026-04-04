export type IntentType = "direct" | "context" | "tool";

/**
 * Coarse keyword routing before LLM/tool execution.
 * Prefer multi-word / explicit phrases over single words to limit false positives
 * (e.g. code "call", prose "event", definitional "what is an LLM?").
 * @see docs/intent-routing.md for full rationale and examples.
 */
const TOOL_KEYWORDS = [
  // Reminders & alarms
  "set reminder",
  "set alarm",
  "set an alarm",
  "wake me",
  "remind",
  "reminder",
  "alarm",
  // Calendar — phrases only (no bare event/calendar/schedule)
  "add event",
  "create event",
  "schedule meeting",
  "on my calendar",
  "my calendar",
  "my schedule",
  "on my schedule",
  "calendar today",
  "what's on my",
  "whats on my",
  // Contacts & messaging — space-suffix phrases (not bare call/message/contact)
  "text ",
  "phone ",
  "send a message",
  "send message",
  "message me",
  "message you",
  "message him",
  "message her",
  "message them",
  "message us",
  "message back",
  "email ",
  "contact ",
  // Notes — phrases only (no bare "note"); phone "call …" handled by wantsPhoneCallIntent()
  "add a note",
  // "Add note to …" (no "a") — common speech; avoid matching "add notebook" via space/punctuation after "note"
  "add note ",
  "add note.",
  "add note,",
  "add note:",
  "take a note",
  "take note ",
  "save a note",
  "write this down",
  "remember this",
  "find note",
  "search note",
  // Web search — explicit
  "search the web",
  "search the internet",
  "search the net",
  "search for",
  "search online",
  "search the",
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
  // Web — time-sensitive / verify (no bare what/who/where/when/why is, no "tell me about")
  "what's the current",
  "what is the current",
  "latest on",
  "latest news",
  "latest about",
  "current information",
  "up to date on",
  "is it true that",
  "verify online",
  "fact check",
  "today's weather",
  "current weather",
  "weather now",
  "near me",
  "search",
];

const CONTEXT_KEYWORDS = [
  "summarize",
  "what did i",
  "did i save",
  "have i saved",
  "history",
  "memory",
  "notes",
  "meeting",
];

/** Phone-style "call …" without matching programming "recursive call", "function call", etc. */
export function wantsPhoneCallIntent(normalizedLower: string): boolean {
  if (
    /\b(function|method|recursive|error|null|system|api|wrapper|virtual|callback|hook|mock|spy|tail|roll)\s+call\b/.test(
      normalizedLower,
    )
  ) {
    return false;
  }
  // "call mom", "call 911", "call the office"
  return /\bcall\s+[a-z0-9]/.test(normalizedLower);
}

/**
 * Relative-time reminder phrasing. STT often turns "Remind me" into "Find me".
 */
export function wantsReminderRelativeTimeIntent(normalizedLower: string): boolean {
  if (/\bremind me in \d/.test(normalizedLower)) return true;
  if (/\bremind me after \d/.test(normalizedLower)) return true;
  if (/\bfind me in \d/.test(normalizedLower)) return true;
  if (/\bping me in \d/.test(normalizedLower)) return true;
  if (/\bnotify me in \d/.test(normalizedLower)) return true;
  if (/\bset (a |an |)(timer|alarm) (for|in) \d/.test(normalizedLower)) return true;
  return false;
}

/**
 * Phrase keywords use substring search; require a token boundary on the left so
 * "text " does not match inside "con**text** " or "phone " inside "smart**phone** ".
 */
function phraseMatches(input: string, phrase: string): boolean {
  if (phrase.length === 0) return false;
  let from = 0;
  while (from <= input.length) {
    const idx = input.indexOf(phrase, from);
    if (idx === -1) return false;
    const leftOk = idx === 0 || !/[a-z0-9]/.test(input[idx - 1]!);
    if (leftOk) return true;
    from = idx + 1;
  }
  return false;
}

function hasKeywordMatch(input: string, keyword: string): boolean {
  if (keyword.includes(" ")) {
    return phraseMatches(input, keyword);
  }
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(input);
}

export function routeIntent(input: string): IntentType {
  const normalized = input.toLowerCase();
  // Action-oriented tool commands should win when both sets match
  // (e.g. "remind me about the meeting").
  if (TOOL_KEYWORDS.some((k) => hasKeywordMatch(normalized, k))) return "tool";
  if (wantsPhoneCallIntent(normalized)) return "tool";
  if (wantsReminderRelativeTimeIntent(normalized)) return "tool";
  if (CONTEXT_KEYWORDS.some((k) => hasKeywordMatch(normalized, k))) return "context";
  return "direct";
}
