import { PGlite } from "@electric-sql/pglite";

/**
 * リポジトリ層が依存する共通のDBクライアントインターフェース
 * （`src/repositories/db.ts`の`DbClient`と同一の契約、data-model.md参照）。
 */
export interface DbClient {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

/**
 * ディレクトリ永続化されたPGliteインスタンスを明示的に閉じる（flushする）ための
 * 拡張型。ディレクトリを削除する前に必ず`close()`を呼び、内部の非同期ファイル
 * 書き込みが完了した状態にしてから削除する（そうしないと書き込み中のファイルが
 * 消え、`ErrnoError`が非同期に発生することがある）。
 */
export interface CloseableDbClient extends DbClient {
  close(): Promise<void>;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly')),
  weekly_days TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'uncategorized'
    CHECK (category IN ('health', 'work', 'study', 'other', 'uncategorized')),
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
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

function wrapPglite(pglite: PGlite): CloseableDbClient {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await pglite.query<T>(text, params);
      return { rows: result.rows };
    },
    async close() {
      await pglite.close();
    },
  };
}

/**
 * テスト用のPGlite（インプロセスのPostgres互換エンジン）ベースのDbClientを生成する
 * （research.md「2.」参照）。
 *
 * - `dataDir`省略時: テストごとに独立したインメモリインスタンス（通常の機能テスト用）
 * - `dataDir`指定時: 同じディレクトリを指定して複数回呼び出すことで、
 *   「プロセス再起動後もデータが残っている」ことを検証できる（永続性テスト専用）。
 *   この場合、テスト側は使い終わったら`close()`を呼んでからディレクトリを
 *   削除すること。
 */
export async function createTestDb(
  options: { dataDir?: string } = {},
): Promise<CloseableDbClient> {
  const pglite = options.dataDir ? new PGlite(options.dataDir) : new PGlite();
  // SCHEMA_SQLはセミコロン区切りの複数文からなるため、単一文+パラメータ前提の
  // query()ではなく複数文実行用のexec()を使う。
  await pglite.exec(SCHEMA_SQL);
  return wrapPglite(pglite);
}

/**
 * テスト間でDBの中身をクリアする。PGliteインスタンス自体の生成コスト（WASM起動、
 * 実測で1インスタンスあたり約1〜1.8秒）が高いため、インスタンス自体は
 * `beforeAll`等でファイルごとに1回だけ生成し、各テストの前ではこの関数で
 * データだけを削除する（`habits`の削除で`checkins`/`goals`もON DELETE CASCADEで
 * 連鎖削除される）。
 */
export async function resetTestDb(db: DbClient): Promise<void> {
  await db.query("DELETE FROM habits");
}
