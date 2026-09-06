---

description: "Task list template for feature implementation"
---

# Tasks: リマインダー

**Input**: Design documents from `/specs/005-reminders/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/reminders-api.md, research.md,
quickstart.md（すべて利用可能）。`001-habit-management`〜`004-reports-dashboard`の実装が
完了していることが前提。

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
  （`plan.md`のProject Structure参照）。ディレクトリ自体は`001`〜`004`で作成済みのため、
  新規ディレクトリ作成タスクは不要。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 本機能に必要な依存関係の確認（`001`〜`004`の環境をそのまま利用するため、
新規インストールは想定していない）

- [ ] T001 [P] `package.json`の依存関係を確認し、新規追加が不要であることを確認する。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが依存する共通基盤。習慣（Habit）に
`reminderEnabled`フィールドを追加する（`research.md`「1.」参照）。

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始できない
（US1のリマインダー算出・US3の表示切り替えのいずれも`reminderEnabled`に依存する）

- [ ] T002 [P] `tests/unit/domain/habit.test.ts` に、`reminderEnabled`のデフォルト値
  適用（省略時`true`）と、真偽値以外が指定された場合のエラーのユニットテストを
  追加する（FR-006, FR-007）。
- [ ] T003 `src/domain/habit.ts` の`HabitInput`/`NormalizedHabitInput`/`Habit`型と
  `normalizeHabitInput`に`reminderEnabled`（省略時`true`、真偽値以外はエラー）を
  追加し、T002のテストをパスさせる。
- [ ] T004 `src/repositories/db.ts` を拡張し、`habits`テーブルに
  `reminder_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reminder_enabled IN (0, 1))`
  カラムを追加する（`data-model.md`のSQLスキーマ参照。新規テーブルは作らない）。
- [ ] T005 `src/repositories/habitRepository.ts` を拡張し、`create()`・`update()`の
  INSERT/UPDATE文と`rowToHabit()`（`reminder_enabled`の0/1とbooleanの相互変換）で
  `reminderEnabled`を読み書きする。`update()`の部分更新マージ処理にも
  `reminderEnabled: input.reminderEnabled ?? existing.reminderEnabled`を追加する
  （`001`のPUT部分更新マージ方針を踏襲）。
- [ ] T006 [P] `tests/integration/habits.test.ts` に、`POST /api/habits`で
  `reminderEnabled`を省略すると`true`になること、明示的に`false`を指定すると
  保存されること、`PUT /api/habits/:id`で`reminderEnabled`のみを部分更新しても
  他フィールドが保持されることの統合テストを追加する（FR-006, FR-007）。
  `src/routes/habits.ts`はリクエストボディをそのままリポジトリに渡す実装のため、
  ルート自体の変更は不要であることを確認する。既存の`DELETE /api/habits/:id`の
  削除テスト（`001`実装済み）が、`reminder_enabled`カラムも`habits`行削除に伴い
  自動的に削除されること（FR-009相当）を構造的に保証していることを確認する
  （新規テストの追加は不要）。

**Checkpoint**: 基盤完了。ユーザーストーリーの実装を開始できる。

---

## Phase 3: User Story 1 - 今日まだ実行していない習慣に気づく (Priority: P1) 🎯 MVP

**Goal**: ユーザーがアプリを開いた際に、本日まだ実行していない対象習慣の一覧を
確認できる。

**Independent Test**: 頻度「毎日」の習慣を2件登録し、1件だけ本日チェックインした
状態でリマインダー一覧を取得し、未チェックインの1件だけが表示されることを確認する
（`quickstart.md`手順2）。

### Tests for User Story 1 ⚠️

> **NOTE: これらのテストを先に作成し、失敗することを確認してから実装する**

- [ ] T007 [P] [US1] `tests/unit/domain/reminder.test.ts` に、リマインダー一覧算出
  ロジック（`calculateReminderList`: 対象日でない習慣を除外、チェックイン済みの
  習慣を除外、`reminderEnabled`が`false`の習慣を除外、対象が0件の場合は空配列:
  FR-001, FR-002, FR-003, FR-006, FR-008）のユニットテストを作成する。
- [ ] T008 [P] [US1] `tests/integration/reminders.test.ts` に、
  `GET /api/reminders`のレスポンスが未チェックインの対象習慣のみを含むこと
  （spec.md Acceptance Scenario 1-3）、対象習慣が1件もない場合は空配列`[]`を返す
  こと（Acceptance Scenario 4）の統合テストを作成する。

### Implementation for User Story 1

- [ ] T009 [US1] `src/domain/reminder.ts` に、`calculateReminderList`を実装し、
  T007のテストをパスさせる（`targetDay.ts`の`isTargetDay`を再利用する、
  `research.md`「2.」参照）。
- [ ] T010 [US1] `src/routes/reminders.ts` を新規作成し、`GET /api/reminders`
  ハンドラを実装する。`habitRepository.findAll()`・`checkinRepository.findByHabitId()`
  を用いてT009の関数でリマインダー対象を算出し返す。T008のテストをパスさせる。
- [ ] T011 [US1] `src/app.ts` に、`reminders`ルーターを`/api/reminders`にマウント
  する。
- [ ] T012 [US1] `public/index.html` と `public/js/habits.js` に、リマインダー
  表示セクションを追加し、本日未実行の対象習慣を一覧表示する。対象が0件の場合は
  「今日の習慣はすべて実行済みです」と表示する（`quickstart.md`手順2参照）。

**Checkpoint**: User Story 1が単独で完全に動作・テスト可能（MVP）。

---

## Phase 4: User Story 2 - リマインダーからその場でチェックインする (Priority: P2)

**Goal**: ユーザーがリマインダー一覧から離れることなく、その場でチェックインできる。

**Independent Test**: リマインダー一覧の習慣にチェックインし、その習慣が一覧から
消えることを確認する（`quickstart.md`手順3）。

### Tests for User Story 2 ⚠️

- [ ] T013 [P] [US2] `tests/integration/reminders.test.ts` に、既存の
  `POST /api/habits/:habitId/checkins`でチェックインした後、
  `GET /api/reminders`の結果からその習慣が消えること（spec.md Acceptance
  Scenario 1, FR-004）の統合テストを追加する。既存のチェックイン検証
  （重複防止等、FR-005）は`002`のテストで担保済みのため重複して作成しない。

### Implementation for User Story 2

- [ ] T014 [US2] `public/js/habits.js` に、リマインダー一覧の各項目へ
  チェックインボタンを追加し、既存の`POST /api/habits/:habitId/checkins`を
  呼び出す（新規APIは作らない、`research.md`「3.」参照）。チェックイン後は
  リマインダー一覧・習慣一覧・目標一覧・ダッシュボードを再読み込みし、即時
  反映する（`003`/`004`で確立した即時反映方針を踏襲）。

**Checkpoint**: User Story 1・2がともに単独で動作する。

---

## Phase 5: User Story 3 - 特定の習慣をリマインダー対象から除外する (Priority: P3)

**Goal**: ユーザーが習慣ごとにリマインダー表示のON/OFFを設定できる。

**Independent Test**: 習慣のリマインダー表示を無効に設定し、本日未実行であっても
リマインダー一覧に表示されないことを確認する（`quickstart.md`手順4）。

### Tests for User Story 3 ⚠️

- [ ] T015 [P] [US3] `tests/integration/reminders.test.ts` に、
  `PUT /api/habits/:id`で`reminderEnabled`を`false`に更新すると
  `GET /api/reminders`の結果からその習慣が消えること、再度`true`に戻すと
  一覧に戻ること（spec.md Acceptance Scenario 1, 2）、新規登録した習慣は
  `reminderEnabled`未指定でもデフォルトでリマインダー対象になること
  （Acceptance Scenario 3）の統合テストを追加する。

### Implementation for User Story 3

- [ ] T016 [US3] `public/index.html` と `public/js/habits.js` に、習慣一覧
  （または編集フォーム）へリマインダー表示のON/OFFを切り替えるチェックボックスを
  追加し、`PUT /api/habits/:id`に`reminderEnabled`を送信する。変更後はリマインダー
  一覧を再読み込みし、即時反映する。

**Checkpoint**: すべてのユーザーストーリーが独立に動作する。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全ユーザーストーリーに共通する仕上げ

- [ ] T017 [P] `public/css/styles.css` にリマインダー表示・チェックインボタン・
  ON/OFF切り替えUIの見た目を整える。
- [ ] T018 `quickstart.md` の全シナリオを手動実行し、動作を確認する。
- [ ] T019 `npm test` を実行し全テストがパスし、`logs/tdd-run.log` に記録される
  ことを確認する。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可能。
- **Foundational (Phase 2)**: Setup完了後。すべてのユーザーストーリーをブロック
  する（`reminderEnabled`フィールドに全ストーリーが依存するため）。
- **User Story 1 (Phase 3)**: Foundational完了後。他のストーリーへの依存なし。
- **User Story 2 (Phase 4)**: Foundational完了後。`GET /api/reminders`
  （User Story 1で作成）を前提に「一覧から消えること」を検証するため、実質的に
  User Story 1完了後に着手する。バックエンドの新規実装はない。
- **User Story 3 (Phase 5)**: Foundational完了後。`GET /api/reminders`
  （User Story 1）を前提に検証するため、実質的にUser Story 1完了後に着手する。
- **Polish (Phase 6)**: すべての対象ユーザーストーリー完了後。

### User Story Dependencies

- **User Story 1 (P1)**: 他のストーリーに依存しない。MVP。
- **User Story 2 (P2)**: `GET /api/reminders`（User Story 1）を前提にテストするため
  順次実装するが、バックエンドの新規実装はなく既存の`002`のチェックインAPIを
  再利用するのみ。
- **User Story 3 (P3)**: `GET /api/reminders`（User Story 1）・`reminderEnabled`
  （Foundational）を前提にテストする。

### Within Each User Story

- テストを先に書き、失敗を確認してから実装する（憲章原則I）
- ドメインロジック → ルート → フロントエンドUI の順で実装する
- ストーリー完了後に次の優先度のストーリーへ進む

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストは並行して書ける（異なるファイル）:
Task: "tests/unit/domain/reminder.test.ts にリマインダー一覧算出のユニットテストを作成"
Task: "tests/integration/reminders.test.ts にGET /api/remindersの統合テストを作成"
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
- フロントエンドUI（`public/`配下）は`001`〜`004`と同じ方針でTDD対象外とし、
  `quickstart.md`による手動検証で品質を保証する
- リマインダーからのチェックイン（User Story 2）・目標未依存の位置づけである点は
  spec.mdの設計判断どおりであり、新規のチェックイン検証ロジックは追加しない
