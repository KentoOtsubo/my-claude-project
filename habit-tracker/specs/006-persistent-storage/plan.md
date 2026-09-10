# Implementation Plan: データ永続化基盤の刷新

**Branch**: `006-persistent-storage` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-persistent-storage/spec.md`

## Summary

`node:sqlite`によるローカルファイル永続化を廃止し、Vercel Postgresへ全面的に切り替える。
ローカル開発と本番デプロイの双方が同一のVercel Postgresプロジェクト内の、互いに独立した
データベース（dev用/prod用）に接続する。リポジトリ層（`src/repositories/`）を同期API
（`DatabaseSync`）から非同期API（Promiseベース）に書き換え、ルート層は`async`/`await`で
対応する。ドメイン層（`src/domain/`）・既存の全REST APIの入出力仕様（`001`〜`005`の
contracts）は変更しない。自動テストは、ネットワーク接続なしで高速に実行できる
組み込みPostgres互換エンジン（PGlite）を使い、既存のTDD自動実行フック
（`logs/tdd-run.log`）の速度・オフライン性を維持する。

## Technical Context

**Language/Version**: TypeScript 5.6（Node.js, ES2022 / NodeNext。`001`〜`005`と同一環境）

**Primary Dependencies**: Express 4.19（既存を継続）。新規追加: `@vercel/postgres`
（本番・ローカル開発の実行時DBクライアント）、`@electric-sql/pglite`（テスト用の
組み込みPostgres互換エンジン、devDependencies）、`express-async-errors`
（Express 4系で非同期ルートハンドラの例外を自動的にエラーハンドラへ転送するための
薄いパッチ、FR-005対応）

**Storage**: Vercel Postgres（Neonベース）。ローカル開発用DBと本番用DBを、同一プロジェクト
内の別インスタンス（別の接続文字列）として分離する（`憲章v2.0.0`・spec.md Assumptions）

**Testing**: Vitest（unit/integration）+ Supertest（既存を継続）。統合テストのDB接続には
`@electric-sql/pglite`（インプロセスで動作するPostgres互換エンジン、ネットワーク不要・
高速）を使用し、ネットワーク越しの実DB接続には依存しない

**Target Platform**: Vercelサーバーレス関数（本番）+ ローカルNode.jsプロセス（`npm run dev`、
開発用DBに接続）。`005`までの「ローカル専用」前提は本機能により撤廃される
（憲章v2.0.0）

**Project Type**: Web service（`001`〜`005`と同一の単一プロジェクト構成を継続）

**Performance Goals**: `001`〜`005`と同様、個人利用規模のため厳密な負荷目標はなし。
データの保存・取得操作は3秒以内に完了すれば十分（spec.md SC-003）

**Constraints**: 単一ユーザー・個人利用を前提とする（`001`〜`005`と同様）。開発環境の
操作が本番データに影響してはならない（spec.md FR-004）。DB接続情報（接続文字列）は
`.env`等の環境変数で管理し、リポジトリにコミットしない

**Scale/Scope**: 個人利用。データ量は`001`〜`005`と同程度（数十〜数百件規模）を想定

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. テスト駆動開発（NON-NEGOTIABLE） | PASS（フロントエンドUIは例外） | リポジトリ層の書き換えも含め、既存の統合テスト（`tests/integration/*.test.ts`）を先に非同期APIに合わせて更新し、実装で追従させる。PGliteの採用により、DB層を含むテストもネットワーク接続なしで高速に実行でき、`logs/tdd-run.log`の運用（PostToolUseフックでの自動実行）に支障が生じない。 |
| II. 仕様駆動ワークフローの遵守 | PASS | `/speckit-constitution`（v2.0.0への改訂）→ `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`の順で実施済み。`001`〜`005`に続く6番目の機能として計画通り進行している。 |
| III. ドメイン中心アーキテクチャ | PASS | `src/domain/`配下の純粋関数は本機能で一切変更しない（DB接続を持たないため無影響）。データアクセスは`src/repositories/`（Vercel Postgres経由、非同期API）、HTTPハンドリングは`src/routes/`に分離する方針を継続する（憲章v2.0.0で明記済み）。 |
| IV. ドキュメントは日本語で記述 | PASS | 本plan.mdおよび後続のresearch.md/data-model.md/quickstart.md/tasks.mdはすべて日本語で記述する。 |
| V. シンプルさとエビデンスに基づく進行 | PASS | 専用のマイグレーションツール（Prisma Migrate等）は導入せず、既存と同様に`CREATE TABLE IF NOT EXISTS`相当の冪等なDDLをアプリ起動時に実行する方式を踏襲する（research.md「4.」参照）。過去のローカルデータの自動移行機能も実装しない（spec.md FR-006）。 |

**Phase 1設計後の再チェック**: data-model.md・research.mdの設計内容は上記5原則との
不整合を生じさせていない（新規テーブルの追加はなく、既存3テーブルのDB移行のみ）。
ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/006-persistent-storage/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

`contracts/`は生成しない。本機能はデータの永続化方式（内部実装）のみを変更し、
`001`〜`005`で確定済みのREST API契約（`specs/*/contracts/*.md`）はいずれも変更しない
（spec.md FR-003、後方互換性の要求）。

### Source Code (repository root)

```text
src/
├── domain/                          # 既存（001〜005）、本機能では一切変更しない
│   └── ...（habit.ts, checkin.ts, streak.ts, targetDay.ts, goal.ts,
│            goalProgress.ts, completionRate.ts, longestStreak.ts,
│            goalReviewStatus.ts, reminder.ts, clock.ts）
├── repositories/
│   ├── db.ts                         # 既存を全面書き換え: node:sqlite→Vercel Postgres/
│   │                                  PGliteへの接続、非同期の冪等スキーマ作成
│   ├── habitRepository.ts             # 既存を全面書き換え: 全メソッドを非同期化、
│   │                                  SQLをPostgres方言（$1, $2...）に変更
│   ├── checkinRepository.ts           # 既存を全面書き換え: 同上
│   └── goalRepository.ts              # 既存を全面書き換え: 同上
├── routes/
│   ├── habits.ts                      # 既存を拡張: ハンドラをasync化しawaitを追加
│   ├── checkins.ts                    # 既存を拡張: 同上
│   ├── goals.ts                       # 既存を拡張: 同上
│   ├── reports.ts                     # 既存を拡張: 同上
│   └── reminders.ts                   # 既存を拡張: 同上
├── app.ts                             # 既存を拡張: createApp()を非同期化
│                                        （DB接続・スキーマ作成を待機）、
│                                        express-async-errorsの読み込みと
│                                        共通エラーハンドリングミドルウェアを追加
└── server.ts                          # 既存を拡張: createApp()のawait対応

public/                                 # 変更なし（APIの入出力は不変のため）

tests/
├── unit/domain/                       # 既存、変更なし（ドメイン層は無影響）
└── integration/
    ├── health.test.ts                 # 既存を拡張: createApp()のawait対応のみ
    ├── habits.test.ts                  # 既存を拡張: 同上
    ├── checkins.test.ts                # 既存を拡張: 同上
    ├── goals.test.ts                   # 既存を拡張: 同上
    ├── reports.test.ts                 # 既存を拡張: 同上
    ├── reminders.test.ts               # 既存を拡張: 同上
    └── testDb.ts                       # 新規: PGliteベースのテスト用DBファクトリ
                                           （各テストファイルの`beforeEach`で使用）

.env.example                            # 新規: 必要な環境変数（DATABASE_URL等）の
                                           サンプル（実際の接続文字列は含めない）
.gitignore                              # 既存を拡張: .env / .env.local を追加
```

**Structure Decision**: `001`〜`005`と同じ3層構成（domain / repositories / routes）を
そのまま継続する。ドメイン層はDBを一切参照しないため無変更。変更は「リポジトリ層の
実装の中身」と「ルート層が非同期呼び出しに対応すること」に閉じており、レイヤー構成
そのものは変えない。新しいディレクトリ・新しい層（services等）は追加しない。

## Complexity Tracking

*本機能でConstitution Checkの違反はないため、このセクションに記載する項目はない。*
