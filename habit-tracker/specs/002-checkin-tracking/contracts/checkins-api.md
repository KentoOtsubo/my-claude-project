# API Contract: /api/habits/:habitId/checkins

`src/routes/checkins.ts`が公開するREST APIの契約。既存の`/api/habits`
（[001-habit-management/contracts/habits-api.md](../../001-habit-management/contracts/habits-api.md)）
のレスポンス拡張も併せて記載する。

## 共通のCheckInオブジェクト表現（レスポンス）

```json
{
  "id": "9c1e2b40-...",
  "habitId": "3f9c9e0a-...",
  "date": "2026-08-07",
  "createdAt": "2026-08-07T09:00:00.000Z"
}
```

## POST /api/habits/:habitId/checkins

チェックインを記録する（User Story 1 / FR-001〜FR-005）。

- **Params**: `habitId`（習慣ID）
- **Body**: `{ "date": "2026-08-07" }`（`date`は省略可、省略時はサーバーの今日の日付）
- **201 Created**: 作成された`CheckIn`
- **400 Bad Request**: `date`が未来日、対象習慣の`createdAt`より前、または同一
  `habitId`+`date`が既に存在する場合。`{ "error": "..." }`
- **404 Not Found**: `habitId`に対応する習慣が存在しない場合。`{ "error": "..." }`

## GET /api/habits/:habitId/checkins

チェックイン履歴を新しい順に取得する（User Story 3 / FR-012）。

- **Params**: `habitId`（習慣ID）
- **200 OK**: `CheckIn[]`（`date`の降順。0件の場合は`[]`）
- **404 Not Found**: `habitId`に対応する習慣が存在しない場合。`{ "error": "..." }`

## DELETE /api/habits/:habitId/checkins/:checkinId

チェックインを取り消す（User Story 3 / FR-006, FR-013）。削除確認UIはフロントエンド
側の責務であり、本APIは確認済みの取り消しリクエストのみを受け付ける（`001`のDELETE
`/api/habits/:id`と同じ方針）。

- **Params**: `habitId`（習慣ID）, `checkinId`（チェックインID）
- **204 No Content**: 取り消し成功
- **404 Not Found**: `habitId`または`checkinId`に対応するデータが存在しない場合。
  `{ "error": "..." }`

## 拡張: GET /api/habits（既存, レスポンスに `currentStreak` を追加）

`001-habit-management`の`GET /api/habits`（フィルタなし・カテゴリ絞り込みの両方）の
レスポンスに含まれる各習慣オブジェクトへ、`currentStreak`（number、User Story 2 /
FR-008〜FR-011, FR-015）フィールドを追加する。

```json
{
  "id": "3f9c9e0a-...",
  "name": "読書",
  "frequencyType": "daily",
  "weeklyDays": [],
  "category": "study",
  "createdAt": "2026-08-07T09:00:00.000Z",
  "updatedAt": "2026-08-07T09:00:00.000Z",
  "currentStreak": 3
}
```

エンドポイントの形式・エラー応答は`001`の契約から変更しない。
