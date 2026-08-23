# Quickstart: 目標設定・進捗計算

このガイドは、実装完了後に本機能がエンドツーエンドで動作することを検証する手順を示す。
API契約の詳細は[contracts/goals-api.md](./contracts/goals-api.md)、データ構造の詳細は
[data-model.md](./data-model.md)を参照。`001-habit-management`の習慣登録・
`002-checkin-tracking`のチェックインが完了している前提。

## 前提条件

- `npm install`済みであること
- `npm test`（vitest run）がすべてパスすること
- 事前に習慣を1件登録済みであること

## 1. サーバーを起動する

```powershell
npm run dev
```

## 2. User Story 1 — 目標を設定する

```powershell
curl -X POST http://localhost:3000/api/goals `
  -H "Content-Type: application/json" `
  -d '{"habitId":"<habitId>","startDate":"2026-08-01","endDate":"2026-08-31","targetCount":20}'
```

**期待結果**: `201`で作成された目標（`actualCount`/`progressPercent`/`achieved`を含む）
が返る（spec.md Acceptance Scenario 1）。

`startDate`に`endDate`より後の日付を指定すると`400`が返り、登録されないことを確認する
（Acceptance Scenario 2）。`targetCount`に`0`を指定した場合も`400`が返ることを確認する
（Acceptance Scenario 3）。

## 3. User Story 2 — 目標の進捗を確認する

対象習慣に対象期間内で5回チェックインした状態（`002`のquickstart.md参照）で:

```powershell
curl http://localhost:3000/api/goals
```

**期待結果**: `targetCount`が10の目標であれば`progressPercent`が`50`と表示される
（Acceptance Scenario 1）。目標回数以上チェックインした場合は`progressPercent`が
`100`・`achieved`が`true`になることを確認する（Acceptance Scenario 2）。チェックイン
が0件の場合は`progressPercent`が`0`であることを確認する（Acceptance Scenario 3）。

## 4. User Story 3 — 目標を編集・削除する

```powershell
curl -X PUT http://localhost:3000/api/goals/<goalId> `
  -H "Content-Type: application/json" `
  -d '{"targetCount":5}'
```

**期待結果**: `200`で更新後の目標が返り、`progressPercent`が新しい`targetCount`を
基準に再計算されていることを確認する（Acceptance Scenario 1）。

```powershell
curl -X DELETE http://localhost:3000/api/goals/<goalId>
```

**期待結果**: `204`が返り、`GET /api/goals`から該当の目標が消えていることを確認する。
存在しない`id`に対して同じ操作を行うと`404`が返ることも確認する（Acceptance
Scenario 4）。

加えて、ブラウザで`public/index.html`を開き、目標の削除ボタンを押した際に確認
ダイアログが表示されること、キャンセルした場合は削除されずに一覧に残ること
（FR-012, SC-005）を目視で確認する（`001`/`002`の削除確認と同様の理由で、
フロントエンドUIは自動テスト対象外のため）。

## 5. 自動テストでの検証

上記の手動確認に加え、以下がTDDのエビデンスとして`logs/tdd-run.log`に記録されている
ことを確認する。

```powershell
npm test
```

**期待結果**: `tests/unit/domain/goal.test.ts`・`tests/unit/domain/goalProgress.test.ts`
（検証・進捗計算ロジック）と`tests/integration/goals.test.ts`（上記シナリオに対応する
APIテスト）がすべてパスする。
