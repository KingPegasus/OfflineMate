import * as chrono from "chrono-node";

function parseNumeric(value?: string): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
};

function parseFlexibleNumber(value?: string): number | null {
  if (!value) return null;
  const direct = parseNumeric(value);
  if (direct) return direct;
  const normalized = value.trim().toLowerCase().replace(/-/g, " ");
  if (!normalized) return null;
  if (NUMBER_WORDS[normalized]) return NUMBER_WORDS[normalized];

  const parts = normalized.split(/\s+/);
  if (parts.length === 2 && NUMBER_WORDS[parts[0]] && NUMBER_WORDS[parts[1]]) {
    return NUMBER_WORDS[parts[0]] + NUMBER_WORDS[parts[1]];
  }
  return null;
}

function parseSecondsWithChrono(text: string): number | null {
  const ref = new Date();
  const parsed = chrono.parseDate(text, ref, { forwardDate: true });
  if (!parsed) return null;
  const seconds = Math.floor((parsed.getTime() - ref.getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

/** Return 0 when no duration could be parsed (caller should not schedule). */
export function resolveReminderSeconds(explicitSeconds?: string, naturalLanguage?: string): number {
  const direct = parseNumeric(explicitSeconds);
  if (direct) return direct;
  const text = (naturalLanguage ?? "").toLowerCase();
  // Explicit "in N unit" / "after N unit"
  const match = text.match(
    /\b(?:in|after)\s+((?:\d+)|(?:[a-z-]+))\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)\b/i,
  );
  if (match) {
    const value = parseFlexibleNumber(match[1]);
    const unit = match[2].toLowerCase();
    if (value && Number.isFinite(value) && value > 0) {
      if (unit.startsWith("d")) return value * 86400;
      if (unit.startsWith("h")) return value * 3600;
      if (unit.startsWith("m")) return value * 60;
      return value;
    }
  }
  // Relative phrases: "tomorrow (same time)", "tomorrow morning", "next day"
  if (/\b(?:tomorrow|same time|next day|in a day)\b/i.test(text)) return 86400; // ~24h
  if (/\b(?:tonight|this evening)\b/i.test(text)) return 43200; // ~12h

  // Robust natural-language fallback (e.g. "in two minutes", "after half an hour", "next monday at 9")
  const chronoSeconds = parseSecondsWithChrono(text);
  if (chronoSeconds) return chronoSeconds;

  // Unknown: don't default to 60s; caller should ask user to specify
  return 0;
}

/** Strip trailing time phrases so the reminder body is just the action (no "in 5 mins" or "tomorrow same time"). */
function stripTrailingTime(text: string): string {
  return text
    .replace(
      /\s+(?:in|after)\s+(?:(?:\d+)|(?:[a-z-]+))\s*(?:seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)\.?\s*$/i,
      "",
    )
    .replace(/\s+(?:tomorrow(?:\s+(?:same\s+time|morning|evening))?|same\s+time|next\s+day)\.?\s*$/i, "")
    .trim();
}

export function resolveReminderText(explicitText?: string, queryText?: string): string {
  const source = (explicitText || queryText || "").trim();
  if (!source) return "Reminder";
  const match = source.match(
    /\b(?:remind me|set (?:a )?reminder)(?:\s+(?:in|after)\s+(?:(?:\d+)|(?:[a-z-]+))\s*\w+)?\s+to\s+(.+)$/i,
  );
  if (match?.[1]) return stripTrailingTime(match[1].trim());
  return stripTrailingTime(source);
}

