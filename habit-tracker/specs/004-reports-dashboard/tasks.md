---

description: "Task list template for feature implementation"
---

# Tasks: レポート・ダッシュボード

**Input**: Design documents from `/specs/004-reports-dashboard/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/reports-api.md, research.md,
quickstart.md（すべて利用可能）。`001-habit-management`・`002-checkin-tracking`・
`003-goal-management`の実装が完了していることが前提。

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
  （`plan.md`のProject Structure参照）。ディレクトリ自体は`001`〜`003`で作成済みのため、
  新規ディレクトリ作成タスクは不要。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 本機能に必要な依存関係の確認（`001`〜`003`の環境をそのまま利用するため、
新規インストールは想定していない）

- [X] T001 [P] `package.json`の依存関係を確認し、新規追加が不要であることを確認する。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが依存する共通基盤。既存の`streak.ts`が内部に
持つ対象日判定ロジックを共通モジュールへ抽出する（`research.md`「1.」参照）。

**⚠️ CRITICAL**: このフェーズが完了するまでUser Story 1・2の実装は開始できない
（User Story 3は`targetDay.ts`に依存しないため先行着手も可能だが、優先度順に
進める）

- [X] T002 [P] `tests/unit/domain/targetDay.test.ts` に、対象日判定ロジック
  （頻度「毎日」は常に対象、頻度「毎週」は指定曜日のみ対象）と日付操作ヘルパー
  （前日・翌日の算出）のユニットテストを作成する。
- [X] T003 `src/domain/targetDay.ts` に、`isTargetDay(habit, date)` と
  `previousDate(date)` / `nextDate(date)` を実装し、T002のテストをパスさせる
  （`streak.ts`から処理内容を移設する）。
- [X] T004 `src/domain/streak.ts` を変更し、内部の対象日判定・日付操作ロジックを
  T003の`targetDay.ts`の呼び出しに置き換える。`calculateCurrentStreak`の
  シグネチャ・返り値は変更しない。既存の`tests/unit/domain/streak.test.ts`が
  引き続きすべてパスすることを確認する（リファクタリングによるデグレード防止）。

**Checkpoint**: 基盤完了。User Story 1・2の実装を開始できる。

---

## Phase 3: User Story 1 - 習慣ごとの実行状況ダッシュボードを見る (Priority: P1) 🎯 MVP

**Goal**: ユーザーが習慣ごとの今週・今月の達成率と、これまでの最長ストリークを
まとめて確認できる。

**Independent Test**: 複数日チェックインした習慣についてダッシュボードを開き、
今週の達成率と最長ストリークが正しく表示されることを確認する（`quickstart.md`
手順2）。

### Tests for User Story 1 ⚠️

> **NOTE: これらのテストを先に作成し、失敗することを確認してから実装する**

- [X] T005 [P] [US1] `tests/unit/domain/completionRate.test.ts` に、習慣単位の
  週次/月次達成率計算ロジック（`calculateCompletionRate`: ウィンドウ内かつ習慣
  作成日以降の対象日数を分母、実施日数を分子とする算出、対象日数0件時は0%、
  頻度「毎週」で対象外曜日を分母に含めないこと: FR-001, FR-002, FR-004, FR-010）の
  ユニットテストを作成する。
- [X] T006 [P] [US1] `tests/unit/domain/longestStreak.test.ts` に、最長ストリーク
  計算ロジック（`calculateLongestStreak`: 過去の連続実施日数の最大値、当日が
  対象日かつ未チェックインの場合はリセットしない、チェックインが1件もない場合は
  0、習慣の作成日より前の日付を対象日数に含めないこと: FR-003, FR-004, FR-010）の
  ユニットテストを作成する。
- [X] T007 [P] [US1] `tests/integration/reports.test.ts` に、以下の統合テストを
  作成する:
  1. `GET /api/reports/dashboard`のレスポンスで`habits`配列の各要素に
     `currentStreak`・`longestStreak`・`weekly`・`monthly`が正しく含まれること
     （spec.md Acceptance Scenario 1-3）。
  2. 習慣・チェックイン・目標のいずれも1件も登録されていない状態で
     `GET /api/reports/dashboard`を呼び出すと、エラーにならず`200`で
     `{ habits: [], categories: [], goals: [] }`が返ること（FR-011, SC-003,
     spec.md Edge Cases）。
  3. 頻度「毎週」の習慣を登録し複数日チェックインした後、
     `PUT /api/habits/:id`で頻度を「毎日」に変更し、`GET /api/reports/dashboard`の
     `weekly`/`monthly`/`longestStreak`が変更後の頻度設定を基準に再計算されて
     いること（FR-005）。

### Implementation for User Story 1

- [X] T008 [P] [US1] `src/domain/completionRate.ts` に、`calculateCompletionRate`
  （習慣単位）を実装し、T005のテストをパスさせる（`targetDay.ts`のロジックを
  使用する、`research.md`「2.」参照）。
- [X] T009 [P] [US1] `src/domain/longestStreak.ts` に、`calculateLongestStreak`を
  実装し、T006のテストをパスさせる（`targetDay.ts`のロジックを使用する、
  `research.md`「3.」参照）。
- [X] T010 [US1] `src/routes/reports.ts` を新規作成し、`createReportsRouter`
  ファクトリ関数（`habitRepository`・`checkinRepository`・`goalRepository`の
  3つを最初から受け取る。`goalRepository`はUS3まで未使用）と
  `GET /api/reports/dashboard`ハンドラを実装する。`habitRepository.findAll()`・
  `checkinRepository.findByHabitId()`を用いて習慣ごとに`currentStreak`（既存の
  `streak.ts`を再利用）・`longestStreak`（T009）・`weekly`/`monthly`（T008、
  ウィンドウ日数7/30）を算出し`habits`配列を返す。習慣・目標が1件も登録されて
  いない場合も例外を発生させず`habits: []`を返す（FR-011）。`categories`/`goals`は
  `contracts/reports-api.md`の形状を満たす空配列（`[]`）を返す（US2・US3で実装を
  追加する）。T007のテストをパスさせる。
- [X] T011 [US1] `src/app.ts` に、`reportsRouter`（`habitRepository`・
  `checkinRepository`・`goalRepository`を注入、`goalRepository`はUS3で使用）を
  `/api/reports`にマウントする。
- [X] T012 [US1] `public/index.html` と `public/js/habits.js` に、ダッシュボード
  表示セクションを追加し、習慣ごとの今週/今月の達成率・最長ストリーク・現在の
  ストリークを一覧表示する（`quickstart.md`手順2参照）。

**Checkpoint**: User Story 1が単独で完全に動作・テスト可能（MVP）。

---

## Phase 4: User Story 2 - カテゴリ別の達成状況を比較する (Priority: P2)

**Goal**: ユーザーがカテゴリごとの今週・今月の達成率を比較できる。

**Independent Test**: 異なるカテゴリの習慣を複数登録し、一部にのみチェックインした
状態でダッシュボードを開き、カテゴリごとの達成率が正しく集計されていることを
確認する（`quickstart.md`手順3）。

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] `tests/unit/domain/completionRate.test.ts` に、
  `calculateCategoryCompletionRate`（同一カテゴリに属する複数習慣の対象日数・
  実施日数を合算して算出、習慣が1件も属さないカテゴリは結果から除外: FR-006,
  FR-007）のユニットテストを追加する。
- [X] T014 [P] [US2] `tests/integration/reports.test.ts` に、
  `GET /api/reports/dashboard`の`categories`配列にカテゴリごとの`weekly`/`monthly`
  達成率が正しく含まれること、習慣が1件も属さないカテゴリが含まれないこと
  （spec.md Acceptance Scenario 1-3）の統合テストを追加する。

### Implementation for User Story 2

- [X] T015 [US2] `src/domain/completionRate.ts` に、`calculateCategoryCompletionRate`
  を追加実装し、T013のテストをパスさせる（`research.md`「4.」参照）。
- [X] T016 [US2] `src/routes/reports.ts` の`GET /api/reports/dashboard`ハンドラを
  拡張し、`habitRepository.findAll()`の結果をカテゴリごとにグルーピングして
  T015の関数で集計した`categories`配列を返す。T014のテストをパスさせる。
- [X] T017 [US2] `public/index.html` と `public/js/habits.js` に、カテゴリ別
  達成率の比較表示セクションを追加する。

**Checkpoint**: User Story 1・2がともに単独で動作する。

---

## Phase 5: User Story 3 - 目標の達成状況を一覧で振り返る (Priority: P3)

**Goal**: ユーザーがすべての目標について進行中/達成/未達成の状態を一覧で確認できる。

**Independent Test**: 達成済みの目標と未達成の目標を1件ずつ用意し、ダッシュボードの
目標振り返り一覧を開いて、それぞれが正しい状態で表示されることを確認する
（`quickstart.md`手順4）。

### Tests for User Story 3 ⚠️

- [X] T018 [P] [US3] `tests/unit/domain/goalReviewStatus.test.ts` に、
  `determineGoalReviewStatus`（`endDate`が`today`より後なら`"in_progress"`、
  `today`以前かつ達成条件を満たせば`"achieved"`、満たさなければ`"not_achieved"`:
  FR-008, FR-009）のユニットテストを作成する。
- [X] T019 [P] [US3] `tests/integration/reports.test.ts` に、
  `GET /api/reports/dashboard`の`goals`配列で、期間終了済みの達成/未達成の目標が
  正しい`status`で返ること、進行中の目標に`progressPercent`が併記されること
  （spec.md Acceptance Scenario 1-2）の統合テストを追加する。

### Implementation for User Story 3

- [X] T020 [US3] `src/domain/goalReviewStatus.ts` に、`determineGoalReviewStatus`
  を実装し、T018のテストをパスさせる（既存の`goalProgress.ts`の
  `calculateGoalProgress`を内部で再利用する、`research.md`「6.」参照）。
- [X] T021 [US3] `src/routes/reports.ts` の`GET /api/reports/dashboard`ハンドラを
  拡張し、`goalRepository.findAll()`・`checkinRepository.findByHabitId()`を用いて
  T020の関数で判定した`goals`配列（`status`・`actualCount`・`progressPercent`）を
  返す。T019のテストをパスさせる。
- [X] T022 [US3] `public/index.html` と `public/js/habits.js` に、目標の
  進行中/達成/未達成を一覧表示する振り返りセクションを追加する。

**Checkpoint**: すべてのユーザーストーリーが独立に動作する。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全ユーザーストーリーに共通する仕上げ

- [X] T023 [P] `public/css/styles.css` にダッシュボード（習慣別・カテゴリ別・
  目標振り返り）のUIの見た目を整える。
- [X] T024 `quickstart.md` の全シナリオを手動実行し、動作を確認する。
- [X] T025 `npm test` を実行し全テストがパスし、`logs/tdd-run.log` に記録される
  ことを確認する。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可能。
- **Foundational (Phase 2)**: Setup完了後。User Story 1・2の実装をブロックする
  （`targetDay.ts`に依存するため）。
- **User Story 1 (Phase 3)**: Foundational完了後。他のストーリーへの依存なし。
- **User Story 2 (Phase 4)**: Foundational完了後。`src/routes/reports.ts`
  （User Story 1で作成）を拡張するため、実質的にUser Story 1完了後に着手する。
- **User Story 3 (Phase 5)**: Foundational完了に依存しない（`targetDay.ts`を
  使用しない）が、`src/routes/reports.ts`・`src/app.ts`（User Story 1で作成）を
  拡張するため、実質的にUser Story 1完了後に着手する。
- **Polish (Phase 6)**: すべての対象ユーザーストーリー完了後。

### User Story Dependencies

- **User Story 1 (P1)**: 他のストーリーに依存しない。MVP。
- **User Story 2 (P2)**: `src/routes/reports.ts`（User Story 1）を拡張するため、
  ファイルレベルでは順次実装（機能的には独立してテスト可能）。
- **User Story 3 (P3)**: `src/routes/reports.ts`（User Story 1）を拡張する
  （機能的には独立してテスト可能）。

### Within Each User Story

- テストを先に書き、失敗を確認してから実装する（憲章原則I）
- ドメインロジック → ルート（既存ファイルの拡張）→ フロントエンドUI の順で実装する
- ストーリー完了後に次の優先度のストーリーへ進む

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストは並行して書ける（異なるファイル）:
Task: "tests/unit/domain/completionRate.test.ts に習慣単位の達成率計算のユニットテストを作成"
Task: "tests/unit/domain/longestStreak.test.ts に最長ストリーク計算のユニットテストを作成"
Task: "tests/integration/reports.test.ts にGET /api/reports/dashboardの統合テストを作成"

# 実装も一部並行できる（異なるファイル）:
Task: "src/domain/completionRate.ts にcalculateCompletionRateを実装"
Task: "src/domain/longestStreak.ts にcalculateLongestStreakを実装"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup を完了する
2. Phase 2: Foundational を完了する（User Story 1・2をブロックするため必須）
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
- フロントエンドUI（`public/`配下）は`001`〜`003`と同じ方針でTDD対象外とし、
  `quickstart.md`による手動検証で品質を保証する
- 既存の`streak.ts`から`targetDay.ts`へのロジック抽出（Phase 2）は、外部
  インターフェース（`calculateCurrentStreak`の引数・返り値）を変更しない
  リファクタリングであるため、既存の`tests/unit/domain/streak.test.ts`・
  `tests/integration/habits.test.ts`・`tests/integration/checkins.test.ts`が
  すべて変更なくパスし続けることをT004で確認する
