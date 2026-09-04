# API Contract: /api/reports

`src/routes/reports.ts`が公開するREST APIの契約。フロントエンド
（`public/js/habits.js`）は本契約に従ってfetch呼び出しを行う。既存の
`GET /api/habits`・`GET /api/goals`のレスポンス形式は変更しない。

## GET /api/reports/dashboard

ダッシュボードの集計結果を取得する（User Story 1〜3 / FR-001〜FR-011）。
習慣が1件も登録されていない場合でもエラーにはならず、各配列が空の状態
（`habits: []`, `categories: []`, `goals: []`）で200が返る（FR-011）。

- **200 OK**:

  ```json
  {
    "habits": [
      {
        "habitId": "3f9c9e0a-...",
        "name": "読書",
        "category": "学習",
        "currentStreak": 2,
        "longestStreak": 7,
        "weekly": { "targetDays": 7, "actualDays": 5, "percent": 71 },
        "monthly": { "targetDays": 30, "actualDays": 18, "percent": 60 }
      }
    ],
    "categories": [
      {
        "category": "学習",
        "weekly": { "targetDays": 7, "actualDays": 5, "percent": 71 },
        "monthly": { "targetDays": 30, "actualDays": 18, "percent": 60 }
      }
    ],
    "goals": [
      {
        "goalId": "7c2e1a90-...",
        "habitId": "3f9c9e0a-...",
        "status": "in_progress",
        "actualCount": 10,
        "progressPercent": 50
      }
    ]
  }
  ```

  - `habits[].currentStreak`は既存の`GET /api/habits`と同じ算出方法
    （`002-checkin-tracking`）を用いる。
  - `habits[].weekly`/`monthly`および`categories[].weekly`/`monthly`は
    `data-model.md`の`CompletionRate`/`CategoryCompletionRate`と同じ構造
    （`targetDays`/`actualDays`/`percent`）。
  - `categories`は、習慣が1件も属さないカテゴリを含まない（FR-007）。
  - `goals[].status`は`"in_progress"` | `"achieved"` | `"not_achieved"`の
    いずれか。`"in_progress"`の場合のみ`progressPercent`が意味を持つ
    （達成/未達成の場合も算出値としては返すが、UIでは進行中のみ表示する
    想定、FR-009）。

- 本エンドポイントは参照専用（読み取り専用）であり、`400`/`404`となる
  入力は存在しない（クエリパラメータを取らない）。
