# Implementation Plan: 目標設定・進捗計算

**Branch**: `003-goal-management` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-goal-management/spec.md`

## Summary

習慣（`001-habit-management`）に対して、期間（開始日・終了日）と目標回数を指定した
目標を設定し、対象期間内のチェックイン（`002-checkin-tracking`）実績から進捗率・
達成判定を行う機能を提供する。進捗は永続化せず、目標とチェックイン履歴から都度計算
する導出値とする（`streak`と同じ設計方針）。目標の検証・進捗計算ロジックは
`src/domain/`の純粋関数としてTDDで実装する。

## Technical Context

**Language/Version**: TypeScript 5.6（Node.js, ES2022 / NodeNext。`001`/`002`と同一環境）

**Primary Dependencies**: Express 4.19（既存の`001`/`002`実装を拡張）

**Storage**: `node:sqlite`（既存の`habits`・`checkins`テーブルに加え、新規`goals`テーブルを
追加）。`habits.id`への外部キー制約（`ON DELETE CASCADE`）で、習慣削除時の目標連鎖削除
（FR-014）をDB層で保証する。外部キー制約は`002`で有効化済みの
`PRAGMA foreign_keys = ON;`をそのまま利用する。

**Testing**: Vitest（unit/integration）+ Supertest（`001`/`002`と同一）

**Target Platform**: ローカルNode.jsサーバー（`001`/`002`と同一）。フロントエンドは既存の
`public/`配下のVanilla JSを拡張する。

**Project Type**: Web service（`001`/`002`と同一の単一プロジェクト構成を継続）

**Performance Goals**: `001`/`002`と同様、個人利用規模のため厳密な負荷目標はなし。目標
設定・進捗表示はローカル環境で3秒以内に反映されれば十分（spec.md SC-002）。

**Constraints**: `001`/`002`の制約（単一ユーザー・ローカル運用・`better-sqlite3`禁止・
フロントエンドフレームワーク不使用）をすべて継続する。

**Scale/Scope**: 個人利用。目標数は習慣数と同程度（数十件）を想定。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. テスト駆動開発（NON-NEGOTIABLE） | PASS（フロントエンドUIは例外） | `src/domain/goal.ts`（目標の検証）・`src/domain/goalProgress.ts`（進捗計算）を中心にテストを先に書く。フロントエンドUIは`001`/`002`と同じ方針で`quickstart.md`による手動検証とする。 |
| II. 仕様駆動ワークフローの遵守 | PASS | `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`の順で実施済み。`001`・`002`に続く3番目の機能として計画通り進行している。 |
| III. ドメイン中心アーキテクチャ | PASS | 目標の検証（期間・目標回数・習慣作成日境界）と進捗計算を`src/domain/`に副作用のない純粋関数として実装し、`src/repositories/`（`node:sqlite`）・`src/routes/`から分離する。 |
| IV. ドキュメントは日本語で記述 | PASS | 本plan.mdおよび後続のresearch.md/data-model.md/quickstart.md/tasks.mdはすべて日本語で記述する。 |
| V. シンプルさとエビデンスに基づく進行 | PASS | spec.mdのAssumptionsで確定した範囲（複数習慣・カテゴリ単位の目標、プリセット期間、達成後の自動アーカイブ・通知は対象外）を超えた設計は行わない。進捗は永続化せず導出値として扱い、データモデルを単純に保つ。 |

**Phase 1設計後の再チェック**: data-model.md・contracts/の設計内容は上記5原則との不整合を
生じさせていない（新規テーブル1つ・エンドポイント4つの追加のみ）。ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/003-goal-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── goals-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── habit.ts                # 既存（001）、変更なし
│   ├── checkin.ts              # 既存（002）、変更なし
│   ├── streak.ts                # 既存（002）、変更なし
│   ├── goal.ts                  # 新規: 目標の検証（期間・目標回数・習慣作成日境界）
│   └── goalProgress.ts          # 新規: 目標とチェックイン履歴から進捗率・達成判定を計算する純粋関数
├── repositories/
│   ├── db.ts                     # 既存を拡張: goalsテーブルのスキーマを追加
│   ├── habitRepository.ts        # 既存、変更なし
│   ├── checkinRepository.ts      # 既存、変更なし
│   └── goalRepository.ts         # 新規: goalsテーブルへのCRUDアクセス
├── routes/
│   ├── habits.ts                  # 既存、変更なし
│   ├── checkins.ts                # 既存、変更なし
│   └── goals.ts                   # 新規: /api/goals のルートハンドラ（進捗の付加を含む）
├── app.ts                         # 既存を拡張: goalsルーターをマウント
└── server.ts                      # 既存、変更なし

public/
├── index.html                     # 既存を拡張: 目標設定・進捗表示・編集・削除のUIを追加
├── css/styles.css                 # 既存を拡張
└── js/habits.js                   # 既存を拡張（目標関連のロジックを追加）

tests/
├── unit/domain/
│   ├── habit.test.ts              # 既存、変更なし
│   ├── checkin.test.ts            # 既存、変更なし
│   ├── streak.test.ts             # 既存、変更なし
│   ├── goal.test.ts               # 新規
│   └── goalProgress.test.ts       # 新規
└── integration/
    ├── health.test.ts             # 既存、変更なし
    ├── habits.test.ts             # 既存、変更なし
    ├── checkins.test.ts           # 既存、変更なし
    └── goals.test.ts              # 新規
```

**Structure Decision**: `001`/`002`と同じ3層構成（domain / repositories / routes）を
そのまま継続する。新しい層（services等）は追加しない。目標一覧は特定の習慣に従属する
表示ではなく、複数習慣をまたいだ一覧（目標管理ダッシュボード的な使い方）を想定するため、
`002`のチェックイン（`/api/habits/:habitId/checkins`、ネスト型）とは異なり、`habits.ts`と
同様のフラットな`/api/goals`構成を採用する（詳細はresearch.md「4. APIルート設計」参照）。

## Complexity Tracking

*本機能でConstitution Checkの違反はないため、このセクションに記載する項目はない。*
