/**
 * Words around a name in a contact question ("What is Ali's phone number?", "find contact Sara Khan",
 * "call mom"). The system contact search matches the name field, so the whole sentence found no one.
 */
const FILLER_WORDS = new Set([
  "hey", "ok", "okay", "please", "pls", "can", "could", "would", "will", "you", "me", "i", "do", "have", "got",
  "find", "search", "look", "up", "lookup", "show", "get", "give", "tell", "send", "share", "need", "want",
  "what", "whats", "what's", "which", "is", "are", "was", "the", "a", "an", "my", "for", "of", "to", "from",
  "in", "on", "with", "at", "and", "contact", "contacts", "details", "detail", "info", "information",
  "phone", "mobile", "cell", "cellphone", "telephone", "number", "numbers", "no", "num", "call", "text",
  "dial", "ring", "saved", "list",
]);

/** The name to search for, or "" if the text is only filler ("show my contacts"). */
export function extractContactName(text: string): string {
  const words = text
    .normalize("NFKC")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[?!.,;:"()]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    // "Ali's" → "Ali"
    .map((w) => w.replace(/'s$/i, "").replace(/'$/, ""));
  return words
    .filter((w) => !FILLER_WORDS.has(w.toLowerCase()))
    .slice(0, 4)
    .join(" ");
}

/** Names to try in order: the full name, then each word ("Ali Khan" saved as "Ali K." still matches "Ali"). */
export function contactSearchNames(name: string): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  return [name, ...words.filter((w) => w.length > 1)];
}
