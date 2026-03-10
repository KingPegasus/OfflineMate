function parseNumeric(value?: string): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

/** Return 0 when no duration could be parsed (caller should not schedule). */
export function resolveReminderSeconds(explicitSeconds?: string, naturalLanguage?: string): number {
  const direct = parseNumeric(explicitSeconds);
  if (direct) return direct;
  const text = (naturalLanguage ?? "").toLowerCase();
  // Explicit "in N unit" / "after N unit"
  const match = text.match(/\b(?:in|after)\s+(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)\b/i);
  if (match) {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (Number.isFinite(value) && value > 0) {
      if (unit.startsWith("d")) return value * 86400;
      if (unit.startsWith("h")) return value * 3600;
      if (unit.startsWith("m")) return value * 60;
      return value;
    }
  }
  // Relative phrases: "tomorrow (same time)", "tomorrow morning", "next day"
  if (/\b(?:tomorrow|same time|next day|in a day)\b/i.test(text)) return 86400; // ~24h
  if (/\b(?:tonight|this evening)\b/i.test(text)) return 43200; // ~12h
  // Unknown: don't default to 60s; caller should ask user to specify
  return 0;
}

/** Strip trailing time phrases so the reminder body is just the action (no "in 5 mins" or "tomorrow same time"). */
function stripTrailingTime(text: string): string {
  return text
    .replace(/\s+(?:in|after)\s+\d+\s*(?:seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)\.?\s*$/i, "")
    .replace(/\s+(?:tomorrow(?:\s+(?:same\s+time|morning|evening))?|same\s+time|next\s+day)\.?\s*$/i, "")
    .trim();
}

export function resolveReminderText(explicitText?: string, queryText?: string): string {
  const source = (explicitText || queryText || "").trim();
  if (!source) return "Reminder";
  const match = source.match(
    /\b(?:remind me|set (?:a )?reminder)(?:\s+(?:in|after)\s+\d+\s*\w+)?\s+to\s+(.+)$/i,
  );
  if (match?.[1]) return stripTrailingTime(match[1].trim());
  return stripTrailingTime(source);
}

