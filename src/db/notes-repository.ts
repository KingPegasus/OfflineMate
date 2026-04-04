import { getDb } from "@/db/database";
import { indexNoteForRetrieval } from "@/context/context-indexer";
import { deleteVectorChunksBySource } from "@/context/vector-store";

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  created_at: number;
}

export function createNote(title: string, content: string) {
  const id = `note-${Date.now()}`;
  const db = getDb();
  db.runSync("INSERT INTO notes (id, title, content, created_at) VALUES (?, ?, ?, ?)", [
    id,
    title,
    content,
    Date.now(),
  ]);
  indexNoteForRetrieval(id, title, content);
  return id;
}

export function listNotes(limit = 20): NoteRow[] {
  const db = getDb();
  return db.getAllSync<NoteRow>(
    "SELECT id, title, content, created_at FROM notes ORDER BY created_at DESC LIMIT ?",
    [limit],
  );
}

export function deleteNote(noteId: string) {
  const db = getDb();
  db.runSync("DELETE FROM notes WHERE id = ?", [noteId]);
  deleteVectorChunksBySource("note", noteId);
}

