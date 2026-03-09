import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;
let sqliteVecLoaded = false;

function tryLoadSqliteVec(database: SQLite.SQLiteDatabase) {
  try {
    const extensions = (SQLite as unknown as { bundledExtensions?: Record<string, { libPath: string; entryPoint?: string }> })
      .bundledExtensions;
    const extension = extensions?.["sqlite-vec"];
    if (!extension) return;

    const dbWithExtensions = database as unknown as {
      loadExtensionSync?: (libPath: string, entryPoint?: string) => void;
    };
    if (typeof dbWithExtensions.loadExtensionSync === "function") {
      dbWithExtensions.loadExtensionSync(extension.libPath, extension.entryPoint);
      sqliteVecLoaded = true;
    }
  } catch {
    sqliteVecLoaded = false;
  }
}

export function getDb() {
  if (!db) {
    db = SQLite.openDatabaseSync("offlinemate.db");
    tryLoadSqliteVec(db);
  }
  return db;
}

export function isSqliteVecReady() {
  return sqliteVecLoaded;
}

