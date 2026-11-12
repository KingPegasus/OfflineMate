import { getDb } from "@/db/database";

/**
 * Keyword search over saved notes, for when there is no semantic search: Lite skips embeddings, and
 * notes.search used to look for the whole sentence ("What did I save about the dentist?") as one substring.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "i", "me", "my", "mine", "we", "our", "you", "your", "it", "its", "is", "are", "was", "were",
  "be", "been", "do", "did", "does", "done", "have", "has", "had", "what", "whats", "what's", "which", "who",
  "when", "where", "why", "how", "any", "anything", "something", "all", "about", "on", "in", "at", "for", "of",
  "to", "from", "with", "and", "or", "that", "this", "these", "those", "there", "here", "can", "could", "would",
  "will", "should", "please", "tell", "show", "find", "search", "look", "up", "get", "give", "list", "know",
  "save", "saved", "saving", "note", "notes", "noted", "write", "wrote", "written", "remember", "remembered",
  "memory", "memories", "history", "summarize", "summary", "meeting", "say", "said", "again", "ever", "last",
]);

export interface KeywordNote {
  id: string;
  title: string;
  content: string;
}

/** Words worth searching for: "What did I save about the dentist?" → ["dentist"]. */
export function noteSearchTerms(query: string): string[] {
  const words = query
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/'s\b/g, "")
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, 6);
}

/** Notes that mention any term, the ones matching the most terms first (newest first on a tie). */
export function rankNotesByTerms<T extends KeywordNote>(notes: T[], terms: string[]): T[] {
  const scored = notes
    .map((note, index) => {
      const haystack = `${note.title}\n${note.content}`.toLowerCase();
      return { note, index, hits: terms.filter((t) => haystack.includes(t)).length };
    })
    .filter((s) => s.hits > 0);
  scored.sort((a, b) => b.hits - a.hits || a.index - b.index);
  return scored.map((s) => s.note);
}

/** Search saved notes for the query's keywords (at most `limit`). */
export function searchNotesByKeywords(query: string, limit = 5): { terms: string[]; notes: KeywordNote[] } {
  const terms = noteSearchTerms(query);
  if (terms.length === 0) return { terms, notes: [] };
  const where = terms.map(() => "(instr(lower(title), ?) > 0 OR instr(lower(content), ?) > 0)").join(" OR ");
  const rows = getDb().getAllSync<KeywordNote>(
    `SELECT id, title, content FROM notes WHERE ${where} ORDER BY created_at DESC LIMIT 50`,
    terms.flatMap((t) => [t, t]),
  );
  return { terms, notes: rankNotesByTerms(rows, terms).slice(0, limit) };
}

function previewOf(note: KeywordNote): string {
  const title = note.title.trim();
  const content = note.content.replace(/\s+/g, " ").trim();
  if (!content || content.toLowerCase() === title.toLowerCase()) return title;
  const body = content.length > 140 ? `${content.slice(0, 140).trimEnd()}…` : content;
  return content.toLowerCase().startsWith(title.toLowerCase()) ? body : `${title}: ${body}`;
}

/**
 * Lite's reply to a notes question ("What did I save about the dentist?"), without the model: a 135M model
 * given no notes made one up (it copied the previous reply). Null when the question has no keywords.
 */
export function buildKeywordNotesReply(terms: string[], notes: KeywordNote[]): string | null {
  if (terms.length === 0) return null;
  const about = terms.map((t) => `"${t}"`).join(", ");
  if (notes.length === 0) return `I couldn't find a saved note that mentions ${about}.`;
  const heading = notes.length === 1 ? `1 saved note mentions ${about}:` : `${notes.length} saved notes mention ${about}:`;
  return `${heading}\n${notes.map((n) => `- ${previewOf(n)}`).join("\n")}`;
}
