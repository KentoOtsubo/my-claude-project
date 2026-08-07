# Implementation Plan: 習慣管理（CRUD・カテゴリ分類）

**Branch**: `001-habit-management` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-habit-management/spec.md`

## Summary

習慣（名前・頻度・カテゴリ）の登録・一覧表示・編集・削除、およびカテゴリによる絞り込みを
提供するREST API（Express + `node:sqlite`）とVanilla JSフロントエンドを実装する。
ビジネスロジック（頻度・カテゴリの検証、デフォルト値適用）は `src/domain/` の純粋関数として
実装し、TDDで先にテストを書いてから実装する。チェックイン・ストリーク計算・目標管理は
本機能のスコープ外（`002-checkin-tracking` 以降）。

## Technical Context

**Language/Version**: TypeScript 5.6（Node.js, ES2022 / NodeNext, `package.json`の既存設定に準拠）

**Primary Dependencies**: Express 4.19（REST API）

**Storage**: `node:sqlite`（組み込みDatabaseSync）。`better-sqlite3`は本開発環境で
ネイティブビルドに失敗するため使用しない（憲章「技術スタックの制約」）。

**Testing**: Vitest（unit/integration）+ Supertest

**Target Platform**: ローカルNode.jsサーバー（Windows開発環境）。フロントエンドは
`public/`配下のVanilla HTML/CSS/JSで、fetch API経由でREST APIを呼び出すブラウザ実行。

**Project Type**: Web service（単一プロジェクト構成: バックエンドAPI + 静的フロントエンド）

**Performance Goals**: 個人利用規模のため厳密な負荷目標はなし。一覧取得・登録・編集・削除の
各操作はローカル環境でほぼ即時（1秒未満）に応答すれば十分（spec.md SC-001〜003参照）。

**Constraints**: 単一ユーザー・ローカル運用前提（認証なし）。`better-sqlite3`禁止
（ネイティブビルド不可）。フロントエンド用フレームワーク（React等）は導入しない。

**Scale/Scope**: 個人利用、登録される習慣数は数十件程度を想定。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. テスト駆動開発（NON-NEGOTIABLE） | PASS | `/speckit-tasks`で各ユーザーストーリーに「Tests for User Story N」を実タスクとして生成し、`src/domain/`のドメインロジックを中心にテストを先に書く。既存のPostToolUseフックによる自動テスト実行はそのまま利用する。 |
| II. 仕様駆動ワークフローの遵守 | PASS | `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`の順で実施済み。機能順序も`001-habit-management`から開始しており計画通り。 |
| III. ドメイン中心アーキテクチャ | PASS | 頻度・カテゴリの検証とデフォルト値適用ロジックを`src/domain/habit.ts`に副作用のない純粋関数として実装し、`src/repositories/`（`node:sqlite`）・`src/routes/`から分離する。 |
| IV. ドキュメントは日本語で記述 | PASS | 本plan.md、および後続のresearch.md/data-model.md/quickstart.md/tasks.mdはすべて日本語で記述する。 |
| V. シンプルさとエビデンスに基づく進行 | PASS | spec.mdで確定した範囲（アーカイブ機能なし、カテゴリは固定リスト、頻度は毎日/毎週の2種類）を超えた設計は行わない。 |

**Phase 1設計後の再チェック**: data-model.md・contracts/の設計内容は上記5原則との不整合を
生じさせていない（新規テーブル1つ・エンドポイント4つのみで、憲章が禁止する範囲への拡張は
なし）。ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/001-habit-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── habits-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── habit.ts             # 習慣の検証・デフォルト値適用ロジック（純粋関数、TDDの主対象）
├── repositories/
│   └── habitRepository.ts   # node:sqliteによるhabitsテーブルへのCRUDアクセス
├── routes/
│   └── habits.ts             # /api/habits の Express ルートハンドラ
├── app.ts                    # createApp()（既存、habitsルーターをマウントする）
└── server.ts                 # エントリポイント（既存、変更なし）

public/
├── index.html                 # 習慣一覧・登録・編集・削除・カテゴリ絞り込みのUI
├── css/
│   └── styles.css
└── js/
    └── habits.js              # fetch APIで /api/habits を呼び出すフロントエンドロジック

tests/
├── unit/
│   └── domain/
│       └── habit.test.ts      # 頻度・カテゴリの検証・デフォルト値ロジックのユニットテスト
└── integration/
    ├── health.test.ts         # 既存
    └── habits.test.ts         # /api/habits のSupertest統合テスト
```

**Structure Decision**: CLAUDE.mdで定義済みの単一プロジェクト構成（`src/domain/` /
`src/repositories/` / `src/routes/` の3層分離）をそのまま採用する。フロントエンドは
`public/`配下のVanilla JSとして分離し、バックエンドAPIとは疎結合（fetch経由）に保つ。
新たなプロジェクト分割（フロントエンド専用リポジトリ化等）は行わない。

## Complexity Tracking

*本機能でConstitution Checkの違反はないため、このセクションに記載する項目はない。*
