# Implementation Plan: レポート・ダッシュボード

**Branch**: `004-reports-dashboard` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-reports-dashboard/spec.md`

## Summary

習慣（`001`）・チェックイン（`002`）・目標（`003`）の既存データから、習慣ごとの
週次/月次達成率・最長ストリーク、カテゴリ別の週次/月次達成率、目標の
進行中/達成/未達成の振り返り状態を都度算出し、単一のダッシュボード用APIとして
まとめて返す機能を提供する。新規の永続化エンティティは持たず（FR-012）、すべて
`src/domain/`の純粋関数による導出値とする（`streak`/`goalProgress`と同じ設計方針）。

## Technical Context

**Language/Version**: TypeScript 5.6（Node.js, ES2022 / NodeNext。`001`〜`003`と同一環境）

**Primary Dependencies**: Express 4.19（既存の`001`〜`003`実装を拡張、新規依存追加なし）

**Storage**: `node:sqlite`（既存の`habits`・`checkins`・`goals`テーブルを読み取るのみ。
新規テーブルは追加しない、FR-012）

**Testing**: Vitest（unit/integration）+ Supertest（`001`〜`003`と同一）

**Target Platform**: ローカルNode.jsサーバー（`001`〜`003`と同一）。フロントエンドは既存の
`public/`配下のVanilla JSを拡張する。

**Project Type**: Web service（`001`〜`003`と同一の単一プロジェクト構成を継続）

**Performance Goals**: `001`〜`003`と同様、個人利用規模のため厳密な負荷目標はなし。
ダッシュボードはローカル環境で3秒以内に表示されれば十分（spec.md SC-002）。

**Constraints**: `001`〜`003`の制約（単一ユーザー・ローカル運用・`better-sqlite3`禁止・
フロントエンドフレームワーク不使用）をすべて継続する。

**Scale/Scope**: 個人利用。習慣数・目標数は数十件程度を想定（`003`と同様）。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. テスト駆動開発（NON-NEGOTIABLE） | PASS（フロントエンドUIは例外） | `src/domain/targetDay.ts`（対象日判定の共通化）・`completionRate.ts`（週次/月次達成率）・`longestStreak.ts`（最長ストリーク）・`goalReviewStatus.ts`（目標振り返り状態）を中心にテストを先に書く。フロントエンドUIは`001`〜`003`と同じ方針で`quickstart.md`による手動検証とする。 |
| II. 仕様駆動ワークフローの遵守 | PASS | `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`の順で実施済み。`001`〜`003`に続く4番目の機能として計画通り進行している。 |
| III. ドメイン中心アーキテクチャ | PASS | 達成率・最長ストリーク・目標振り返り状態の算出ロジックを`src/domain/`に副作用のない純粋関数として実装し、`src/repositories/`（`node:sqlite`）・`src/routes/`から分離する。 |
| IV. ドキュメントは日本語で記述 | PASS | 本plan.mdおよび後続のresearch.md/data-model.md/quickstart.md/tasks.mdはすべて日本語で記述する。 |
| V. シンプルさとエビデンスに基づく進行 | PASS | spec.mdのAssumptionsで確定した範囲（固定ウィンドウ・カスタム期間指定なし・グラフ表示は規定しない）を超えた設計は行わない。集計結果は永続化せず導出値として扱い、データモデルを単純に保つ。既存の`streak.ts`の対象日判定ロジックを`targetDay.ts`に抽出して再利用することで、重複実装を避ける。 |

**Phase 1設計後の再チェック**: data-model.md・contracts/の設計内容は上記5原則との不整合を
生じさせていない（新規テーブルなし・新規エンドポイント1つの追加のみ）。ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/004-reports-dashboard/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── reports-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── habit.ts                  # 既存（001）、変更なし
│   ├── checkin.ts                # 既存（002）、変更なし
│   ├── streak.ts                  # 既存（002）を変更: 対象日判定ロジックをtargetDay.tsへ抽出
│   ├── goal.ts                    # 既存（003）、変更なし
│   ├── goalProgress.ts            # 既存（003）、変更なし
│   ├── targetDay.ts               # 新規: 頻度設定に基づく対象日判定・日付操作の共通ヘルパー
│   ├── completionRate.ts          # 新規: 習慣単位・カテゴリ単位の週次/月次達成率を計算する純粋関数
│   ├── longestStreak.ts           # 新規: チェックイン履歴全体から最長ストリークを計算する純粋関数
│   └── goalReviewStatus.ts        # 新規: 目標の進行中/達成/未達成の状態を判定する純粋関数
├── repositories/
│   ├── db.ts                       # 既存、変更なし（新規テーブル追加なし）
│   ├── habitRepository.ts          # 既存、変更なし
│   ├── checkinRepository.ts        # 既存、変更なし
│   └── goalRepository.ts           # 既存、変更なし
├── routes/
│   ├── habits.ts                    # 既存、変更なし
│   ├── checkins.ts                  # 既存、変更なし
│   ├── goals.ts                     # 既存、変更なし
│   └── reports.ts                   # 新規: GET /api/reports/dashboard のルートハンドラ
├── app.ts                           # 既存を拡張: reportsルーターをマウント
└── server.ts                        # 既存、変更なし

public/
├── index.html                       # 既存を拡張: ダッシュボード表示セクションを追加
├── css/styles.css                   # 既存を拡張
└── js/habits.js                     # 既存を拡張（ダッシュボード取得・描画ロジックを追加）

tests/
├── unit/domain/
│   ├── habit.test.ts                # 既存、変更なし
│   ├── checkin.test.ts              # 既存、変更なし
│   ├── streak.test.ts               # 既存、変更なし（targetDay.ts抽出後も外部インターフェースは不変）
│   ├── goal.test.ts                 # 既存、変更なし
│   ├── goalProgress.test.ts         # 既存、変更なし
│   ├── targetDay.test.ts            # 新規
│   ├── completionRate.test.ts       # 新規
│   ├── longestStreak.test.ts        # 新規
│   └── goalReviewStatus.test.ts     # 新規
└── integration/
    ├── health.test.ts               # 既存、変更なし
    ├── habits.test.ts               # 既存、変更なし
    ├── checkins.test.ts             # 既存、変更なし
    ├── goals.test.ts                # 既存、変更なし
    └── reports.test.ts              # 新規
```

**Structure Decision**: `001`〜`003`と同じ3層構成（domain / repositories / routes）を
そのまま継続する。新しい層（services等）は追加しない。ダッシュボードは習慣・カテゴリ・
目標という複数ドメインを横断して集計するため、既存の`/api/habits`や`/api/goals`に
フィールドを追加する（`002`のcurrentStreak方式）のではなく、新規の`/api/reports/dashboard`
エンドポイントに集約する（詳細はresearch.md「5. APIルート設計」参照）。既存の
`streak.ts`が内部に持っていた対象日判定ロジックは、`completionRate.ts`・
`longestStreak.ts`と重複するため`targetDay.ts`に抽出し、3ファイルから共通利用する。

## Complexity Tracking

*本機能でConstitution Checkの違反はないため、このセクションに記載する項目はない。*
