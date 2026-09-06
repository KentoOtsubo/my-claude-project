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
  reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reminder_enabled IN (0, 1)),
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

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

/**
 * `CREATE TABLE IF NOT EXISTS`は既存のテーブルに対しては何もしないため、
 * `001`〜`004`時点で作成済みのローカルDBファイルには`reminder_enabled`列が
 * 存在しない。起動のたびに列の有無を確認し、なければ`ALTER TABLE`で追加する
 * （既存データを保持したままスキーマを追従させる、005で新たに必要になった
 * マイグレーション処理）。
 */
function ensureReminderEnabledColumn(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(habits)").all() as Array<{
    name: string;
  }>;
  const hasColumn = columns.some((column) => column.name === "reminder_enabled");
  if (!hasColumn) {
    db.exec(
      "ALTER TABLE habits ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reminder_enabled IN (0, 1));",
    );
  }
}

export function createDatabase(path: string = ":memory:"): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSyncCtor(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  ensureReminderEnabledColumn(db);
  return db;
}
