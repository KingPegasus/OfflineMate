import { getDb } from "@/db/database";
import { indexNoteForRetrieval } from "@/context/context-indexer";
import type { Tool } from "@/tools/tool-registry";

/** Planner often passes only `text` / `query` (full user line); strip common note-taking prefixes for body. */
const NOTE_INTENT_PREFIXES = [
  /^add\s+a\s+note\s+to\s+/i,
  /^add\s+a\s+note\s*:\s*/i,
  /^take\s+a\s+note\s*:\s*/i,
  /^take\s+a\s+note\s+to\s+/i,
  /^save\s+a\s+note\s+to\s+/i,
  /^save\s+a\s+note\s*:\s*/i,
  /^add\s+a\s+note\s+/i,
  /^remember\s+this\s*:\s*/i,
  /^write\s+this\s+down\s*:\s*/i,
];

function stripNoteIntentPrefixes(raw: string): string {
  let t = raw.trim();
  for (const re of NOTE_INTENT_PREFIXES) {
    t = t.replace(re, "").trim();
  }
  return t;
}

function firstLineOrTruncate(text: string, max: number): string {
  const line = text.split(/\r?\n/)[0]?.trim() ?? "";
  if (line.length <= max) return line;
  return `${line.slice(0, Math.max(0, max - 1))}…`;
}

export const createNoteTool: Tool = {
  name: "notes.create",
  description: "Create a note in local SQLite",
  keywords: ["add a note", "note", "write down", "remember this"],
  params: { optional: ["title", "content"] },
  execute: async (params) => {
    const rawPrompt = (params.text ?? params.query ?? "").trim();
    const explicitTitle = (params.title ?? "").trim();
    const explicitContent = (params.content ?? "").trim();

    let content = explicitContent;
    if (!content && rawPrompt) {
      const stripped = stripNoteIntentPrefixes(rawPrompt);
      content = stripped || rawPrompt;
    }

    let title = explicitTitle;
    if (!title) {
      title = content ? firstLineOrTruncate(content, 72) : "Untitled note";
    }

    const id = `note-${Date.now()}`;
    const db = getDb();
    db.runSync(
      "INSERT INTO notes (id, title, content, created_at) VALUES (?, ?, ?, ?)",
      [id, title, content, Date.now()],
    );
    indexNoteForRetrieval(id, title, content);
    return { ok: true, message: "Note created.", payload: { id } };
  },
};

export const searchNotesTool: Tool = {
  name: "notes.search",
  description: "Search notes by title/content text matching",
  keywords: ["find note", "search note"],
  params: { required: ["query"] },
  execute: async (params) => {
    const query = `%${params.query ?? ""}%`;
    const db = getDb();
    const rows = db.getAllSync<{ id: string; title: string }>(
      "SELECT id, title FROM notes WHERE title LIKE ? OR content LIKE ? LIMIT 5",
      [query, query],
    );
    return { ok: true, message: `Found ${rows.length} notes.`, payload: { rows } };
  },
};

