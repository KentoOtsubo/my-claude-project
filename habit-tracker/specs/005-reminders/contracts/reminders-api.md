# API Contract: /api/reminders と 既存 /api/habits への追加

`src/routes/reminders.ts`が公開するREST APIの契約、および`005`により
`src/routes/habits.ts`（`001-habit-management`）に追加される変更点。フロントエンド
（`public/js/habits.js`）は本契約に従ってfetch呼び出しを行う。

## 既存Habitオブジェクトへの追加フィールド

`GET /api/habits`・`POST /api/habits`・`PUT /api/habits/:id`のレスポンスに含まれる
`Habit`オブジェクトへ、以下のフィールドが追加される（既存フィールドは変更なし）。

```json
{
  "id": "3f9c9e0a-...",
  "name": "読書",
  "frequencyType": "daily",
  "weeklyDays": [],
  "category": "study",
  "reminderEnabled": true,
  "createdAt": "2026-09-06T09:00:00.000Z",
  "updatedAt": "2026-09-06T09:00:00.000Z"
}
```

## POST /api/habits・PUT /api/habits/:id への追加

**Body**に`reminderEnabled`（省略可、省略時は`true`。PUT時は既存値を保持）を
追加で受け付ける。

```json
{ "name": "読書", "reminderEnabled": false }
```

- **400 Bad Request**: `reminderEnabled`が真偽値以外の場合。`{ "error": "..." }`

## GET /api/reminders

本日リマインダー対象の習慣一覧を取得する（User Story 1 / FR-001〜FR-003,
FR-006〜FR-008）。

- **200 OK**: 対象習慣の配列（0件の場合は`[]`）

  ```json
  [
    { "id": "3f9c9e0a-...", "name": "読書", "category": "study" }
  ]
  ```

  - 本日が対象日でない習慣、本日既にチェックイン済みの習慣、
    `reminderEnabled: false`の習慣は含まれない。
  - 習慣・チェックインのいずれも存在しない場合も`200`で`[]`を返す（FR-008）。
    エラーにはならない。

リマインダーからのチェックインは、既存の
`POST /api/habits/:habitId/checkins`（`002-checkin-tracking`）をそのまま使用する
（research.md「3.」参照）。本エンドポイントへの変更はない。
