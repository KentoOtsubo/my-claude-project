---

description: "Task list template for feature implementation"
---

# Tasks: 習慣管理（CRUD・カテゴリ分類）

**Input**: Design documents from `/specs/001-habit-management/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/habits-api.md, research.md,
quickstart.md（すべて利用可能）

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
  （`plan.md`のProject Structure参照）

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 本機能の実装に必要なディレクトリ構成を用意する

- [X] T001 [P] `src/domain/`, `src/repositories/`, `src/routes/` ディレクトリを作成する
  （`plan.md`のProject Structureに従う）
- [X] T002 [P] `public/css/`, `public/js/` ディレクトリを作成する

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが依存する共通基盤

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始できない

- [X] T003 `src/repositories/db.ts` に `node:sqlite` の `DatabaseSync` 接続と `habits`
  テーブルのスキーマ初期化（`CREATE TABLE IF NOT EXISTS`）を実装する。ファイルパス・
  `:memory:` の両方を受け付けられるようにする（`data-model.md`のSQLスキーマ参照）。
- [X] T004 [P] `src/app.ts` に `express.static("public")` ミドルウェアを追加し、
  `public/` 配下の静的ファイルを配信できるようにする。

**Checkpoint**: 基盤完了。ユーザーストーリーの実装を開始できる。

---

## Phase 3: User Story 1 - 習慣を登録する (Priority: P1) 🎯 MVP

**Goal**: ユーザーが名前・頻度・カテゴリを指定して新しい習慣を登録し、一覧に表示できる。

**Independent Test**: 習慣登録フォームから名前・頻度・カテゴリを入力して登録操作を行い、
一覧に登録した習慣が表示されることを確認する（`quickstart.md` 手順2）。

### Tests for User Story 1 ⚠️

> **NOTE: これらのテストを先に作成し、失敗することを確認してから実装する**

- [X] T005 [P] [US1] `tests/unit/domain/habit.test.ts` に、頻度・カテゴリのデフォルト値
  適用と検証ロジック（FR-002〜FR-006）のユニットテストを作成する。
- [X] T006 [P] [US1] `tests/integration/habits.test.ts` に、`POST /api/habits` の登録
  成功・名前必須エラー・デフォルト値適用（spec.md Acceptance Scenario 1-3）と
  `GET /api/habits`（フィルタなし一覧）の統合テストを作成する。

### Implementation for User Story 1

- [X] T007 [US1] `src/domain/habit.ts` に、頻度・カテゴリのデフォルト値適用と検証ロジック
  （`validateAndNormalizeHabitInput`等）を実装し、T005のテストをパスさせる。
- [X] T008 [US1] `src/repositories/habitRepository.ts` に `create()` と `findAll()` を
  実装する（T003の`db.ts`を使用）。
- [X] T009 [US1] `src/routes/habits.ts` に `POST /api/habits` と `GET /api/habits`
  （フィルタなし、`contracts/habits-api.md`参照）を実装し、`src/app.ts` にルーターを
  マウントする。T006のテストをパスさせる。
- [X] T010 [US1] `public/index.html` と `public/js/habits.js` に、習慣登録フォームと
  一覧表示のUIを実装する（`quickstart.md`手順2参照）。

**Checkpoint**: User Story 1が単独で完全に動作・テスト可能（MVP）。

---

## Phase 4: User Story 2 - 習慣の一覧を確認し編集・削除する (Priority: P2)

**Goal**: ユーザーが登録済みの習慣を編集・削除できる。

**Independent Test**: 事前に登録済みの習慣を1件用意し、一覧から編集して内容が更新される
こと、削除して一覧から消えることを確認する（`quickstart.md` 手順3）。

### Tests for User Story 2 ⚠️

- [X] T011 [P] [US2] `tests/integration/habits.test.ts` に、`PUT /api/habits/:id`
  （更新成功・存在しないID時404）と `DELETE /api/habits/:id`（削除成功・存在しないID時
  404）の統合テストを追加する（spec.md Acceptance Scenario 2-5）。

### Implementation for User Story 2

- [X] T012 [US2] `src/repositories/habitRepository.ts` に `findById()`・`update()`・
  `delete()` を実装する。`update()`は既存レコードと送信フィールドをマージしたうえで
  `src/domain/habit.ts`の検証ロジックを再適用する（`data-model.md`「部分更新（PUT）時の
  マージ方針」参照）。
- [X] T013 [US2] `src/routes/habits.ts` に `PUT /api/habits/:id` と
  `DELETE /api/habits/:id` を実装し、存在しないIDの場合404を返す（FR-012）。T011の
  テストをパスさせる。
- [X] T014 [US2] `public/js/habits.js` と `public/index.html` に、編集フォームと削除
  確認ダイアログのUI（FR-011）を追加する。

**Checkpoint**: User Story 1・2がともに単独で動作する。

---

## Phase 5: User Story 3 - カテゴリで習慣を分類・絞り込む (Priority: P3)

**Goal**: ユーザーが習慣一覧をカテゴリで絞り込める。

**Independent Test**: 異なるカテゴリの習慣を複数件登録した状態で、カテゴリを1つ選択して
一覧を絞り込み、選択したカテゴリの習慣のみが表示されることを確認する
（`quickstart.md` 手順4）。

### Tests for User Story 3 ⚠️

- [X] T015 [P] [US3] `tests/integration/habits.test.ts` に、
  `GET /api/habits?category=...` の絞り込み動作と絞り込み解除（spec.md Acceptance
  Scenario 1-2）の統合テストを追加する。

### Implementation for User Story 3

- [X] T016 [US3] `src/repositories/habitRepository.ts` の `findAll()` に `category`
  フィルタ引数を追加する。
- [X] T017 [US3] `src/routes/habits.ts` の `GET /api/habits` に `category` クエリ
  パラメータの処理を追加し、不正な値の場合400を返す（FR-008）。T015のテストをパス
  させる。
- [X] T018 [US3] `public/js/habits.js` と `public/index.html` に、カテゴリ絞り込みUI
  （セレクトボックス等）を追加する。

**Checkpoint**: すべてのユーザーストーリーが独立に動作する。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全ユーザーストーリーに共通する仕上げ

- [X] T019 [P] `public/css/styles.css` に登録フォーム・一覧・絞り込みUIの見た目を整える。
- [X] T020 `quickstart.md` の全シナリオを手動実行し、動作を確認する。特に削除確認ダイア
  ログの表示・キャンセル動作（FR-011, SC-004）を含めて確認する。
- [X] T021 `npm test` を実行し全テストがパスし、`logs/tdd-run.log` に記録されることを
  確認する。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可能。
- **Foundational (Phase 2)**: Setup完了後。すべてのユーザーストーリーをブロックする。
- **User Story 1 (Phase 3)**: Foundational完了後。他のストーリーへの依存なし。
- **User Story 2 (Phase 4)**: Foundational完了後。User Story 1の`habits.ts`/
  `habitRepository.ts`を拡張するため、実質的にUser Story 1完了後に着手する。
- **User Story 3 (Phase 5)**: Foundational完了後。User Story 1の`GET /api/habits`を
  拡張するため、実質的にUser Story 1完了後に着手する。
- **Polish (Phase 6)**: すべての対象ユーザーストーリー完了後。

### User Story Dependencies

- **User Story 1 (P1)**: 他のストーリーに依存しない。MVP。
- **User Story 2 (P2)**: `src/routes/habits.ts`・`src/repositories/habitRepository.ts`
  はUser Story 1で作成されるため、ファイルレベルでは順次実装（機能的には独立してテスト
  可能）。
- **User Story 3 (P3)**: 同上（`GET /api/habits`ハンドラを拡張）。

### Within Each User Story

- テストを先に書き、失敗を確認してから実装する（憲章原則I）
- ドメインロジック → リポジトリ → ルート → フロントエンドUI の順で実装する
- ストーリー完了後に次の優先度のストーリーへ進む

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストは並行して書ける（異なるファイル）:
Task: "tests/unit/domain/habit.test.ts に検証ロジックのユニットテストを作成"
Task: "tests/integration/habits.test.ts にPOST/GETの統合テストを作成"
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
