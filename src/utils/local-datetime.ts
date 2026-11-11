import { normalizeIntentInput } from "@/ai/intent-router";

/**
 * Chat's on-device answer to "what is today's date", "what time is it" and "what day is it",
 * or null when the message asks none of these. Built from the phone's clock, never the model.
 */
export function buildLocalDateTimeAnswer(rawQuery: string): string | null {
  const lower = normalizeIntentInput(rawQuery);
  const needDate = /\b(today('| i)?s date|date today|current date|what('?s| is) the date)\b/.test(lower);
  const needTime = /\b(current time|time now|what('?s| is) the time|local time)\b/.test(lower);
  const needDay = /\b(what day is it|day today|today day|weekday)\b/.test(lower);
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
