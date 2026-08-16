# Data Model: チェックイン・ストリーク計算

## Entity: チェックイン（CheckIn）

spec.md「Key Entities」のチェックイン（CheckIn）を実装レベルのフィールドに落とし込んだもの。

| フィールド | 型 | 必須 | 検証・制約 | 対応要件 |
|---|---|---|---|---|
| `id` | string（UUID） | ○ | 一意 | - |
| `habitId` | string（UUID） | ○ | `001-habit-management`の`habits.id`を参照 | - |
| `date` | string（`YYYY-MM-DD`） | ○ | 未来日不可、習慣の`createdAt`より前不可、同一`habitId`+`date`の重複不可 | FR-001〜FR-005 |
| `createdAt` | string（ISO 8601） | ○ | 記録時に自動設定 | - |

### 検証ルール（`src/domain/checkin.ts`が担う）

1. `date`が省略された場合はサーバーの今日の日付を設定する（FR-002）。
2. `date`が今日より未来の場合はエラー（FR-003）。
3. `date`が対象習慣の`createdAt`の日付より前の場合はエラー（FR-004）。
4. 同一`habitId`・同一`date`の組み合わせで既にチェックインが存在する場合はエラー
   （FR-005）。DB層でも`UNIQUE(habit_id, date)`制約により二重に防止する。

### ライフサイクル

作成（記録）→ 取り消し（削除）のみのシンプルなライフサイクル。編集（日付変更）は
本フェーズのスコープ外とする（誤って記録した場合は取り消して記録し直す）。

## 派生値: ストリーク（Streak）

永続化されるエンティティではなく、`src/domain/streak.ts`が習慣（`frequencyType`・
`weeklyDays`・`createdAt`）とその全チェックインの`date`集合、および「今日」の日付を
入力として都度計算する導出値。

```
calculateCurrentStreak(habit: { frequencyType, weeklyDays, createdAt }, checkinDates: string[], today: string): number
```

### 計算ロジック（research.md「2. ストリーク計算アルゴリズム」参照）

- **毎日**: 今日を含め過去に向かって1日ずつ走査し、連続してチェックインが存在する
  日数を数える。今日が未チェックインの場合は今日を除外し昨日から数え始める
  （FR-009, FR-011）。
- **毎週**: `weeklyDays`に該当する日付のみを対象日とし、それ以外の日は走査をスキップ
  する（ストリークの継続・中断に影響しない、FR-010）。今日が対象日かつ未チェックイン
  の場合は今日を除外し、直近の対象日から数え始める（FR-011）。
- 習慣の`createdAt`の日付より前には遡らない（作成前は境界として扱い、ストリークを
  断ち切る要因とはみなさない）。
- 頻度が変更された場合も、常に習慣の「現在の」`frequencyType`/`weeklyDays`を用いて
  全チェックイン履歴を再計算する（Clarifications, FR-015）。

## APIレスポンスへの付加

`001-habit-management`の`GET /api/habits`（一覧・カテゴリ絞り込み）のレスポンスに、
各習慣オブジェクトへ`currentStreak: number`フィールドを追加する。`Habit`エンティティ
自体（DBスキーマ・`habits`テーブル）に変更はなく、ルート層（`src/routes/habits.ts`）が
`habitRepository`と`checkinRepository`の結果を組み合わせ、`streak.ts`で計算した値を
レスポンス生成時に付加する。

## 永続化スキーマ（`node:sqlite`）

```sql
-- src/repositories/db.ts の接続初期化時に実行
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, date)
);
```

- `id`はリポジトリ層で`crypto.randomUUID()`により発行する（`001`のHabitRepositoryと
  同じパターン）。
- `ON DELETE CASCADE`により、習慣削除時に紐づく全チェックインが自動的に削除される
  （FR-014）。
