# Data Model: リマインダー

## エンティティ拡張: 習慣（Habit）への`reminderEnabled`追加

`001-habit-management`で定義済みの習慣（Habit）に、以下のフィールドを追加する。

| フィールド | 型 | 必須 | 検証・制約 | 対応要件 |
|---|---|---|---|---|
| `reminderEnabled` | boolean | ○（省略時`true`） | - | FR-006, FR-007 |

### 検証ルール（`src/domain/habit.ts`が担う）

1. `reminderEnabled`が入力に含まれない場合は`true`（有効）をデフォルト値とする
   （FR-007）。新規登録（POST）・部分更新（PUT、フィールド省略時）のいずれでも
   同じ既定値を適用する。
2. `reminderEnabled`が指定される場合は真偽値（`true`/`false`）でなければならない。
3. 編集（PUT）時は既存レコードと送信フィールドをマージした完全な入力に対して
   上記を再適用する（`001`のPUT部分更新マージ方針を踏襲）。

### ライフサイクル

`reminderEnabled`は習慣自体の属性であり、独立したライフサイクルを持たない。習慣が
削除されれば自動的に消える（FR-009、`habits`テーブルの行削除に伴う）。

## 派生値: リマインダー一覧（ReminderList）

永続化されるエンティティではなく、`src/domain/reminder.ts`が習慣（頻度設定・
作成日・`reminderEnabled`）の集合・各習慣のチェックイン日付集合・「今日」の日付を
入力として都度計算する導出値。

```
calculateReminderList(
  habits: Array<{
    id, name, category, frequencyType, weeklyDays, createdAt, reminderEnabled,
    checkinDates: string[],
  }>,
  today: string,
): Array<{ id, name, category }>  // 本日リマインダー対象の習慣一覧
```

### 算出ロジック（research.md「2.」参照）

1. 習慣の`reminderEnabled`が`false`の場合は結果から除外する（FR-006相当）。
2. 本日（`today`）が`targetDay.ts`の`isTargetDay`判定で対象日でない場合は除外する
   （FR-002）。
3. 本日`checkinDates`に含まれている（＝チェックイン済み）場合は除外する（FR-003）。
4. 上記いずれにも該当しない習慣を、登録順（`createdAt`昇順）でリマインダー一覧
   として返す（FR-001）。

## APIレスポンスへの組み立て

`GET /api/reminders`のレスポンスでは、上記のリマインダー一覧をそのまま返す。
`GET /api/habits`・`PUT /api/habits/:id`のレスポンスでは、各`Habit`オブジェクトに
`reminderEnabled`フィールドを含める。詳細は
[contracts/reminders-api.md](./contracts/reminders-api.md)を参照。

## 永続化スキーマの変更（`node:sqlite`）

```sql
-- src/repositories/db.ts のCREATE TABLE IF NOT EXISTS habitsに追加するカラム
-- (新規テーブルではなく既存のhabitsテーブルへのカラム追加)

reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reminder_enabled IN (0, 1))
```

- SQLiteには真偽型がないため、既存プロジェクトの慣例（`node:sqlite`が返す値を
  ドメイン層の型に変換するリポジトリ層のマッピング）に従い、`0`/`1`の整数値で
  永続化し、`habitRepository.ts`で`boolean`との相互変換を行う。
- `DEFAULT 1`により、本機能導入前に登録済みの既存習慣（マイグレーション相当）も
  自動的に「有効」として扱われる（FR-007）。
