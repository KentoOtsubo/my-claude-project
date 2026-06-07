# Data Model: ToDo管理アプリ

**Phase 1 Output** | **Date**: 2026-06-07 | **Plan**: [plan.md](./plan.md)

## エンティティ

### Task（タスク）

| フィールド | 型 | 制約 | 説明 |
|------------|-----|------|------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | 一意識別子 |
| `title` | TEXT | NOT NULL, 空文字・空白のみ不可 | タスクタイトル |
| `completed` | INTEGER | NOT NULL, DEFAULT 0 | 完了状態（0=未完了, 1=完了） |
| `created_at` | INTEGER | NOT NULL | 作成日時（Unixタイムスタンプ・ミリ秒） |

### SQLiteスキーマ

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  completed  INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

---

## バリデーションルール

| ルール | 対象フィールド | 内容 | 根拠 |
|--------|---------------|------|------|
| 空文字禁止 | `title` | 空文字列（`""`）は拒否 | FR-006 |
| 空白のみ禁止 | `title` | `trim()`後に空の場合は拒否 | FR-006 |
| 最大文字数 | `title` | 制限なし（仕様に制約なし）。UIでは長文を省略表示 | spec edge case |
| completed値 | `completed` | 0または1のみ。JavaScript側でboolean↔integerを変換 | SQLite仕様 |

---

## 表示ソート順

仕様書（FR-002）に基づく表示順:

1. **未完了タスク**（`completed = 0`）: `created_at DESC`（新しいものが上）
2. **完了済みタスク**（`completed = 1`）: `created_at DESC`（新しいものが上）

```sql
SELECT * FROM tasks ORDER BY completed ASC, created_at DESC;
```

---

## 状態遷移

```
未完了（completed = 0）
       ↕  （完了トグル操作 FR-003 / ユーザーストーリー2）
完了済み（completed = 1）
```

- 切り替えは1回の操作で行う（FR-003）
- 完了時は一覧下部グループへ移動（FR-002）
- 未完了に戻した場合は未完了グループ先頭へ移動（ユーザーストーリー2-2）

---

## IndexedDB永続化スキーマ

SQLiteデータベース全体をUint8Array（バイナリ）として保存する。

```
IndexedDB: "TodoDB" (version 1)
└── ObjectStore: "database"
    └── Key: "sqlite-db"
        └── Value: Uint8Array（SQLiteデータベースのバイナリダンプ）
```

書き込み操作（CREATE / UPDATE / DELETE）のたびに`db.export()`→IndexedDB保存を実行する。
