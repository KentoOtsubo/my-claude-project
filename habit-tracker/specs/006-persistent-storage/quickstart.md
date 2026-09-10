# Quickstart: データ永続化基盤の刷新

このガイドは、実装完了後に本機能がエンドツーエンドで動作することを検証する手順を
示す。データ構造の詳細は[data-model.md](./data-model.md)を参照。既存の
`001-habit-management`〜`005-reminders`の機能がすべて完了している前提。

本機能はAPIの入出力仕様を変更しないため、`contracts/`は`001`〜`005`の各
`specs/*/contracts/*.md`をそのまま参照する。

## 前提条件

- `npm install`済みであること（`@vercel/postgres`・`@electric-sql/pglite`・
  `express-async-errors`を含む）
- Vercelダッシュボードで、開発用（Development）と本番用（Production）で別々の
  Vercel Postgresデータベースが用意されていること
- ローカルの`.env`ファイルに、開発用DBの接続文字列が`DATABASE_URL`として
  設定されていること（`.env`はgit管理対象外）
- `npm test`（vitest run）がすべてパスすること

## 1. サーバーを起動する

```powershell
npm run dev
```

## 2. User Story 1 — 記録したデータが消えずに残り続ける

```powershell
curl -X POST http://localhost:3000/api/habits `
  -H "Content-Type: application/json" -d '{"name":"読書"}'
curl -X POST http://localhost:3000/api/habits/<habitId>/checkins `
  -H "Content-Type: application/json" -d '{}'
```

**期待結果**: `npm run dev`のプロセスを一度停止し、再度`npm run dev`で起動し直しても、
`GET /api/habits`・`GET /api/habits/<habitId>/checkins`で登録した習慣・チェックインが
そのまま返ることを確認する（spec.md Acceptance Scenario 1）。

## 3. User Story 2 — 動作確認用のデータ操作が本番データに影響しない

```powershell
curl http://localhost:3000/api/habits
```

**期待結果**: 上記2.でローカル開発用DBに登録した習慣が、Vercelにデプロイ済みの
本番URL（例: `https://<project>.vercel.app/api/habits`）では表示されないことを確認する
（Acceptance Scenario 1）。逆に、本番環境で操作を行ってもローカルのDBには反映
されないことも確認する（Acceptance Scenario 2）。

## 4. 既存機能の回帰確認

`001`〜`005`の各quickstart.mdに記載された手動確認シナリオ（習慣のCRUD、チェックイン、
目標設定・進捗、ダッシュボード、リマインダー）を一通り実行し、保存先の変更後も
同じ結果になることを確認する（spec.md SC-004）。

## 5. 自動テストでの検証

```powershell
npm test
```

**期待結果**: 既存の全統合テスト（`tests/integration/*.test.ts`）が、PGliteベースの
テスト用DBに対して実行され、すべてパスする。ネットワーク接続なしで完了することを
確認する（研究ノート「2.」参照）。`logs/tdd-run.log`に実行記録が残ることも確認する。
