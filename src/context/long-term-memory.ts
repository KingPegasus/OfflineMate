import { getDb } from "@/db/database";

export function saveImportantMemory(content: string) {
  const db = getDb();
  const id = `mem-${Date.now()}`;
  db.runSync("INSERT INTO conversation_memory (id, content, created_at) VALUES (?, ?, ?)", [
    id,
    content,
    Date.now(),
  ]);
  return id;
}

export function getImportantMemories(limit = 10) {
  const db = getDb();
  return db.getAllSync<{ id: string; content: string; created_at: number }>(
    "SELECT id, content, created_at FROM conversation_memory ORDER BY created_at DESC LIMIT ?",
    [limit],
  );
}

