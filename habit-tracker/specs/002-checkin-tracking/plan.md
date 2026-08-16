# Implementation Plan: チェックイン・ストリーク計算

**Branch**: `002-checkin-tracking` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-checkin-tracking/spec.md`

## Summary

習慣（`001-habit-management`で実装済み）に対して、日次のチェックイン記録・履歴表示・
取り消し、および頻度（毎日/毎週+曜日）に応じた現在のストリーク（継続日数）計算を提供する。
ストリークは永続化せず、チェックイン履歴と習慣の現在の頻度設定から都度計算する導出値と
する（`spec.md` Clarifications: 頻度変更時も常に現在の頻度で再計算）。ストリーク計算・
チェックイン検証ロジックは`src/domain/`の純粋関数としてTDDで実装する。

## Technical Context

**Language/Version**: TypeScript 5.6（Node.js, ES2022 / NodeNext。`001-habit-management`と
同一環境）

**Primary Dependencies**: Express 4.19（既存の`001`実装を拡張）

**Storage**: `node:sqlite`（既存の`habits`テーブルに加え、新規`checkins`テーブルを追加）。
`habits.id`への外部キー制約（`ON DELETE CASCADE`）で、習慣削除時のチェックイン連鎖削除
（FR-014）をDB層で保証する。

**Testing**: Vitest（unit/integration）+ Supertest（`001`と同一）

**Target Platform**: ローカルNode.jsサーバー（`001`と同一）。フロントエンドは既存の
`public/`配下のVanilla JSを拡張する。

**Project Type**: Web service（`001`と同一の単一プロジェクト構成を継続）

**Performance Goals**: `001`と同様、個人利用規模のため厳密な負荷目標はなし。チェックイン
操作・ストリーク再計算はローカル環境で3秒以内に反映されれば十分（spec.md SC-002）。

**Constraints**: `001`の制約（単一ユーザー・ローカル運用・`better-sqlite3`禁止・
フロントエンドフレームワーク不使用）をすべて継続する。

**Scale/Scope**: 個人利用。1習慣あたりのチェックイン件数は数百件程度（数年分の日次記録）を
想定。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. テスト駆動開発（NON-NEGOTIABLE） | PASS（フロントエンドUIは例外） | `src/domain/checkin.ts`（チェックイン検証）・`src/domain/streak.ts`（ストリーク計算）を中心にテストを先に書く。フロントエンドUIは`001`と同じ方針で`quickstart.md`による手動検証とする。 |
| II. 仕様駆動ワークフローの遵守 | PASS | `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`の順で実施済み。`001-habit-management`に続く2番目の機能として計画通り進行している。 |
| III. ドメイン中心アーキテクチャ | PASS | チェックインの検証（重複・未来日・作成日より前）とストリーク計算を`src/domain/`に副作用のない純粋関数として実装し、`src/repositories/`（`node:sqlite`）・`src/routes/`から分離する。 |
| IV. ドキュメントは日本語で記述 | PASS | 本plan.mdおよび後続のresearch.md/data-model.md/quickstart.md/tasks.mdはすべて日本語で記述する。 |
| V. シンプルさとエビデンスに基づく進行 | PASS | spec.mdのAssumptionsで確定した範囲（最長ストリーク・複数タイムゾーン対応は対象外）を超えた設計は行わない。ストリークは永続化せず導出値として扱い、データモデルを単純に保つ。 |

**Phase 1設計後の再チェック**: data-model.md・contracts/の設計内容は上記5原則との不整合を
生じさせていない（新規テーブル1つ・エンドポイント3つの追加、既存`GET /api/habits`への
フィールド追加のみ）。ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/002-checkin-tracking/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── checkins-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── habit.ts               # 既存（001-habit-management）、変更なし
│   ├── checkin.ts             # 新規: チェックインの検証（重複・未来日・作成日より前）
│   └── streak.ts              # 新規: 頻度・チェックイン履歴から現在のストリークを計算する純粋関数
├── repositories/
│   ├── db.ts                   # 既存を拡張: checkinsテーブルのスキーマと外部キー制約を追加
│   ├── habitRepository.ts      # 既存、変更なし
│   └── checkinRepository.ts    # 新規: checkinsテーブルへのCRUDアクセス
├── routes/
│   ├── habits.ts                # 既存を拡張: GET応答に現在のストリーク（currentStreak）を付加
│   └── checkins.ts              # 新規: /api/habits/:habitId/checkins のルートハンドラ
├── app.ts                       # 既存を拡張: checkinsルーターをマウント
└── server.ts                    # 既存、変更なし

public/
├── index.html                   # 既存を拡張: チェックイン操作・ストリーク表示・履歴のUIを追加
├── css/styles.css               # 既存を拡張
└── js/habits.js                 # 既存を拡張（チェックイン・ストリーク・履歴のロジックを追加）

tests/
├── unit/domain/
│   ├── habit.test.ts            # 既存、変更なし
│   ├── checkin.test.ts          # 新規
│   └── streak.test.ts           # 新規
└── integration/
    ├── health.test.ts           # 既存、変更なし
    ├── habits.test.ts           # 既存を拡張: currentStreakフィールドのテストケースを追加
    └── checkins.test.ts         # 新規
```

**Structure Decision**: `001-habit-management`と同じ3層構成（domain / repositories /
routes）をそのまま継続する。新しい層（services等）は追加しない。ストリーク計算は
新しいエンティティを持たず、既存の`habits`テーブルと新規`checkins`テーブルのみで
表現できるため、データモデルの拡張も最小限に留める。

## Complexity Tracking

*本機能でConstitution Checkの違反はないため、このセクションに記載する項目はない。*
