# API Contract: /api/habits

`src/routes/habits.ts`が公開するREST APIの契約。フロントエンド（`public/js/habits.js`）は
本契約に従ってfetch呼び出しを行う。

## 共通のHabitオブジェクト表現（レスポンス）

```json
{
  "id": "3f9c9e0a-...",
  "name": "読書",
  "frequencyType": "daily",
  "weeklyDays": [],
  "category": "study",
  "createdAt": "2026-08-07T09:00:00.000Z",
  "updatedAt": "2026-08-07T09:00:00.000Z"
}
```

## GET /api/habits

一覧取得。カテゴリで絞り込み可能（User Story 3 / FR-008）。

- **Query**: `category`（省略可。省略時は全件。値は`health`|`work`|`study`|`other`|
  `uncategorized`のいずれか）
- **200 OK**: `Habit[]`（0件の場合は`[]`）
- **400 Bad Request**: `category`が不正な値の場合 `{ "error": "..." }`

## POST /api/habits

新規登録（User Story 1 / FR-001）。

- **Body**:
  ```json
  { "name": "読書", "frequencyType": "daily", "weeklyDays": [], "category": "study" }
  ```
  `frequencyType`・`weeklyDays`・`categoryは省略可（省略時はデフォルト値、data-model.md参照）。
- **201 Created**: 作成された`Habit`
- **400 Bad Request**: `name`未指定・文字数超過、`frequencyType`が`"weekly"`で
  `weeklyDays`が空、`category`が不正な値の場合。`{ "error": "..." }`

## PUT /api/habits/:id

編集（User Story 2 / FR-009）。

- **Params**: `id`（習慣ID）
- **Body**: POSTと同じ形式（更新したいフィールドのみでも可）
- **200 OK**: 更新後の`Habit`
- **400 Bad Request**: バリデーションエラー時 `{ "error": "..." }`
- **404 Not Found**: `id`に対応する習慣が存在しない場合（FR-012） `{ "error": "..." }`

## DELETE /api/habits/:id

削除（User Story 2 / FR-010, FR-011）。削除確認UIはフロントエンド側の責務であり、本APIは
確認済みの削除リクエストのみを受け付ける。

- **Params**: `id`（習慣ID）
- **204 No Content**: 削除成功
- **404 Not Found**: `id`に対応する習慣が存在しない場合（FR-012） `{ "error": "..." }`
