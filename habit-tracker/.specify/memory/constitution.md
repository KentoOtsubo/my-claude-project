<!--
Sync Impact Report
Version change: 1.0.0 → 2.0.0
Modified principles:
  - III. ドメイン中心アーキテクチャ → データアクセス層の記述を「`node:sqlite`経由」から
    「Vercel Postgres経由・非同期API」に更新（同期→非同期アーキテクチャへの後方
    非互換な変更のためMAJORバンプ）
Added sections: none
Removed sections: none
Modified sections:
  - 技術スタックの制約（Section 2） — `node:sqlite`（ローカルファイル永続化・同期API）を
    廃止し、Vercel Postgres（クラウド永続化・非同期API、ローカル開発と本番デプロイで
    共通利用）に置き換え。`better-sqlite3`禁止の記述（ネイティブビルド失敗が理由）は
    node:sqlite自体を廃止したため削除。
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Checkゲートは汎用的な記述のため変更不要と確認済み
  ✅ .specify/templates/spec-template.md — 技術非依存の記述のため変更不要と確認済み
  ✅ .specify/templates/tasks-template.md — 変更不要と確認済み
  ✅ CLAUDE.md — 技術スタック節（`node:sqlite`→Vercel Postgres）とSpec Kitロードマップ
    （`006-persistent-storage`を追記）を更新済み
  ✅ .claude/skills/speckit-*/SKILL.md — エージェント固有の古い参照は見つからず（変更不要と確認済み）
Follow-up TODOs: none（データ移行方式・接続情報の管理方法等の技術詳細は
  `006-persistent-storage`のspec.md/plan.mdで検討する）
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
`004-reports-dashboard` → `005-reminders`（任意・ストレッチ）→
`006-persistent-storage`（データ永続化基盤の刷新）の順で開発する。各段階の
成果物（spec.md, plan.md, tasks.md）は、必要に応じて `/speckit-analyze` による整合性チェックを
経てから次の段階に進む。

**Rationale**: Q2目標の「複数機能・複数ファイル規模の個人プロダクト開発でSpec Kitを実践する」を
確実に達成するため、プロセスの一貫性を保証する。

### III. ドメイン中心アーキテクチャ

ビジネスロジック（ストリーク計算、目標進捗計算など）は `src/domain/` に副作用のない
純粋関数として実装し、TDDの主対象とする。データアクセスは `src/repositories/`
（Vercel Postgres経由、非同期API）、HTTPハンドリングは `src/routes/` に分離する。
`src/app.ts` はExpressアプリの組み立て（`createApp()`）のみを担う。ドメイン層は
リポジトリ層・ルート層に依存してはならない。リポジトリ層が非同期APIを前提とする
ため、ルート層のハンドラは `async`/`await` でリポジトリ呼び出しに対応する。

**Rationale**: 純粋ロジックを分離することでユニットテストが容易になり、TDDの
Red-Green-Refactorサイクルを高速に回せる。データアクセス層のみを非同期化することで、
ドメイン層の純粋関数としてのテスト容易性（同期呼び出しで完結する単体テスト）は
影響を受けない。

### IV. ドキュメントは日本語で記述

Spec Kitコマンド（`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`,
`/speckit-checklist`, `/speckit-analyze` 等）が生成するMarkdownドキュメント（spec.md, plan.md,
tasks.md, checklist等）はすべて日本語で記述する。コード・コミットメッセージ・コード内コメントは
対象外とし、英語での記述を許容する。

**Rationale**: ユーザーからの明示的な指示であり、2週間に1回のチーム定例での共有を日本語で
行うため、ドキュメントの一貫性を保つ。

### V. シンプルさとエビデンスに基づく進行

個人開発の練習プロジェクトであるため、計画された機能（`001`〜`005`、および永続化基盤の
刷新である`006`）の範囲を超えた過剰設計・将来を見越した抽象化を避ける（YAGNI）。各機能の
完了時には成果物・TDD運用ログ・整合性チェック結果をエビデンスとして残し、2週間に1回の
チーム定例で最低3回共有できる状態を維持する。

**Rationale**: Q2目標③および完了条件（エビデンス提出）を満たすため、進行が可視化・検証
可能であることを常に優先する。

## 技術スタックの制約

- Node.js + TypeScript（ES2022 / NodeNext）
- Express（REST API）
- データ永続化は **Vercel Postgres** を使用する。ローカル開発（`npm run dev`）と本番
  デプロイ（Vercel）の両方で同一のVercel Postgresインスタンスに接続し、環境ごとの
  挙動差異を避ける
- `node:sqlite`によるローカルファイル永続化は廃止した。理由: サーバーレス環境
  （Vercel）ではファイルシステムが読み取り専用でありデータを永続化できず、
  「ローカルNode.jsサーバー（`npm run dev`実行時のみ稼働）」という前提が
  実運用（デプロイして使い続ける）と両立しなくなったため
- リポジトリ層（`src/repositories/`）はPostgresクライアントによる非同期API
  （Promiseベース）を前提とする
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

**Version**: 2.0.0 | **Ratified**: 2026-08-07 | **Last Amended**: 2026-09-10
