# habit-tracker

習慣トラッカー&目標管理アプリ（Q2個人プロダクト・仕様駆動開発+TDD実践用）。

## 技術スタック

- Node.js + TypeScript（ES2022 / NodeNext）
- Express（REST API）, `node:sqlite`（組み込みDatabaseSync、ネイティブビルド不要）
- Vitest（unit/integration）+ Supertest
- フロントエンドは `public/` にVanilla HTML/CSS/JS（fetch APIで REST 呼び出し）

## ディレクトリ

- `src/domain/` — 純粋ロジック（ストリーク計算・目標進捗計算など）。TDDの主対象。
- `src/repositories/` — `node:sqlite` によるデータアクセス
- `src/routes/` — Express ルートハンドラ
- `src/app.ts` — Express アプリ組み立て（`createApp()`、supertest から import 可能）
- `src/server.ts` — エントリポイント
- `tests/unit/` `tests/integration/`
- `logs/tdd-run.log` — PostToolUse hookによるテスト自動実行ログ（TDD運用ログのエビデンス）

## TDD自動化

`.claude/settings.json` の PostToolUse hook（`.claude/hooks/run-tests-on-change.ps1`）が、
`src/**/*.ts` または `tests/**/*.ts` の Edit/Write 後に自動で `npm test`（vitest run）を実行し、
結果を `logs/tdd-run.log` にタイムスタンプ付きで追記する。

## Spec Kit

機能追加は `/speckit-constitution`（初回のみ・Test-First原則を明記）→
`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` の順で進める。
各機能の spec.md には「テスト駆動で実装する」旨を明記し、`/speckit-tasks` が
`### Tests for User Story N` セクションを実タスクとして生成するようにする。

計画: 001-habit-management → 002-checkin-tracking → 003-goal-management →
004-reports-dashboard → 005-reminders（任意・ストレッチ）
