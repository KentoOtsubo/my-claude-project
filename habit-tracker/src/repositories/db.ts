import { neon } from "@neondatabase/serverless";

export interface DbClient {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly')),
    weekly_days TEXT NOT NULL DEFAULT '[]',
    category TEXT NOT NULL DEFAULT 'uncategorized'
      CHECK (category IN ('health', 'work', 'study', 'other', 'uncategorized')),
    reminder_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (habit_id, date)
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    target_count INTEGER NOT NULL CHECK (target_count >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
];

async function ensureSchema(db: DbClient): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.query(statement);
  }
}

function wrapNeon(sql: ReturnType<typeof neon<false, true>>): DbClient {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await sql.query(text, params);
      return { rows: result.rows as T[] };
    },
  };
}

async function createPgliteClient(): Promise<DbClient> {
  // 接続文字列が指定されない場合（ローカルで.env未設定のまま起動した場合等）の
  // フォールバックとして、ネイティブビルド不要なインメモリのPostgres互換エンジン
  // （PGlite）を使う。動的importにより、通常の本番経路（Postgres接続あり）では
  // 読み込まれない。
  const { PGlite } = await import("@electric-sql/pglite");
  const pglite = new PGlite();
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await pglite.query<T>(text, params);
      return { rows: result.rows };
    },
  };
}

/**
 * 接続先のDBクライアントを生成する（research.md「1.」参照）。
 * `connectionString`が指定されていればVercel Postgres（Neon、`@neondatabase/serverless`
 * 経由）、省略時はインメモリのPGliteにフォールバックする。いずれの場合も、返却前に
 * `habits`/`checkins`/`goals`テーブルの冪等なスキーマ初期化を完了させる。
 */
export async function createDatabase(connectionString?: string): Promise<DbClient> {
  const db = connectionString
    ? wrapNeon(neon(connectionString, { fullResults: true }))
    : await createPgliteClient();

  await ensureSchema(db);
  return db;
}
