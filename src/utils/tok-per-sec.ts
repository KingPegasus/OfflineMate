/** "(18.3 tok/s)", or "(n/a tok/s)" when the speed was not measured. Shown under assistant replies. */
export function formatTokPerSec(tokensPerSecond: number | null): string {
  const metric =
    tokensPerSecond !== null && Number.isFinite(tokensPerSecond) && tokensPerSecond > 0
      ? tokensPerSecond.toFixed(1)
      : "n/a";
  return `(${metric} tok/s)`;
}

/** Matches a whole line produced by formatTokPerSec. */
const TOK_PER_SEC_LINE = /^[ \t]*\((?:\d+(?:\.\d+)?|n\/a) tok\/s\)[ \t]*$/gim;

/**
 * Removes speed lines from reply text. Replies saved before 0.7.0 stored the speed inside the text,
 * and small models copy it from history into new answers, so this runs on history sent to the model
 * and on model output.
 */
export function stripTokPerSecLines(text: string): string {
  return text.replace(TOK_PER_SEC_LINE, "").replace(/\n{3,}/g, "\n\n").trim();
}
