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


/** How many "remember …" memories are saved on the device (for Settings). */
export function countImportantMemories(): number {
  const db = getDb();
  return db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM conversation_memory")?.n ?? 0;
}

/** Delete every saved memory. Deleting a chat leaves its memories, so Settings offers this separately. Returns the count removed. */
export function clearImportantMemories(): number {
  const db = getDb();
  const count = countImportantMemories();
  db.runSync("DELETE FROM conversation_memory");
  return count;
}
