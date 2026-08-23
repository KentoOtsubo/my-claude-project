# API Contract: /api/goals

`src/routes/goals.ts`が公開するREST APIの契約。フロントエンド（`public/js/habits.js`）は
本契約に従ってfetch呼び出しを行う。

## 共通のGoalオブジェクト表現（レスポンス）

```json
{
  "id": "7c2e1a90-...",
  "habitId": "3f9c9e0a-...",
  "startDate": "2026-08-01",
  "endDate": "2026-08-31",
  "targetCount": 20,
  "createdAt": "2026-08-24T09:00:00.000Z",
  "updatedAt": "2026-08-24T09:00:00.000Z",
  "actualCount": 10,
  "progressPercent": 50,
  "achieved": false
}
```

`actualCount` / `progressPercent` / `achieved`は`data-model.md`の進捗計算ロジックに
基づき、レスポンス生成時に付加される計算値であり、`goals`テーブルには保存されない。

## GET /api/goals

目標一覧を取得する（User Story 2 / FR-006〜FR-009）。複数習慣をまたいだ全目標を
返す（`habitId`で対象習慣を識別できる）。

- **200 OK**: `Goal[]`（0件の場合は`[]`）

## POST /api/goals

新規目標を設定する（User Story 1 / FR-001〜FR-005）。

- **Body**:
  ```json
  { "habitId": "3f9c9e0a-...", "startDate": "2026-08-01", "endDate": "2026-08-31", "targetCount": 20 }
  ```
- **201 Created**: 作成された`Goal`（進捗フィールド含む）
- **400 Bad Request**: `startDate`が`endDate`より後、`targetCount`が1未満または
  非整数、`startDate`が対象習慣の`createdAt`より前の場合。`{ "error": "..." }`
- **404 Not Found**: `habitId`に対応する習慣が存在しない場合。`{ "error": "..." }`

## PUT /api/goals/:id

目標を編集する（User Story 3 / FR-010）。

- **Params**: `id`（目標ID）
- **Body**: POSTと同じ形式（`habitId`を除き、更新したいフィールドのみでも可。
  `001`のPUT部分更新マージ方針を踏襲、data-model.md参照）
- **200 OK**: 更新後の`Goal`
- **400 Bad Request**: バリデーションエラー時 `{ "error": "..." }`
- **404 Not Found**: `id`に対応する目標が存在しない場合 `{ "error": "..." }`

## DELETE /api/goals/:id

目標を削除する（User Story 3 / FR-011, FR-012）。削除確認UIはフロントエンド側の
責務であり、本APIは確認済みの削除リクエストのみを受け付ける（`001`/`002`と同じ方針）。

- **Params**: `id`（目標ID）
- **204 No Content**: 削除成功
- **404 Not Found**: `id`に対応する目標が存在しない場合 `{ "error": "..." }`
