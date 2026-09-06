# Implementation Plan: リマインダー

**Branch**: `005-reminders` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-reminders/spec.md`

## Summary

本日が対象日（頻度設定に基づく）でありながら未チェックインの習慣を、アプリを開いた
時点でリマインダー一覧として表示し、その場でチェックインできる機能を提供する。習慣
ごとのリマインダー表示有無（有効/無効）は`habits`テーブルに1カラム追加して永続化する。
リマインダー一覧自体は永続化せず、習慣・チェックイン・リマインダー表示設定から都度
算出する導出値とする（`streak`/`goalProgress`/`004`の各種達成率と同じ設計方針）。対象日
判定には`004-reports-dashboard`で抽出済みの`src/domain/targetDay.ts`をそのまま再利用する。

## Technical Context

**Language/Version**: TypeScript 5.6（Node.js, ES2022 / NodeNext。`001`〜`004`と同一環境）

**Primary Dependencies**: Express 4.19（既存の`001`〜`004`実装を拡張、新規依存追加なし）

**Storage**: `node:sqlite`（既存の`habits`テーブルに`reminder_enabled`カラムを1つ追加
するのみ。新規テーブルは追加しない）

**Testing**: Vitest（unit/integration）+ Supertest（`001`〜`004`と同一）

**Target Platform**: ローカルNode.jsサーバー（`001`〜`004`と同一）。フロントエンドは既存の
`public/`配下のVanilla JSを拡張する。

**Project Type**: Web service（`001`〜`004`と同一の単一プロジェクト構成を継続）

**Performance Goals**: `001`〜`004`と同様、個人利用規模のため厳密な負荷目標はなし。
リマインダー一覧はローカル環境で3秒以内に表示・更新されれば十分（spec.md SC-003）。

**Constraints**: `001`〜`004`の制約（単一ユーザー・ローカル運用・`better-sqlite3`禁止・
フロントエンドフレームワーク不使用）をすべて継続する。ブラウザ通知・メール等の能動的な
通知手段は使用しない（spec.md Assumptions）。

**Scale/Scope**: 個人利用。習慣数は`001`〜`004`と同程度（数十件）を想定。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. テスト駆動開発（NON-NEGOTIABLE） | PASS（フロントエンドUIは例外） | `src/domain/reminder.ts`（リマインダー一覧の算出）を中心にテストを先に書く。フロントエンドUIは`001`〜`004`と同じ方針で`quickstart.md`による手動検証とする。 |
| II. 仕様駆動ワークフローの遵守 | PASS | `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`の順で実施済み。`001`〜`004`に続く5番目（最終・任意）の機能として計画通り進行している。 |
| III. ドメイン中心アーキテクチャ | PASS | リマインダー一覧の算出ロジックを`src/domain/reminder.ts`に副作用のない純粋関数として実装し、`src/repositories/`（`node:sqlite`）・`src/routes/`から分離する。対象日判定は既存の`targetDay.ts`を再利用し重複実装を避ける。 |
| IV. ドキュメントは日本語で記述 | PASS | 本plan.mdおよび後続のresearch.md/data-model.md/quickstart.md/tasks.mdはすべて日本語で記述する。 |
| V. シンプルさとエビデンスに基づく進行 | PASS | spec.mdのAssumptionsで確定した範囲（アプリ内表示のみ・時刻ベース通知なし）を超えた設計は行わない。リマインダー表示設定は新規テーブルを作らず`habits`テーブルへの1カラム追加のみとし、チェックイン自体は既存の`POST /api/habits/:habitId/checkins`をそのまま再利用する（新規エンドポイントを増やさない）。 |

**Phase 1設計後の再チェック**: data-model.md・contracts/の設計内容は上記5原則との不整合を
生じさせていない（既存テーブルへのカラム追加1つ・新規エンドポイント1つの追加のみ）。
ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/005-reminders/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── reminders-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── habit.ts                  # 既存（001）を拡張: reminderEnabledフィールドを追加
│   ├── checkin.ts                # 既存（002）、変更なし
│   ├── streak.ts                  # 既存（002/004）、変更なし
│   ├── targetDay.ts               # 既存（004）、変更なし（そのまま再利用）
│   ├── goal.ts                    # 既存（003）、変更なし
│   ├── goalProgress.ts            # 既存（003）、変更なし
│   ├── completionRate.ts          # 既存（004）、変更なし
│   ├── longestStreak.ts           # 既存（004）、変更なし
│   ├── goalReviewStatus.ts        # 既存（004）、変更なし
│   └── reminder.ts                # 新規: リマインダー一覧を算出する純粋関数
├── repositories/
│   ├── db.ts                       # 既存を拡張: habitsテーブルにreminder_enabledカラムを追加
│   ├── habitRepository.ts          # 既存を拡張: reminderEnabledの読み書きに対応
│   ├── checkinRepository.ts        # 既存、変更なし
│   └── goalRepository.ts           # 既存、変更なし
├── routes/
│   ├── habits.ts                    # 既存を拡張: PUT/POSTでreminderEnabledを受け付ける
│   ├── checkins.ts                  # 既存、変更なし（リマインダーからのチェックインもこれを再利用）
│   ├── goals.ts                     # 既存、変更なし
│   ├── reports.ts                   # 既存、変更なし
│   └── reminders.ts                 # 新規: GET /api/reminders のルートハンドラ
├── app.ts                           # 既存を拡張: remindersルーターをマウント
└── server.ts                        # 既存、変更なし

public/
├── index.html                       # 既存を拡張: リマインダー表示セクション・設定トグルを追加
├── css/styles.css                   # 既存を拡張
└── js/habits.js                     # 既存を拡張（リマインダー取得・描画・設定切り替えを追加）

tests/
├── unit/domain/
│   ├── habit.test.ts                # 既存を拡張: reminderEnabledのデフォルト値検証を追加
│   ├── checkin.test.ts              # 既存、変更なし
│   ├── streak.test.ts               # 既存、変更なし
│   ├── targetDay.test.ts            # 既存、変更なし
│   ├── goal.test.ts                 # 既存、変更なし
│   ├── goalProgress.test.ts         # 既存、変更なし
│   ├── completionRate.test.ts       # 既存、変更なし
│   ├── longestStreak.test.ts        # 既存、変更なし
│   ├── goalReviewStatus.test.ts     # 既存、変更なし
│   └── reminder.test.ts             # 新規
└── integration/
    ├── health.test.ts               # 既存、変更なし
    ├── habits.test.ts               # 既存を拡張: reminderEnabledのCRUD経路のテストを追加
    ├── checkins.test.ts             # 既存、変更なし
    ├── goals.test.ts                # 既存、変更なし
    ├── reports.test.ts              # 既存、変更なし
    └── reminders.test.ts            # 新規
```

**Structure Decision**: `001`〜`004`と同じ3層構成（domain / repositories / routes）を
そのまま継続する。新しい層（services等）は追加しない。リマインダー表示設定
（`ReminderPreference`）は習慣に対して1対1で存在するシンプルな真偽値のため、`003`の
`goals`のような新規テーブルではなく、`habits`テーブルへの1カラム追加（`category`と
同様のパターン）として実装する。これにより習慣削除時の連鎖削除（FR-009）もDB制約を
追加することなく自動的に満たされる。リマインダー経由のチェックイン（User Story 2）は
新規エンドポイントを設けず、既存の`POST /api/habits/:habitId/checkins`をフロントエンドから
そのまま呼び出す（詳細はresearch.md「3. チェックイン方法」参照）。

## Complexity Tracking

*本機能でConstitution Checkの違反はないため、このセクションに記載する項目はない。*
