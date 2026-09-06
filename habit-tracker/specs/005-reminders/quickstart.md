# Quickstart: リマインダー

このガイドは、実装完了後に本機能がエンドツーエンドで動作することを検証する手順を
示す。API契約の詳細は[contracts/reminders-api.md](./contracts/reminders-api.md)、
データ構造の詳細は[data-model.md](./data-model.md)を参照。`001-habit-management`の
習慣登録・`002-checkin-tracking`のチェックインが完了している前提。

## 前提条件

- `npm install`済みであること
- `npm test`（vitest run）がすべてパスすること
- 事前に習慣を1件以上登録済みであること

## 1. サーバーを起動する

```powershell
npm run dev
```

## 2. User Story 1 — 今日まだ実行していない習慣に気づく

頻度「毎日」の習慣を2件登録し、1件だけ本日チェックインした状態で:

```powershell
curl http://localhost:3000/api/reminders
```

**期待結果**: 未チェックインの1件だけが配列に含まれることを確認する（spec.md
Acceptance Scenario 1, 2）。頻度「毎週」の習慣で本日が対象外の曜日の場合、その
習慣が含まれないことを確認する（Acceptance Scenario 3）。すべての対象習慣が
チェックイン済みの場合は空配列`[]`が返ることを確認する（Acceptance Scenario 4、
UIでは「今日の習慣はすべて実行済みです」と表示される）。

## 3. User Story 2 — リマインダーからその場でチェックインする

```powershell
curl -X POST http://localhost:3000/api/habits/<habitId>/checkins `
  -H "Content-Type: application/json" -d '{}'
```

**期待結果**: `201`でチェックインが記録され、続けて`GET /api/reminders`を呼ぶと
その習慣が一覧から消えていることを確認する（Acceptance Scenario 1）。同じ習慣に
再度チェックインしようとすると`400`が返り、重複記録されないことを確認する
（Acceptance Scenario 2）。ブラウザ上では、リマインダー一覧のチェックインボタンを
押した際に同様の挙動になることを目視で確認する。

## 4. User Story 3 — 特定の習慣をリマインダー対象から除外する

```powershell
curl -X PUT http://localhost:3000/api/habits/<habitId> `
  -H "Content-Type: application/json" -d '{"reminderEnabled":false}'
```

**期待結果**: 本日未チェックインであっても、対象の習慣が`GET /api/reminders`の
結果に含まれなくなることを確認する（Acceptance Scenario 1）。再度
`{"reminderEnabled":true}`で更新すると一覧に戻ることを確認する（Acceptance
Scenario 2）。新規登録した習慣は、`reminderEnabled`を指定しなくてもデフォルトで
リマインダー対象になっている（`true`）ことを確認する（Acceptance Scenario 3）。

## 5. 自動テストでの検証

上記の手動確認に加え、以下がTDDのエビデンスとして`logs/tdd-run.log`に記録されて
いることを確認する。

```powershell
npm test
```

**期待結果**: `tests/unit/domain/reminder.test.ts`（リマインダー一覧の算出ロジック）
と`tests/integration/reminders.test.ts`（上記シナリオに対応するAPIテスト）が
すべてパスする。既存の`tests/integration/habits.test.ts`も、`reminderEnabled`
フィールド追加後に引き続きパスすることを確認する（デグレードがないことの確認）。
