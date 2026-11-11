/**
 * Whether a reply has a real generation speed to show. Replies written without running the model
 * (Lite tool replies such as "Reminder set…", fallbacks) have none, and the bubble hides the line
 * instead of showing "(n/a tok/s)".
 */
export function hasMeasuredTokPerSec(tokensPerSecond: number | null | undefined): tokensPerSecond is number {
  return typeof tokensPerSecond === "number" && Number.isFinite(tokensPerSecond) && tokensPerSecond > 0;
}

/** "(18.3 tok/s)", shown under assistant replies. Call only when hasMeasuredTokPerSec is true. */
export function formatTokPerSec(tokensPerSecond: number): string {
  return `(${tokensPerSecond.toFixed(1)} tok/s)`;
}

/**
 * Matches a whole speed line. Also matches "(n/a tok/s)": replies saved before 0.9.0 could contain
 * it, and small models copy it from history.
 */
const TOK_PER_SEC_LINE = /^[ \t]*\((?:\d+(?:\.\d+)?|n\/a) tok\/s\)[ \t]*$/gim;

/**
 * Removes speed lines from reply text. Replies saved before 0.7.0 stored the speed inside the text,
 * and small models copy it from history into new answers, so this runs on history sent to the model
 * and on model output.
 */
export function stripTokPerSecLines(text: string): string {
  return text.replace(TOK_PER_SEC_LINE, "").replace(/\n{3,}/g, "\n\n").trim();
}
