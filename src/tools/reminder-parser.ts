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

/** A clock time: "at 9", "9 AM", "9:30pm", "21:30", "noon", "midnight". */
const TIME_OF_DAY =
  /\b(?:at\s+\d{1,2}(?::\d{2})?|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\d{1,2}:\d{2}|noon|midnight)(?=\W|$)/i;

function parseSecondsWithChrono(text: string): number | null {
  const ref = new Date();
  const parsed = chrono.parseDate(text, ref, { forwardDate: true });
  if (!parsed) return null;
  // Round up so "at 9 AM" fires at 9:00, not 8:59:59.
  const seconds = Math.ceil((parsed.getTime() - ref.getTime()) / 1000);
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
  // A clock time ("tomorrow at 9 AM", "tonight at 8pm", "Friday 14:30") wins over the flat offsets below.
  if (TIME_OF_DAY.test(text)) {
    const atTime = parseSecondsWithChrono(text);
    if (atTime) return atTime;
  }
  // Relative phrases without a clock time: "tomorrow (same time)", "next day"
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
    // "... at 9 AM", "... tomorrow at 9", "... tonight at 8pm" (needs "at" or am/pm, so "call 911" is kept)
    .replace(
      /\s+(?:(?:today|tomorrow|tonight)\s+)?(?:at\s+\d{1,2}(?::\d{2})?(?:\s*(?:a\.?m\.?|p\.?m\.?))?|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\.?\s*$/i,
      "",
    )
    .replace(/\s+(?:tomorrow(?:\s+(?:same\s+time|morning|evening))?|tonight|same\s+time|next\s+day)\.?\s*$/i, "")
    .trim();
}

export function resolveReminderText(explicitText?: string, queryText?: string): string {
  const source = (explicitText || queryText || "").trim();
  if (!source) return "Reminder";
  // Anything between "remind me" and the first "to" is timing ("in 5 minutes", "tomorrow at 9 AM").
  const match = source.match(/\b(?:remind me|set (?:a )?reminder)\b.*?\bto\s+(.+)$/i);
  if (match?.[1]) return stripTrailingTime(match[1].trim());
  return stripTrailingTime(source);
}

/** Human wording for when a reminder fires, e.g. "in 10 minutes", "tomorrow at 9:00 AM", "Fri, Nov 13 at 9:00 AM". */
export function describeReminderTime(seconds: number, now: Date = new Date()): string {
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  // Nearest minute, so a reminder computed a moment earlier still reads "9:00" rather than "8:59".
  const when = new Date(Math.round((now.getTime() + seconds * 1000) / 60000) * 60000);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(when);
  const dayOffset = Math.round(
    (new Date(when.getFullYear(), when.getMonth(), when.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000,
  );
  if (dayOffset === 0) return `today at ${time}`;
  if (dayOffset === 1) return `tomorrow at ${time}`;
  const day = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(when);
  return `${day} at ${time}`;
}

