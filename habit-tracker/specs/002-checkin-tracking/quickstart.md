# Quickstart: チェックイン・ストリーク計算

このガイドは、実装完了後に本機能がエンドツーエンドで動作することを検証する手順を示す。
API契約の詳細は[contracts/checkins-api.md](./contracts/checkins-api.md)、データ構造の
詳細は[data-model.md](./data-model.md)を参照。`001-habit-management`の習慣登録
（[quickstart.md](../001-habit-management/quickstart.md)）が完了している前提。

## 前提条件

- `npm install`済みであること
- `npm test`（vitest run）がすべてパスすること
- 事前に習慣を1件登録済みであること（頻度「毎日」の習慣を例とする）

## 1. サーバーを起動する

```powershell
npm run dev
```

## 2. User Story 1 — 今日の習慣をチェックインする

```powershell
curl -X POST http://localhost:3000/api/habits/<habitId>/checkins `
  -H "Content-Type: application/json" `
  -d '{}'
```

**期待結果**: `201`で今日の日付の`CheckIn`が返る。続けて`GET /api/habits`を呼ぶと、
対象習慣の`currentStreak`が1以上になっていることを確認する（spec.md Acceptance
Scenario 1）。

同じリクエストをもう一度送ると`400`が返り、重複登録されないことを確認する
（Acceptance Scenario 2）。

習慣の作成日より前の日付を指定して同様のリクエストを送ると`400`が返ることも確認する
（Acceptance Scenario 3）。

## 3. User Story 2 — 現在のストリークを確認する

頻度「毎日」の習慣に対して、今日を含め3日連続で`date`を変えながらチェックインを
登録したうえで:

```powershell
curl http://localhost:3000/api/habits
```

**期待結果**: 対象習慣の`currentStreak`が`3`になっている（Acceptance Scenario 1）。

1日分のチェックインを抜かした状態（例: 2日前と今日のみ記録、昨日は未記録）で同じ
リクエストを送ると、`currentStreak`が`0`になっていることを確認する（Acceptance
Scenario 3）。

頻度「毎週（月・水・金）」の習慣についても同様に、対象外の曜日（火曜・木曜・
土曜・日曜）を挟んでもストリークが途切れないことを確認する（Acceptance Scenario 4）。

## 4. User Story 3 — チェックイン履歴の確認と取り消し

```powershell
curl http://localhost:3000/api/habits/<habitId>/checkins
```

**期待結果**: 記録済みのチェックインが`date`の新しい順に返る（Acceptance Scenario 1）。

```powershell
curl -X DELETE http://localhost:3000/api/habits/<habitId>/checkins/<checkinId>
```

**期待結果**: `204`が返り、`GET /api/habits/<habitId>/checkins`から該当のチェックインが
消え、`GET /api/habits`の`currentStreak`が取り消し後の値に再計算されていることを
確認する（Acceptance Scenario 2）。存在しない`checkinId`に対して同じ操作を行うと`404`
が返ることも確認する（Acceptance Scenario 4）。

加えて、ブラウザで`public/index.html`を開き、チェックインの取り消しボタンを押した際に
確認ダイアログが表示されること、キャンセルした場合は取り消されずに履歴に残ること
（FR-007, SC-005）を目視で確認する（`001-habit-management`の削除確認と同様の理由で、
フロントエンドUIは自動テスト対象外のため）。

## 5. 自動テストでの検証

上記の手動確認に加え、以下がTDDのエビデンスとして`logs/tdd-run.log`に記録されている
ことを確認する。

```powershell
npm test
```

**期待結果**: `tests/unit/domain/checkin.test.ts`・`tests/unit/domain/streak.test.ts`
（検証・ストリーク計算ロジック）と`tests/integration/checkins.test.ts`・拡張された
`tests/integration/habits.test.ts`（上記シナリオに対応するAPIテスト）がすべてパスする。
