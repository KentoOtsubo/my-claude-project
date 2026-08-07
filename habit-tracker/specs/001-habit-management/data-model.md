# Data Model: 習慣管理（CRUD・カテゴリ分類）

## Entity: 習慣（Habit）

spec.md「Key Entities」の習慣（Habit）を実装レベルのフィールドに落とし込んだもの。

| フィールド | 型 | 必須 | デフォルト | 検証・制約 | 対応要件 |
|---|---|---|---|---|---|
| `id` | string（UUID） | ○ | 生成時に自動発行 | 一意 | - |
| `name` | string | ○ | - | 1〜100文字 | FR-002 |
| `frequencyType` | `"daily"` \| `"weekly"` | - | `"daily"` | このいずれかの値のみ | FR-003, FR-004 |
| `weeklyDays` | number[]（0=日曜〜6=土曜） | `frequencyType`が`"weekly"`のとき必須 | `frequencyType`が`"daily"`のときは空配列 | `"weekly"`のとき要素数1以上、値は0〜6の整数、重複不可 | FR-003, FR-005 |
| `category` | `"health"` \| `"work"` \| `"study"` \| `"other"` \| `"uncategorized"` | - | `"uncategorized"` | このいずれかの値のみ | FR-006 |
| `createdAt` | string（ISO 8601） | ○ | 登録時に自動設定 | - | - |
| `updatedAt` | string（ISO 8601） | ○ | 登録・編集時に自動更新 | - | - |

### 検証ルール（`src/domain/habit.ts`が担う）

1. `name`が空文字・空白のみ、または101文字以上の場合はエラー（FR-002）。
2. `frequencyType`が省略された場合は`"daily"`を設定する（FR-004）。
3. `frequencyType`が`"weekly"`で`weeklyDays`が空、または未指定の場合はエラー（FR-005）。
4. `frequencyType`が`"daily"`の場合、`weeklyDays`は無視して空配列として扱う。
5. `category`が省略された場合は`"uncategorized"`を設定する（FR-006）。
6. `category`が定義済みの5値以外の場合はエラー。

### 部分更新（PUT）時のマージ方針

`PUT /api/habits/:id`で一部フィールドのみ送信された場合、リポジトリ層は既存レコードの値と
送信されたフィールドをマージした完全なオブジェクトを構築し、その上で上記の検証ルール
（1〜6）を再適用する。例えば`frequencyType`のみ`"weekly"`に変更し`weeklyDays`を省略した
場合、既存の`weeklyDays`をそのまま用いて検証する（既存が空配列であれば検証ルール3により
エラーとなる）。

### ライフサイクル・状態遷移

[Clarifications](./spec.md#clarifications)で確定した通り、習慣に中間状態（アーカイブ等）は
存在しない。登録（作成）→ 編集（0回以上）→ 削除（物理削除、終端）のみのシンプルな
ライフサイクルであり、状態遷移図は不要。

### 関連（Relationships）

本フェーズでは他エンティティとの関連はない。チェックイン記録（`002-checkin-tracking`）は
将来的に`habitId`で本エンティティを参照する想定だが、本フェーズの実装対象外。

## 永続化スキーマ（`node:sqlite`）

```sql
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
```

- `weekly_days`はJSON配列文字列（例: `"[1,3,5]"`）としてTEXTカラムに保存する
  （憲章原則Vのシンプルさに基づき、正規化した別テーブルは本フェーズでは作らない）。
- `id`はリポジトリ層で`crypto.randomUUID()`（Node.js組み込み）により発行する。
