import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";

// Vite/vitestの静的import解析が`node:`プレフィックス専用の組み込みモジュール
// （node:sqlite）を正しく解決できないため、createRequireで実行時に読み込む。
const { DatabaseSync: DatabaseSyncCtor } = createRequire(import.meta.url)(
  "node:sqlite",
) as { DatabaseSync: typeof DatabaseSync };

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly')),
  weekly_days TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'uncategorized'
    CHECK (category IN ('health', 'work', 'study', 'other', 'uncategorized')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, date)
);
`;

export function createDatabase(path: string = ":memory:"): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSyncCtor(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  return db;
}
