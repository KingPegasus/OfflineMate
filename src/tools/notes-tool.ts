import { getDb } from "@/db/database";
import { indexNoteForRetrieval } from "@/context/context-indexer";
import type { Tool } from "@/tools/tool-registry";

export const createNoteTool: Tool = {
  name: "notes.create",
  description: "Create a note in local SQLite",
  keywords: ["note", "write down", "remember this"],
  execute: async (params) => {
    const title = params.title ?? "Untitled note";
    const content = params.content ?? "";
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

