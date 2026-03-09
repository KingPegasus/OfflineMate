import { getDb, isSqliteVecReady } from "@/db/database";

export function initializeSchema() {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_memory (
      id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vectors (
      id TEXT PRIMARY KEY NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      chunk_order INTEGER NOT NULL DEFAULT 0,
      text_chunk TEXT NOT NULL,
      embedding TEXT NOT NULL
    );
  `);

  if (isSqliteVecReady()) {
    try {
      db.execSync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vectors_idx USING vec0(
          chunk_id TEXT,
          source_type TEXT,
          source_id TEXT,
          chunk_order INTEGER,
          embedding FLOAT[384] distance_metric=cosine,
          +text_chunk TEXT
        );
      `);
    } catch {
      // Keep running with the legacy vectors table if sqlite-vec virtual table creation fails.
    }
  }
}

