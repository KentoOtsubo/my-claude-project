---

description: "Task list template for feature implementation"
---

# Tasks: 目標設定・進捗計算

**Input**: Design documents from `/specs/003-goal-management/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/goals-api.md, research.md,
quickstart.md（すべて利用可能）。`001-habit-management`・`002-checkin-tracking`の
実装が完了していることが前提。

**Tests**: spec.md「User Scenarios & Testing」で「本機能はテスト駆動で実装する」旨が明記
されているため、各ユーザーストーリーにテストタスクを含める（憲章原則I: テスト駆動開発）。

**Organization**: タスクはユーザーストーリー単位でグループ化し、各ストーリーを独立に実装・
テストできるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（異なるファイル・依存関係なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2, US3）
- 各タスクに正確なファイルパスを含める

## Path Conventions

- 単一プロジェクト構成: `src/`, `tests/`, `public/` はリポジトリルート直下
  （`plan.md`のProject Structure参照）。ディレクトリ自体は`001`/`002`で作成済みのため、
  新規ディレクトリ作成タスクは不要。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 本機能に必要な依存関係の確認（`001`/`002`の環境をそのまま利用するため、
新規インストールは想定していない）

- [ ] T001 [P] `package.json`の依存関係を確認し、新規追加が不要であることを確認する。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが依存する共通基盤

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始できない

- [ ] T002 `src/repositories/db.ts` を拡張し、`goals` テーブルのスキーマ初期化
  （`CREATE TABLE IF NOT EXISTS`、`habit_id` への `ON DELETE CASCADE` 外部キー、
  `target_count >= 1` のCHECK制約）を追加する（`data-model.md`のSQLスキーマ参照）。
  `PRAGMA foreign_keys = ON;` は`002`で有効化済みのため追加作業は不要。

**Checkpoint**: 基盤完了。ユーザーストーリーの実装を開始できる。

---

## Phase 3: User Story 1 - 目標を設定する (Priority: P1) 🎯 MVP

**Goal**: ユーザーが習慣に対して期間・目標回数を指定して目標を設定し、一覧に表示できる。

**Independent Test**: 習慣に対して開始日・終了日・目標回数を指定して目標を設定し、
目標一覧に表示されることを確認する（`quickstart.md` 手順2）。

### Tests for User Story 1 ⚠️

> **NOTE: これらのテストを先に作成し、失敗することを確認してから実装する**

- [ ] T003 [P] [US1] `tests/unit/domain/goal.test.ts` に、目標の検証ロジック
  （開始日が終了日より後の場合のエラー、目標回数が1以上の整数であることの検証、
  対象習慣の作成日より前の開始日のエラー: FR-002, FR-003, FR-005）のユニットテストを
  作成する。
- [ ] T004 [P] [US1] `tests/integration/goals.test.ts` に、`POST /api/goals` の登録
  成功・開始日が終了日より後のエラー・目標回数0以下のエラー・存在しない習慣IDの
  エラー（spec.md Acceptance Scenario 1-3, FR-004）に加え、習慣を削除すると紐づく
  目標も連鎖削除されること（`001`の`DELETE /api/habits/:id`実行後、対象習慣の目標が
  `GET /api/goals`の結果から消えることを検証する: FR-014）の統合テストを作成する。

### Implementation for User Story 1

- [ ] T005 [US1] `src/domain/goal.ts` に、目標の検証ロジック（開始日・終了日・目標
  回数・習慣作成日境界）を実装し、T003のテストをパスさせる。
- [ ] T006 [US1] `src/repositories/goalRepository.ts` に `create()` と `findAll()` を
  実装する（T002の`db.ts`を使用）。
- [ ] T007 [US1] `src/routes/goals.ts` に `POST /api/goals` と `GET /api/goals`
  （進捗フィールドは含めない基本形、`contracts/goals-api.md`参照）を実装し、
  `src/app.ts` にルーターをマウントする。存在しない習慣IDの場合404を返す。T004の
  テストをパスさせる。
- [ ] T008 [US1] `public/index.html` と `public/js/habits.js` に、目標設定フォームと
  基本的な目標一覧表示のUIを追加する（`quickstart.md`手順2参照）。

**Checkpoint**: User Story 1が単独で完全に動作・テスト可能（MVP）。

---

## Phase 4: User Story 2 - 目標の進捗を確認する (Priority: P2)

**Goal**: ユーザーが目標の対象期間内の実績チェックイン数に基づく進捗率を確認できる。

**Independent Test**: 目標回数10回の目標に対して期間内で5回チェックインされている
状態を用意し、目標一覧を開いて進捗率50%と表示されることを確認する（`quickstart.md`
手順3）。

### Tests for User Story 2 ⚠️

- [ ] T009 [P] [US2] `tests/unit/domain/goalProgress.test.ts` に、進捗計算ロジック
  （対象期間内のチェックイン数の集計、100%を超える場合のキャップ、達成判定:
  FR-006〜FR-008）のユニットテストを作成する。
- [ ] T010 [P] [US2] `tests/integration/goals.test.ts` に、`GET /api/goals`の
  レスポンスに `actualCount` / `progressPercent` / `achieved` が正しく含まれること
  （spec.md Acceptance Scenario 1-3）に加え、同一習慣に期間が重複する2つの目標を
  設定した場合、それぞれの目標が自身の期間・目標回数に基づき独立して進捗を計算する
  こと（FR-015）の統合テストを追加する。

### Implementation for User Story 2

- [ ] T011 [US2] `src/domain/goalProgress.ts` に、目標とチェックイン日付集合から
  進捗率・達成判定を計算する純粋関数を実装し、T009のテストをパスさせる
  （`research.md`「2. 進捗計算の設計」参照）。
- [ ] T012 [US2] `src/routes/goals.ts` のGETハンドラを拡張し、
  `checkinRepository.findByHabitId()` と `goalProgress.ts` を用いて各目標に
  `actualCount` / `progressPercent` / `achieved` を付加する。T010のテストをパスさせる。
- [ ] T013 [US2] `public/js/habits.js` と `public/index.html` に、目標一覧の各行へ
  進捗率・達成状態を表示するUIを追加する。

**Checkpoint**: User Story 1・2がともに単独で動作する。

---

## Phase 5: User Story 3 - 目標を編集・削除する (Priority: P3)

**Goal**: ユーザーが登録済みの目標の期間・目標回数を編集したり、削除できる。

**Independent Test**: 登録済みの目標の目標回数を変更して保存し、進捗率が新しい目標
回数を基準に再計算されることを確認する。削除して一覧から消えることを確認する
（`quickstart.md` 手順4）。

### Tests for User Story 3 ⚠️

- [ ] T014 [P] [US3] `tests/integration/goals.test.ts` に、`PUT /api/goals/:id`
  （更新成功・部分更新時の既存フィールド保持・存在しないID時404）と
  `DELETE /api/goals/:id`（削除成功・存在しないID時404）の統合テストを追加する
  （spec.md Acceptance Scenario 1-4, FR-010, FR-011, FR-013）。

### Implementation for User Story 3

- [ ] T015 [US3] `src/repositories/goalRepository.ts` に `findById()`・`update()`・
  `delete()` を実装する。`update()`は既存レコードと送信フィールドをマージした
  うえで`src/domain/goal.ts`の検証ロジックを再適用する（`001`のPUT部分更新マージ
  方針を踏襲、`data-model.md`参照）。
- [ ] T016 [US3] `src/routes/goals.ts` に `PUT /api/goals/:id` と
  `DELETE /api/goals/:id` を実装し、存在しないIDの場合404を返す。T014のテストを
  パスさせる。
- [ ] T017 [US3] `public/js/habits.js` と `public/index.html` に、目標の編集フォームと
  削除確認ダイアログのUI（FR-012）を追加する。

**Checkpoint**: すべてのユーザーストーリーが独立に動作する。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全ユーザーストーリーに共通する仕上げ

- [ ] T018 [P] `public/css/styles.css` に目標設定・進捗・編集・削除UIの見た目を
  整える。
- [ ] T019 `quickstart.md` の全シナリオを手動実行し、動作を確認する。特に削除確認
  ダイアログの表示・キャンセル動作（FR-012）を含めて確認する。
- [ ] T020 `npm test` を実行し全テストがパスし、`logs/tdd-run.log` に記録されることを
  確認する。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可能。
- **Foundational (Phase 2)**: Setup完了後。すべてのユーザーストーリーをブロックする。
- **User Story 1 (Phase 3)**: Foundational完了後。他のストーリーへの依存なし。
- **User Story 2 (Phase 4)**: Foundational完了後。`src/routes/goals.ts`（User Story 1で
  作成）のGETハンドラを拡張するため、実質的にUser Story 1完了後に着手する。
- **User Story 3 (Phase 5)**: Foundational完了後。`goalRepository`/
  `src/routes/goals.ts`（User Story 1で作成）を拡張するため、実質的にUser Story 1
  完了後に着手する。
- **Polish (Phase 6)**: すべての対象ユーザーストーリー完了後。

### User Story Dependencies

- **User Story 1 (P1)**: 他のストーリーに依存しない。MVP。
- **User Story 2 (P2)**: `src/routes/goals.ts`（User Story 1）を拡張するため、
  ファイルレベルでは順次実装（機能的には独立してテスト可能）。
- **User Story 3 (P3)**: `goalRepository`・`src/routes/goals.ts`（User Story 1）を
  拡張する（機能的には独立してテスト可能）。

### Within Each User Story

- テストを先に書き、失敗を確認してから実装する（憲章原則I）
- ドメインロジック → リポジトリ → ルート → フロントエンドUI の順で実装する
- ストーリー完了後に次の優先度のストーリーへ進む

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストは並行して書ける（異なるファイル）:
Task: "tests/unit/domain/goal.test.ts に検証ロジックのユニットテストを作成"
Task: "tests/integration/goals.test.ts にPOST/GETの統合テストを作成"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup を完了する
2. Phase 2: Foundational を完了する（すべてのストーリーをブロックするため必須）
3. Phase 3: User Story 1 を完了する
4. **STOP and VALIDATE**: `quickstart.md`手順2でUser Story 1を単独検証する

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. User Story 1 追加 → 単独検証 → デモ可能（MVP）
3. User Story 2 追加 → 単独検証 → デモ可能
4. User Story 3 追加 → 単独検証 → デモ可能
5. Polish（Phase 6）で仕上げる

---

## Notes

- [P] タスク = 異なるファイル・依存関係なし
- [Story] ラベルはユーザーストーリーへのトレーサビリティのために付与
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 実装前にテストが失敗することを確認する
- タスクごと、または論理的なまとまりごとにコミットする
- チェックポイントで一度停止し、ストーリー単位の独立動作を検証する
- フロントエンドUI（`public/`配下）は`001`/`002`と同じ方針でTDD対象外とし、
  `quickstart.md`による手動検証で品質を保証する
- 習慣削除時の目標カスケード削除（FR-014）は、`001`/`002`での`/speckit-analyze`の
  指摘を踏まえ、あらかじめT004に自動テストとして組み込んでいる
