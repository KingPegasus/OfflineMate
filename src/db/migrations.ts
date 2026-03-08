import { initializeSchema } from "@/db/schema";

export function runMigrations() {
  initializeSchema();
}

