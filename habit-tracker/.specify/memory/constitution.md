<!--
Sync Impact Report
Version change: [TEMPLATE] → 1.0.0
Modified principles (initial ratification — all 5 principles newly defined from placeholders):
  - [PRINCIPLE_1_NAME] → I. テスト駆動開発（Test-First, NON-NEGOTIABLE）
  - [PRINCIPLE_2_NAME] → II. 仕様駆動ワークフローの遵守
  - [PRINCIPLE_3_NAME] → III. ドメイン中心アーキテクチャ
  - [PRINCIPLE_4_NAME] → IV. ドキュメントは日本語で記述
  - [PRINCIPLE_5_NAME] → V. シンプルさとエビデンスに基づく進行
Added sections:
  - 技術スタックの制約（Section 2）
  - 開発ワークフローと品質ゲート（Section 3）
  - Governance（改訂手順・バージョニング方針・コンプライアンスレビューを明記）
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Checkゲートは既に汎用的な記述で本憲章と整合（変更不要と確認済み）
  ✅ .specify/templates/spec-template.md — 技術非依存の記述のため変更不要と確認済み
  ✅ .specify/templates/tasks-template.md — 「Tests for User Story N」セクションは条件付き生成の仕組みが既にあり、spec.mdでのTDD明記により実タスク化される設計（原則I）と整合（変更不要と確認済み）
  ✅ CLAUDE.md — 既に本憲章の内容（TDD自動化・Spec Kit順序・技術スタック・日本語ドキュメント方針）と整合していることを確認済み（変更不要）
  ✅ .claude/skills/speckit-*/SKILL.md — Claude Code向けスキルとして一貫しており、エージェント固有の古い参照は見つからず（変更不要と確認済み）
Follow-up TODOs: none
-->

# habit-tracker Constitution

## Core Principles

### I. テスト駆動開発（Test-First, NON-NEGOTIABLE）

テストを先に書き、実行して失敗することを確認してから実装する（Red-Green-Refactor）。
`src/**/*.ts` または `tests/**/*.ts` の変更は、PostToolUseフック
（`.claude/hooks/run-tests-on-change.ps1`）により自動的に `npm test`（vitest run）が
実行され、結果が `logs/tdd-run.log` にタイムスタンプ付きで記録される。この自動実行の
仕組みを無効化・回避してはならない。各機能の `spec.md` には「テスト駆動で実装する」旨を
明記し、`/speckit-tasks` が `### Tests for User Story N` セクションを省略可能な項目ではなく
実タスクとして生成することを保証する。テストを書かずに実装を進めることは許可されない。

**Rationale**: Q2目標の「テストコードを自動生成・自動実行するTDDの仕組みを構築し開発フローに
組み込む」を達成する中核原則であり、`logs/tdd-run.log` を運用エビデンスとして提出するため。

### II. 仕様駆動ワークフローの遵守

機能追加は必ず `/speckit-constitution`（初回のみ）→ `/speckit-specify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-implement` の順で進める。この順序をスキップ・逆転しては
ならない。機能は `001-habit-management` → `002-checkin-tracking` → `003-goal-management` →
`004-reports-dashboard` → `005-reminders`（任意・ストレッチ）の順で開発する。各段階の
成果物（spec.md, plan.md, tasks.md）は、必要に応じて `/speckit-analyze` による整合性チェックを
経てから次の段階に進む。

**Rationale**: Q2目標の「複数機能・複数ファイル規模の個人プロダクト開発でSpec Kitを実践する」を
確実に達成するため、プロセスの一貫性を保証する。

### III. ドメイン中心アーキテクチャ

ビジネスロジック（ストリーク計算、目標進捗計算など）は `src/domain/` に副作用のない
純粋関数として実装し、TDDの主対象とする。データアクセスは `src/repositories/`
（`node:sqlite` 経由）、HTTPハンドリングは `src/routes/` に分離する。`src/app.ts` は
Expressアプリの組み立て（`createApp()`）のみを担う。ドメイン層はリポジトリ層・ルート層に
依存してはならない。

**Rationale**: 純粋ロジックを分離することでユニットテストが容易になり、TDDの
Red-Green-Refactorサイクルを高速に回せる。

### IV. ドキュメントは日本語で記述

Spec Kitコマンド（`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`,
`/speckit-checklist`, `/speckit-analyze` 等）が生成するMarkdownドキュメント（spec.md, plan.md,
tasks.md, checklist等）はすべて日本語で記述する。コード・コミットメッセージ・コード内コメントは
対象外とし、英語での記述を許容する。

**Rationale**: ユーザーからの明示的な指示であり、2週間に1回のチーム定例での共有を日本語で
行うため、ドキュメントの一貫性を保つ。

### V. シンプルさとエビデンスに基づく進行

個人開発の練習プロジェクトであるため、計画された5機能（`001`〜`005`）の範囲を超えた
過剰設計・将来を見越した抽象化を避ける（YAGNI）。各機能の完了時には成果物・TDD運用ログ・
整合性チェック結果をエビデンスとして残し、2週間に1回のチーム定例で最低3回共有できる状態を
維持する。

**Rationale**: Q2目標③および完了条件（エビデンス提出）を満たすため、進行が可視化・検証
可能であることを常に優先する。

## 技術スタックの制約

- Node.js + TypeScript（ES2022 / NodeNext）
- Express（REST API）
- `node:sqlite`（組み込みDatabaseSync）を使用する。`better-sqlite3` は本開発環境
  （Windows, Python 3.8 32bit）でネイティブビルドに失敗するため使用してはならない
- Vitest（unit/integration）+ Supertest でテストを実装する
- フロントエンドは `public/` 配下のVanilla HTML/CSS/JS（fetch APIでREST呼び出し）とし、
  フロントエンド用フレームワーク（React等）は導入しない

## 開発ワークフローと品質ゲート

- PostToolUseフック（`.claude/hooks/run-tests-on-change.ps1`）による自動テスト実行と
  `logs/tdd-run.log` への記録は無効化・削除しない
- `/speckit-plan` 実行時のConstitution Checkゲートで本憲章との整合性を確認し、違反がある
  場合はComplexity Trackingで正当化するか設計を見直す
- 各機能の実装完了後、必要に応じて `/speckit-analyze` で仕様・計画・タスク間の整合性を
  検証する

## Governance

本憲章はhabit-trackerプロジェクトの他のすべての開発プラクティスに優先する。改訂は以下の
手順に従う: (1) 変更内容と根拠を明確にする、(2) セマンティックバージョニングに従いバージョンを
更新する（MAJOR: 原則の後方互換性のない削除・再定義、MINOR: 原則・セクションの追加、
PATCH: 文言修正・明確化）、(3) Sync Impact Reportを本ファイル冒頭にHTMLコメントとして記録する、
(4) 依存する `.specify/templates/` 配下のテンプレートおよび `CLAUDE.md` との整合性を確認・
更新する。すべての `/speckit-plan` 実行はConstitution Checkゲートで本憲章への準拠を検証
しなければならない。

**Version**: 1.0.0 | **Ratified**: 2026-08-07 | **Last Amended**: 2026-08-07
