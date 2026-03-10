export function normalizeSttResult(transcript: string): string {
  let result = transcript.trim() || "No speech captured.";
  if (result === "[BLANK_AUDIO]" || /^\s*\[BLANK_AUDIO\]\s*$/i.test(result)) {
    result = "No speech detected.";
  }
  return result;
}

/**
 * Realtime events are not always monotonic (a later event can be shorter than a previous one).
 * Keep the best transcript by preferring expansions and ignoring regressions.
 */
export function mergeTranscript(current: string, incoming: string): string {
  const next = incoming.replace(/\s+/g, " ").trim();
  const prev = current.replace(/\s+/g, " ").trim();
  if (!next) return prev;
  if (!prev) return next;
  if (next === prev) return prev;
  if (next.includes(prev)) return next; // expansion
  if (prev.includes(next)) return prev; // regression

  // Try overlap join: "set reminder in 5" + "5 minutes to sleep"
  const maxOverlap = Math.min(prev.length, next.length, 32);
  for (let n = maxOverlap; n >= 4; n -= 1) {
    if (prev.slice(-n).toLowerCase() === next.slice(0, n).toLowerCase()) {
      return `${prev}${next.slice(n)}`.trim();
    }
  }

  // If they are unrelated fragments, keep the longer one.
  return next.length >= prev.length ? next : prev;
}
