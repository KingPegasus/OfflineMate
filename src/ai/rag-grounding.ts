/**
 * Model sometimes refuses with boilerplate ("insufficient context") even when the
 * snippet does answer a recall question—often because the note is short. Substrings
 * from the note can appear inside that refusal, wrongly passing grounding checks.
 */
export function isRagDismissiveRefusal(answer: string): boolean {
  const a = answer.toLowerCase();
  if (
    /insufficient\s+to\s+(answer|determine|fully)/i.test(a) ||
    /context\s+(provided\s+)?is\s+insufficient/i.test(a) ||
    /does\s+not\s+contain\s+sufficient\s+information/i.test(a) ||
    /incomplete\s+and\s+does\s+not\s+contain/i.test(a) ||
    /\bcannot\s+(adequately\s+)?answer\b/i.test(a) ||
    /\bunable\s+to\s+answer\b/i.test(a) ||
    /no\s+sufficient\s+information/i.test(a)
  ) {
    return true;
  }
  return false;
}

/**
 * Detect when the model's answer does not reflect retrieved note text (hallucination).
 * Uses contiguous substring overlap so generic "dentist" trivia cannot pass without
 * matching the user's actual indexed wording.
 */
export function isRagAnswerGroundedInSnippets(answer: string, snippets: string[]): boolean {
  const normalizedAnswer = answer.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalizedAnswer) return false;

  for (const snippet of snippets) {
    const s = snippet.toLowerCase().replace(/\s+/g, " ").trim();
    if (s.length === 0) continue;
    if (s.length <= 14) {
      if (normalizedAnswer.includes(s)) return true;
      continue;
    }
    const windowLen = Math.min(s.length, Math.max(12, Math.floor(s.length * 0.32)));
    for (let i = 0; i + windowLen <= s.length; i += 1) {
      const sub = s.slice(i, i + windowLen);
      if (sub.length >= 10 && normalizedAnswer.includes(sub)) return true;
    }
  }
  return false;
}

/** User-visible fallback when the model ignored retrieved text. */
export function verbatimRagFallback(snippets: string[]): string {
  const text = snippets.map((s) => s.trim()).filter(Boolean).join("\n\n");
  return `Here is what I found in your indexed notes:\n\n${text}`;
}

export function ragAnswerOrFallback(answer: string, snippets: string[]): string {
  if (snippets.length === 0) return answer;
  if (isRagDismissiveRefusal(answer)) return verbatimRagFallback(snippets);
  if (isRagAnswerGroundedInSnippets(answer, snippets)) return answer;
  return verbatimRagFallback(snippets);
}
