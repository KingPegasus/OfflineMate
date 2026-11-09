function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function collapseRepeatedLines(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  if (lines.length === 0) return "";
  // Preserve blank lines (paragraph breaks); filter(Boolean) was stripping them

  const deduped: string[] = [];
  let lastLine = "";
  let repeatedCount = 0;
  for (const line of lines) {
    const normalized = line ? normalizeWhitespace(line.toLowerCase()) : "";
    if (normalized === lastLine) {
      repeatedCount += 1;
      if (repeatedCount >= 2) {
        continue;
      }
    } else {
      lastLine = normalized;
      repeatedCount = 0;
    }
    deduped.push(line);
  }
  return deduped.join("\n");
}

export function trimRepeatingSentenceTail(text: string): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return "";

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length < 3) return text;

  const out: string[] = [];
  const seen = new Map<string, number>();
  for (const sentence of sentences) {
    const key = sentence.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    // Keep at most 2 copies of the same sentence to avoid visible loops.
    if (count <= 2) {
      out.push(sentence);
    }
  }
  // If no repetition was removed, return original to preserve newlines/formatting
  if (out.length === sentences.length) return text;
  return out.join(" ");
}

export function cleanModelOutput(text: string): string {
  const lineCollapsed = collapseRepeatedLines(text);
  const sentenceTrimmed = trimRepeatingSentenceTail(lineCollapsed);
  return sentenceTrimmed.trim();
}

/**
 * The model repeated the tool output instead of replying: it starts with a tool name such as
 * "reminders.set" or "notes.create: ...", or it copies the "Payload: {...}" line. Small models do this.
 */
export function looksLikeToolEcho(text: string): boolean {
  const t = text.trim();
  if (/^[a-z]+\.[a-z]+[A-Za-z]*(?::|\s*$)/.test(t)) return true;
  return /\bpayload:\s*\{/i.test(t);
}

