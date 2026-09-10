# Data Model: データ永続化基盤の刷新

本機能は新しいエンティティを追加しない。`001`〜`005`で定義済みの3テーブル
（`habits`・`checkins`・`goals`）について、保存先を`node:sqlite`からVercel Postgresへ
移行し、それに伴い必要最小限のスキーマ表記の変更を行う（research.md「5.」参照）。

## テーブル: `habits`

| カラム | SQLite（旧） | Postgres（新） | 変更点 |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `TEXT PRIMARY KEY` | 変更なし |
| `name` | `TEXT NOT NULL` | `TEXT NOT NULL` | 変更なし |
| `frequency_type` | `TEXT NOT NULL CHECK (...)` | `TEXT NOT NULL CHECK (...)` | 変更なし |
| `weekly_days` | `TEXT NOT NULL DEFAULT '[]'` | `TEXT NOT NULL DEFAULT '[]'` | 変更なし（JSON文字列のまま） |
| `category` | `TEXT NOT NULL DEFAULT 'uncategorized' CHECK (...)` | 同左 | 変更なし |
| `reminder_enabled` | `INTEGER NOT NULL DEFAULT 1 CHECK (IN (0,1))` | `BOOLEAN NOT NULL DEFAULT true` | **型変更**: 0/1整数→真偽値。リポジトリ層の手動変換が不要になる |
| `created_at` | `TEXT NOT NULL` | `TEXT NOT NULL` | 変更なし（ISO 8601文字列） |
| `updated_at` | `TEXT NOT NULL` | `TEXT NOT NULL` | 変更なし |

```sql
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
```

## テーブル: `checkins`

型・制約に変更はない。`habit_id`の外部キー制約（`ON DELETE CASCADE`）はPostgresでも
そのまま利用できる。

```sql
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, date)
);
```

## テーブル: `goals`

型・制約に変更はない。

```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## リポジトリ層のインターフェース変更

すべてのリポジトリメソッドが同期（戻り値を直接返す）から非同期（`Promise`を返す）に
変わる。メソッドのシグネチャ自体（引数・論理的な戻り値の型）は変更しない。

```ts
// 変更前（例: HabitRepository）
findAll(category?: Category): Habit[]
findById(id: string): Habit | undefined

// 変更後
findAll(category?: Category): Promise<Habit[]>
findById(id: string): Promise<Habit | undefined>
```

`habitRepository.ts`の`rowToHabit()`は、`reminder_enabled`が既にPostgresドライバに
よって`boolean`型で返るため、`row.reminder_enabled === 1`のような手動変換が不要になり
簡素化される。

## DB接続クライアントの抽象化

`src/repositories/db.ts`は、環境（本番/開発/テスト）に応じて異なるバックエンド
（`@vercel/postgres`または`@electric-sql/pglite`）を返すが、リポジトリ層からは
共通のクエリインターフェースとして扱えるようにする。

```ts
export interface DbClient {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

// 接続文字列が指定されていればVercel Postgres（本番・開発）、
// 指定されていなければテスト用にPGliteのインメモリインスタンスを生成する
export async function createDatabase(connectionString?: string): Promise<DbClient>
```

いずれの実装も、起動時（`createDatabase()`が返す前）に上記3テーブルのスキーマ
初期化（冪等なDDL実行）を完了させる。

## `createApp()`へのDbClient注入

`src/app.ts`の`CreateAppOptions`に、本番・開発用の接続文字列と、テスト用の
`DbClient`直接注入の両方を受け付けるフィールドを追加する。

```ts
export interface CreateAppOptions {
  connectionString?: string; // 本番・開発用（server.tsが使用）
  db?: DbClient;              // テスト用の直接注入（createTestDb()の結果を渡す）
}

export async function createApp(options: CreateAppOptions = {}) {
  const db = options.db ?? await createDatabase(options.connectionString);
  // ...
}
```

`options.db`が指定されればそれをそのまま使用し、`createDatabase()`（接続文字列の
解釈やPGliteフォールバック）を経由しない。これにより、テストは`createTestDb()`
（`tests/integration/testDb.ts`）で生成した`DbClient`を`createApp({ db })`として
直接渡せる。

## APIレスポンスへの影響

なし。`GET /api/habits`等のレスポンスに含まれる`reminderEnabled`フィールドの型は
既に`boolean`（`src/domain/habit.ts`の型定義）であり、DB層の型変更はAPIの
入出力仕様に影響しない（spec.md FR-003）。
