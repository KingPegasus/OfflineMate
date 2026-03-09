function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function collapseRepeatedLines(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";

  const deduped: string[] = [];
  let lastLine = "";
  let repeatedCount = 0;
  for (const line of lines) {
    const normalized = normalizeWhitespace(line.toLowerCase());
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
  if (sentences.length < 3) return normalized;

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
  return out.join(" ");
}

export function cleanModelOutput(text: string): string {
  const lineCollapsed = collapseRepeatedLines(text);
  const sentenceTrimmed = trimRepeatingSentenceTail(lineCollapsed);
  return sentenceTrimmed.trim();
}

