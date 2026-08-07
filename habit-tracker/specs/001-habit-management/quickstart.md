# Quickstart: 習慣管理（CRUD・カテゴリ分類）

このガイドは、実装完了後に本機能がエンドツーエンドで動作することを検証する手順を示す。
API契約の詳細は[contracts/habits-api.md](./contracts/habits-api.md)、データ構造の詳細は
[data-model.md](./data-model.md)を参照。

## 前提条件

- `npm install`済みであること
- `npm test`（vitest run）がすべてパスすること

## 1. サーバーを起動する

```powershell
npm run dev
```

## 2. User Story 1 — 習慣を登録する

```powershell
curl -X POST http://localhost:3000/api/habits `
  -H "Content-Type: application/json" `
  -d '{"name":"読書","frequencyType":"daily","category":"study"}'
```

**期待結果**: `201`で登録した習慣（`id`付き）が返る。続けて`GET /api/habits`を呼ぶと
一覧に「読書」が含まれる（spec.md Acceptance Scenario 1）。

名前を省略して同じリクエストを送ると`400`が返り、登録されないことを確認する
（spec.md Acceptance Scenario 2）。

## 3. User Story 2 — 一覧確認・編集・削除

```powershell
curl http://localhost:3000/api/habits
```

**期待結果**: 登録済みの習慣が名前・頻度・カテゴリとともに一覧で返る。

```powershell
curl -X PUT http://localhost:3000/api/habits/<id> `
  -H "Content-Type: application/json" `
  -d '{"frequencyType":"weekly","weeklyDays":[1,3,5]}'
```

**期待結果**: `200`で更新後の内容が返り、`GET /api/habits`で変更が反映されていることを
確認する。

```powershell
curl -X DELETE http://localhost:3000/api/habits/<id>
```

**期待結果**: `204`が返り、`GET /api/habits`から該当の習慣が消えていることを確認する。
存在しない`id`に対して同じ操作を行うと`404`が返ることも確認する。

## 4. User Story 3 — カテゴリで絞り込む

異なるカテゴリの習慣を複数登録したうえで:

```powershell
curl "http://localhost:3000/api/habits?category=health"
```

**期待結果**: `category=health`の習慣のみが返る。クエリなしの`GET /api/habits`ではすべて
の習慣が返ることを確認する。

## 5. 自動テストでの検証

上記の手動確認に加え、以下がTDDのエビデンスとして`logs/tdd-run.log`に記録されていることを
確認する。

```powershell
npm test
```

**期待結果**: `tests/unit/domain/habit.test.ts`（頻度・カテゴリの検証ロジック）と
`tests/integration/habits.test.ts`（上記シナリオに対応するAPIテスト）がすべてパスする。
