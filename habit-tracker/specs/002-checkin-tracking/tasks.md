---

description: "Task list template for feature implementation"
---

# Tasks: チェックイン・ストリーク計算

**Input**: Design documents from `/specs/002-checkin-tracking/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/checkins-api.md, research.md,
quickstart.md（すべて利用可能）。`001-habit-management`の実装が完了していることが前提。

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
  （`plan.md`のProject Structure参照）。ディレクトリ自体は`001-habit-management`で
  作成済みのため、新規ディレクトリ作成タスクは不要。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 本機能に必要な依存関係の確認（`001`の環境をそのまま利用するため、新規
インストールは想定していない）

- [ ] T001 [P] `package.json`の依存関係を確認し、新規追加が不要であることを確認する
  （`node:sqlite`・`crypto`はNode.js組み込みのため追加インストール不要）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが依存する共通基盤

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始できない

- [ ] T002 `src/repositories/db.ts` を拡張し、接続初期化時に `PRAGMA foreign_keys = ON;`
  を実行するとともに、`checkins` テーブルのスキーマ初期化（`CREATE TABLE IF NOT
  EXISTS`、`UNIQUE(habit_id, date)`、`habit_id` への `ON DELETE CASCADE` 外部キー）を
  追加する（`data-model.md`のSQLスキーマ参照）。

**Checkpoint**: 基盤完了。ユーザーストーリーの実装を開始できる。

---

## Phase 3: User Story 1 - 今日の習慣をチェックインする (Priority: P1) 🎯 MVP

**Goal**: ユーザーが習慣一覧から今日実行した習慣にチェックインし、記録できる。

**Independent Test**: 習慣一覧から1件の習慣にチェックインし、「本日チェックイン済み」
と表示されることを確認する（`quickstart.md` 手順2）。

### Tests for User Story 1 ⚠️

> **NOTE: これらのテストを先に作成し、失敗することを確認してから実装する**

- [ ] T003 [P] [US1] `tests/unit/domain/checkin.test.ts` に、チェックインの検証ロジック
  （日付デフォルト適用、未来日エラー、習慣の作成日より前エラー、重複エラー:
  FR-002〜FR-005）のユニットテストを作成する。
- [ ] T004 [P] [US1] `tests/integration/checkins.test.ts` に、
  `POST /api/habits/:habitId/checkins` の登録成功・重複エラー・作成日より前エラー・
  存在しない習慣IDエラー（spec.md Acceptance Scenario 1-3, FR-013）に加え、習慣を
  削除すると紐づくチェックインも連鎖削除されること（`001`の`DELETE /api/habits/:id`
  実行後、対象習慣の`GET /api/habits/:habitId/checkins`が404を返すことを検証する:
  FR-014）の統合テストを作成する。

### Implementation for User Story 1

- [ ] T005 [US1] `src/domain/checkin.ts` に、チェックインの検証ロジック（日付デフォルト・
  未来日・作成日より前・重複判定）を実装し、T003のテストをパスさせる。
- [ ] T006 [US1] `src/repositories/checkinRepository.ts` に `create()` と
  `findByHabitId()`（`date`の降順）を実装する（T002の`db.ts`を使用）。
- [ ] T007 [US1] `src/routes/checkins.ts` に `POST /api/habits/:habitId/checkins` と
  `GET /api/habits/:habitId/checkins`（`contracts/checkins-api.md`参照）を実装し、
  `src/app.ts` にルーターをマウントする。存在しない習慣IDの場合404を返す。T004の
  テストをパスさせる。
- [ ] T008 [US1] `public/index.html` と `public/js/habits.js` に、習慣一覧の各行へ
  チェックインボタンと「本日チェックイン済み」表示を追加する（`GET .../checkins`の
  結果から当日分の有無をフロントエンドで判定する）。

**Checkpoint**: User Story 1が単独で完全に動作・テスト可能（MVP）。

---

## Phase 4: User Story 2 - 現在のストリークを確認する (Priority: P2)

**Goal**: ユーザーが各習慣の現在の継続記録（ストリーク）を確認できる。

**Independent Test**: 頻度「毎日」の習慣に3日連続でチェックインし、ストリークが3日と
表示されることを確認する（`quickstart.md` 手順3）。

### Tests for User Story 2 ⚠️

- [ ] T009 [P] [US2] `tests/unit/domain/streak.test.ts` に、頻度「毎日」「毎週」それぞれの
  ストリーク計算ロジック（当日未チェックインの保留、途切れによるリセット、対象外曜日の
  スキップ、習慣の作成日境界、頻度変更時の再計算: FR-008〜FR-011, FR-015）のユニット
  テストを作成する。
- [ ] T010 [P] [US2] `tests/integration/habits.test.ts` に、`GET /api/habits`の
  レスポンスに `currentStreak` が正しく含まれること（spec.md Acceptance Scenario 1,
  3-4）の統合テストを追加する。

### Implementation for User Story 2

- [ ] T011 [US2] `src/domain/streak.ts` に、習慣の頻度・チェックイン日付集合・今日の
  日付から現在のストリークを計算する純粋関数を実装し、T009のテストをパスさせる
  （`research.md`「2. ストリーク計算アルゴリズム」参照）。
- [ ] T012 [US2] `src/routes/habits.ts` のGETハンドラ（一覧・カテゴリ絞り込み）を
  拡張し、`checkinRepository.findByHabitId()` と `streak.ts` を用いて各習慣に
  `currentStreak` を付加する。T010のテストをパスさせる。
- [ ] T013 [US2] `public/js/habits.js` と `public/index.html` に、習慣一覧の各行へ
  現在のストリーク（継続日数）を表示するUIを追加する。

**Checkpoint**: User Story 1・2がともに単独で動作する。

---

## Phase 5: User Story 3 - 過去のチェックイン履歴を確認し、取り消す (Priority: P3)

**Goal**: ユーザーが習慣ごとのチェックイン履歴を確認し、誤ったチェックインを取り消せる。

**Independent Test**: 習慣に複数回チェックインした状態で履歴一覧を開き、新しい順に
表示されることを確認する。1件を取り消し、履歴とストリークが更新されることを確認する
（`quickstart.md` 手順4）。

### Tests for User Story 3 ⚠️

- [ ] T014 [P] [US3] `tests/integration/checkins.test.ts` に、
  `GET /api/habits/:habitId/checkins` の履歴が日付の新しい順に返ること、
  `DELETE /api/habits/:habitId/checkins/:checkinId` の取り消し成功・存在しない
  習慣ID/チェックインID時404（spec.md Acceptance Scenario 1-4, FR-006, FR-013）の
  統合テストを追加する。

### Implementation for User Story 3

- [ ] T015 [US3] `src/repositories/checkinRepository.ts` に `delete()` を実装する。
- [ ] T016 [US3] `src/routes/checkins.ts` に
  `DELETE /api/habits/:habitId/checkins/:checkinId` を実装し、存在しない習慣ID・
  チェックインIDの場合404を返す。T014のテストをパスさせる。
- [ ] T017 [US3] `public/js/habits.js` と `public/index.html` に、チェックイン履歴の
  一覧表示と、取り消しボタン＋確認ダイアログのUI（FR-007）を追加する。

**Checkpoint**: すべてのユーザーストーリーが独立に動作する。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全ユーザーストーリーに共通する仕上げ

- [ ] T018 [P] `public/css/styles.css` にチェックイン・ストリーク・履歴UIの見た目を
  整える。
- [ ] T019 `quickstart.md` の全シナリオを手動実行し、動作を確認する。特にチェックイン
  取り消しの確認ダイアログの表示・キャンセル動作（FR-007）を含めて確認する。
- [ ] T020 習慣削除時のチェックインカスケード削除（FR-014）を手動確認する。習慣を
  削除し、対応する`checkins`レコードが（APIまたはDB経由で）残っていないことを確認する。
- [ ] T021 `npm test` を実行し全テストがパスし、`logs/tdd-run.log` に記録されることを
  確認する。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可能。
- **Foundational (Phase 2)**: Setup完了後。すべてのユーザーストーリーをブロックする。
- **User Story 1 (Phase 3)**: Foundational完了後。他のストーリーへの依存なし。
- **User Story 2 (Phase 4)**: Foundational完了後。`src/routes/habits.ts`を拡張し
  `checkinRepository`（User Story 1で作成）を利用するため、実質的にUser Story 1
  完了後に着手する。
- **User Story 3 (Phase 5)**: Foundational完了後。`checkinRepository`/
  `src/routes/checkins.ts`（User Story 1で作成）を拡張するため、実質的にUser Story 1
  完了後に着手する。
- **Polish (Phase 6)**: すべての対象ユーザーストーリー完了後。

### User Story Dependencies

- **User Story 1 (P1)**: 他のストーリーに依存しない。MVP。
- **User Story 2 (P2)**: `checkinRepository.findByHabitId()`（User Story 1）の結果を
  利用してストリークを計算するため、ファイルレベルでは順次実装（機能的には独立して
  テスト可能）。
- **User Story 3 (P3)**: `src/routes/checkins.ts`・`checkinRepository`
  （User Story 1）を拡張する（機能的には独立してテスト可能）。

### Within Each User Story

- テストを先に書き、失敗を確認してから実装する（憲章原則I）
- ドメインロジック → リポジトリ → ルート → フロントエンドUI の順で実装する
- ストーリー完了後に次の優先度のストーリーへ進む

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストは並行して書ける（異なるファイル）:
Task: "tests/unit/domain/checkin.test.ts に検証ロジックのユニットテストを作成"
Task: "tests/integration/checkins.test.ts にPOST/GETの統合テストを作成"
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
- フロントエンドUI（`public/`配下）は`001`と同じ方針でTDD対象外とし、
  `quickstart.md`による手動検証で品質を保証する
