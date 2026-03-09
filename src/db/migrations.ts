import { initializeSchema } from "@/db/schema";
import { getDb } from "@/db/database";

function hasColumn(tableName: string, columnName: string) {
  const db = getDb();
  const rows = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return rows.some((row) => row.name === columnName);
}

export function runMigrations() {
  initializeSchema();
  const db = getDb();
  if (!hasColumn("vectors", "chunk_order")) {
    db.execSync("ALTER TABLE vectors ADD COLUMN chunk_order INTEGER NOT NULL DEFAULT 0;");
  }
}

