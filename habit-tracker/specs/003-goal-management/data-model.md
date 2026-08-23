# Data Model: 目標設定・進捗計算

## Entity: 目標（Goal）

spec.md「Key Entities」の目標（Goal）を実装レベルのフィールドに落とし込んだもの。

| フィールド | 型 | 必須 | 検証・制約 | 対応要件 |
|---|---|---|---|---|
| `id` | string（UUID） | ○ | 一意 | - |
| `habitId` | string（UUID） | ○ | `001-habit-management`の`habits.id`を参照 | FR-004 |
| `startDate` | string（`YYYY-MM-DD`） | ○ | `endDate`以前、対象習慣の`createdAt`以降 | FR-002, FR-005 |
| `endDate` | string（`YYYY-MM-DD`） | ○ | `startDate`以降 | FR-002 |
| `targetCount` | number（整数） | ○ | 1以上の整数 | FR-003 |
| `createdAt` | string（ISO 8601） | ○ | 登録時に自動設定 | - |
| `updatedAt` | string（ISO 8601） | ○ | 登録・編集時に自動更新 | - |

### 検証ルール（`src/domain/goal.ts`が担う）

1. `startDate`が`endDate`より後の場合はエラー（FR-002）。
2. `targetCount`が1以上の整数でない場合はエラー（FR-003）。
3. `startDate`が対象習慣の`createdAt`の日付より前の場合はエラー（FR-005）。
4. 編集（PUT）時は既存レコードと送信フィールドをマージした完全な入力に対して
   上記1〜3を再適用する（`001`のPUT部分更新マージ方針を踏襲、research.md「3.」参照）。

### ライフサイクル

作成 → 編集（0回以上）→ 削除のみのシンプルなライフサイクル。「達成」は状態として
保存されず、常に進捗計算時に導出される（下記）。

## 派生値: 進捗（Progress）

永続化されるエンティティではなく、`src/domain/goalProgress.ts`が目標
（`startDate`・`endDate`・`targetCount`）と対象習慣の全チェックインの`date`集合を
入力として都度計算する導出値。

```
calculateGoalProgress(goal: { startDate, endDate, targetCount }, checkinDates: string[]): {
  actualCount: number;
  progressPercent: number; // 0〜100（100を超えない）
  achieved: boolean;
}
```

### 計算ロジック（research.md「2. 進捗計算の設計」参照）

1. `actualCount` = `checkinDates`のうち`startDate`〜`endDate`（両端を含む）に含まれる
   件数（FR-006）。
2. `progressPercent` = `min(100, round(actualCount / targetCount * 100))`（FR-007）。
3. `achieved` = `actualCount >= targetCount`（FR-008）。

## APIレスポンスへの付加

`GET /api/goals`のレスポンスでは、各`Goal`オブジェクトに上記の`actualCount` /
`progressPercent` / `achieved`を付加する。`goals`テーブル自体にはこれらのカラムを
追加しない。

## 永続化スキーマ（`node:sqlite`）

```sql
-- src/repositories/db.ts の接続初期化時に実行（PRAGMA foreign_keys = ON; は002で有効化済み）

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

- `id`はリポジトリ層で`crypto.randomUUID()`により発行する（`001`/`002`と同じパターン）。
- `ON DELETE CASCADE`により、習慣削除時に紐づく全目標が自動的に削除される（FR-014）。
- 同一習慣に対する期間重複の制約は設けない（FR-015、複数目標を許可する）。
