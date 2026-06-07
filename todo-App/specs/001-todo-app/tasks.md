# Tasks: ToDo管理アプリ

**Input**: Design documents from `/specs/001-todo-app/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tech Stack**: HTML5, CSS3, Vanilla JavaScript (ES2020+), sql.js 1.10.3 (CDN), IndexedDB

**Organization**: タスクはユーザーストーリー単位でグループ化されており、各ストーリーを独立して実装・テスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル・未完了タスクへの依存なし）
- **[Story]**: 対象ユーザーストーリー（US1, US2, US3, US4）
- 説明には正確なファイルパスを含める

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: ディレクトリ構造とファイルの骨格を作成する

- [ ] T001 プロジェクト構造を作成する（`index.html`・`css/styles.css`・`js/db.js`・`js/app.js` を空ファイルとして配置）

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: すべてのユーザーストーリーに必要な共通基盤を構築する

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始できない

- [ ] T002 [P] `index.html` にHTML5骨格を記述する（DOCTYPE・head・body・sql.js v1.10.3 CDN読み込み `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js`・`css/styles.css`・`js/db.js`・`js/app.js` の参照）
- [ ] T003 [P] `js/db.js` に `DB.init()` を実装する（`initSqlJs` 呼び出し・`locateFile` で CDN の WASMファイルを指定・IndexedDB `TodoDB/database/sqlite-db` から保存済みバイナリを読み込む・`CREATE TABLE IF NOT EXISTS tasks` スキーマ作成・グローバル変数 `db` を管理）
- [ ] T004 [P] `css/styles.css` にCSS変数（カラー・スペーシング）・CSSリセット・基本レイアウト（`body`・コンテナ幅）・モーダルオーバーレイの共通ベーススタイルを記述する
- [ ] T005 [P] `js/app.js` に `state` オブジェクト（`tasks`・`activeModal`・`editingTaskId`・`deletingTaskId`）・`DOMContentLoaded` ハンドラ・`DB.init()` 呼び出しエントリポイントを実装する

**Checkpoint**: 基盤完成 — ユーザーストーリーの実装を開始できる

---

## Phase 3: User Story 1 - タスクの作成と一覧表示（Priority: P1）🎯 MVP

**Goal**: ユーザーがタスクを作成し一覧表示できる。ページ再読み込み後もデータが IndexedDB に保持される。

**Independent Test**: アプリを開き「新規作成」ボタンをクリック → タイトル入力 → 作成後、一覧に表示されることを確認。ページ再読み込み後もタスクが残ることを確認。空タイトルでの作成拒否（FR-006）と Esc キーでのキャンセル（US1-5）を確認。

### Implementation for User Story 1

- [ ] T006 [P] [US1] `js/db.js` に `DB.createTask(title)` と `DB.getAllTasks()` を実装する（`createTask`: `title.trim()` バリデーション・`INSERT` クエリ・`created_at` に `Date.now()`・IndexedDB 保存・Task オブジェクト返却 / `getAllTasks`: `ORDER BY completed ASC, created_at DESC`・SQLite integer を boolean に変換して返す）
- [ ] T007 [P] [US1] `index.html` にタスク一覧エリア（`<ul id="task-list">`）・エンプティステートメッセージ要素（`id="empty-state"`）・「新規作成」ボタン（`id="btn-create"`）・新規作成モーダル（`id="create-modal"`・タイトル入力 `id="create-title-input"`・エラーメッセージ領域 `id="create-error"`・「作成」「キャンセル」ボタン）の HTML を追加する
- [ ] T008 [P] [US1] `css/styles.css` にタスク一覧・タスクアイテム・「新規作成」ボタン・新規作成モーダル（オーバーレイ・ダイアログ・入力欄・ボタン・エラーテキスト）のスタイルを追加する
- [ ] T009 [US1] `js/app.js` に `renderTasks(tasks)` を実装する（未完了タスク上部・完了済み下部のグループ表示・FR-002 のソート順に従う・`tasks.length === 0` 時はエンプティステート表示・各タスクアイテムに完了チェックボックス・編集ボタン・削除ボタンを含む・長タイトルは CSS 省略表示 `overflow: hidden; text-overflow: ellipsis`）
- [ ] T010 [US1] `js/app.js` に `openCreateModal()` と `closeModal()` を実装する（`state.activeModal` 更新・モーダル表示/非表示切り替え・`create-title-input` のクリアと自動フォーカス・`keydown` Esc リスナーの付与/除去）
- [ ] T011 [US1] `js/app.js` に「新規作成」ボタンのクリックハンドラと「作成」ボタンのハンドラを実装する（`title.trim()` バリデーション・空の場合は `create-error` にエラーメッセージ表示してモーダルを閉じない・`DB.createTask()` 呼び出し・`state.tasks` 更新・`renderTasks()` 再描画・`closeModal()` 呼び出し）

**Checkpoint**: この時点で User Story 1 は完全に独立してテスト可能

---

## Phase 4: User Story 2 - 完了状態の切り替え（Priority: P2）

**Goal**: チェックボックスをクリックして完了/未完了をトグルできる。完了済みタスクは視覚的に区別され一覧下部グループへ移動する。

**Independent Test**: タスクを作成し、チェックボックスをクリックして完了済みになり下部グループへ移動することを確認。再クリックで未完了に戻り上部グループへ戻ることを確認。ページ再読み込み後も状態が保持されることを確認。

### Implementation for User Story 2

- [ ] T012 [US2] `js/db.js` に `DB.toggleTaskCompletion(id)` を実装する（`SELECT completed FROM tasks WHERE id=?` で現在値を取得して反転する `UPDATE` クエリ・IndexedDB 保存）
- [ ] T013 [P] [US2] `css/styles.css` に完了済みタスクのビジュアルスタイルを追加する（タイトルへの `text-decoration: line-through`・テキストのグレーアウト・未完了/完了グループ間のセパレーター）
- [ ] T014 [US2] `js/app.js` にチェックボックスの `change` イベントハンドラを実装する（`DB.toggleTaskCompletion(id)` 呼び出し・`DB.getAllTasks()` で最新データ取得・`state.tasks` 更新・`renderTasks()` 再描画）

**Checkpoint**: この時点で User Story 1 と User Story 2 が独立してテスト可能

---

## Phase 5: User Story 3 - タスクタイトルの編集（Priority: P3）

**Goal**: 既存タスクのタイトルを編集モーダルで変更できる。保存後は一覧に即座に反映され、ページ再読み込み後も保持される。

**Independent Test**: タスクを作成し編集ボタンをクリック → 現在のタイトルが入力済みの編集モーダルが開くことを確認。タイトル変更後に保存 → 一覧に更新タイトルが表示されることを確認。空タイトルでの保存拒否（US3-3）とキャンセルボタンの動作（US3-4）を確認。

### Implementation for User Story 3

- [ ] T015 [US3] `js/db.js` に `DB.updateTaskTitle(id, title)` を実装する（`title.trim()` バリデーション・`UPDATE tasks SET title=? WHERE id=?` クエリ・IndexedDB 保存）
- [ ] T016 [P] [US3] `index.html` に編集モーダルの HTML を追加する（`id="edit-modal"`・タイトル入力 `id="edit-title-input"`・エラーメッセージ領域 `id="edit-error"`・「保存」`id="btn-save-edit"` と「キャンセル」ボタン）
- [ ] T017 [P] [US3] `css/styles.css` に編集モーダルのスタイルを追加する（新規作成モーダルと共通スタイルを再利用・差分スタイルのみ追加）
- [ ] T018 [US3] `js/app.js` に編集ボタンのクリックハンドラと `openEditModal(taskId, currentTitle)` を実装する（`state.editingTaskId` 更新・`edit-title-input` に現在のタイトルをセット・`state.activeModal = 'edit'` 更新・モーダル表示・自動フォーカス・Esc キーリスナー付与）
- [ ] T019 [US3] `js/app.js` に編集モーダルの「保存」ボタンのハンドラを実装する（`title.trim()` バリデーション・空の場合は `edit-error` にエラーメッセージ表示・`DB.updateTaskTitle(state.editingTaskId, title)` 呼び出し・`DB.getAllTasks()` で最新データ取得・`renderTasks()` 再描画・`closeModal()` 呼び出し）

**Checkpoint**: この時点で User Story 1・2・3 が独立してテスト可能

---

## Phase 6: User Story 4 - タスクの削除（Priority: P4）

**Goal**: 削除ボタンから確認ダイアログを経由してタスクを完全に削除できる。最後の1件削除後はエンプティステートが表示される。

**Independent Test**: タスクを作成し削除ボタンをクリック → 確認ダイアログが表示されることを確認。「削除する」でタスクが一覧から消えることを確認。「キャンセル」でタスクが残ることを確認。最後の1件を削除後にエンプティステートメッセージが表示されることを確認。

### Implementation for User Story 4

- [ ] T020 [US4] `js/db.js` に `DB.deleteTask(id)` を実装する（`DELETE FROM tasks WHERE id=?` クエリ・IndexedDB 保存）
- [ ] T021 [P] [US4] `index.html` に削除確認ダイアログの HTML を追加する（`id="confirm-dialog"`・確認メッセージテキスト・「削除する」`id="btn-confirm-delete"` と「キャンセル」ボタン）
- [ ] T022 [P] [US4] `css/styles.css` に削除確認ダイアログのスタイルを追加する（モーダルオーバーレイ共通スタイル適用・削除ボタンの警告色）
- [ ] T023 [US4] `js/app.js` に削除ボタンのクリックハンドラと `openConfirmDialog(taskId)` を実装する（`state.deletingTaskId` 更新・`state.activeModal = 'confirm-delete'` 更新・ダイアログ表示・Esc キーリスナー付与）
- [ ] T024 [US4] `js/app.js` に「削除する」ボタンのハンドラを実装する（`DB.deleteTask(state.deletingTaskId)` 呼び出し・`DB.getAllTasks()` で最新データ取得・`state.tasks` 更新・`renderTasks()` 再描画・`closeModal()` 呼び出し）

**Checkpoint**: すべてのユーザーストーリーが独立してテスト可能な状態

---

## Phase 7: Polish & Cross-Cutting Concerns（横断的関心事）

**Purpose**: 複数ユーザーストーリーに影響する改善・アクセシビリティ・エラーハンドリング・レスポンシブ対応

- [ ] T025 [P] `index.html` にローディングインジケーター（`id="loading"`・sql.js 初期化中に表示）とエラーUI（`id="init-error"`・初期化失敗時に表示）用の HTML 要素を追加する
- [ ] T026 [P] `css/styles.css` にローディングインジケーター・エラーUI表示スタイル・レスポンシブ対応（モバイル幅での横スクロールなし・SC-004）・長タイトルの省略表示（`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`）スタイルを追加する
- [ ] T027 `js/app.js` に sql.js 初期化失敗時のエラーUI表示ロジックとローディングインジケーターの表示/非表示制御を実装する（`DB.init()` の try-catch・失敗時に `init-error` を表示・成功時に `loading` を非表示にして UI を表示・FR-008 に関連）
- [ ] T028 `js/app.js` にグローバルキーボード操作を実装する（`document` の `keydown` イベントで Esc キー押下時に `state.activeModal` に応じて `closeModal()` を呼び出す・モーダルオープン時に入力フィールドへ確実に `focus()` を付与する・FR-011 全操作のキーボード対応）
- [ ] T029 `quickstart.md` の動作確認チェックリスト（7項目）に従って全ユーザーストーリーのすべての受け入れシナリオをブラウザで手動テストし、問題がないことを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即座に開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — **すべてのユーザーストーリーをブロック**
- **US1 (Phase 3)**: Phase 2 完了後 — 他のユーザーストーリーに依存しない
- **US2 (Phase 4)**: Phase 2 完了後 — `renderTasks()` は US1 で実装済みを利用
- **US3 (Phase 5)**: Phase 2 完了後 — `closeModal()`・`renderTasks()` は US1 で実装済みを利用
- **US4 (Phase 6)**: Phase 2 完了後 — `closeModal()`・`renderTasks()` は US1 で実装済みを利用
- **Polish (Phase 7)**: すべてのユーザーストーリー完了後

### User Story Dependencies

| ユーザーストーリー | 開始条件 | 備考 |
|---|---|---|
| US1 (P1) | Phase 2 完了後 | 依存なし |
| US2 (P2) | Phase 2 完了後 | US1 の `renderTasks()` を利用 |
| US3 (P3) | Phase 2 完了後 | US1 の `closeModal()`・`renderTasks()` を利用 |
| US4 (P4) | Phase 2 完了後 | US1 の `closeModal()`・`renderTasks()` を利用 |

### Within Each User Story

1. db.js CRUD 実装 + index.html HTML 追加 + css スタイル追加（**並列可能 — 異なるファイル**）
2. app.js レンダリング実装（db.js・HTML に依存）
3. app.js イベントハンドラ実装（レンダリングに依存）

### Parallel Opportunities

| フェーズ | 並列実行可能タスク |
|---|---|
| Phase 2 | T002, T003, T004, T005（各ファイルが異なる） |
| Phase 3 US1 | T006, T007, T008（db.js・index.html・styles.css） |
| Phase 4 US2 | T012, T013（db.js・styles.css） |
| Phase 5 US3 | T015, T016, T017（db.js・index.html・styles.css） |
| Phase 6 US4 | T020, T021, T022（db.js・index.html・styles.css） |
| Phase 7 | T025, T026（index.html・styles.css） |

---

## Parallel Example: User Story 1

```bash
# Step 1: 以下3タスクを並列実行（異なるファイル）
Task T006: DB.createTask() / DB.getAllTasks() を js/db.js に実装
Task T007: タスク一覧・新規作成モーダルの HTML を index.html に追加
Task T008: タスク一覧・モーダルのスタイルを css/styles.css に追加

# Step 2: T006・T007 完了後（順次 — 両ファイルに依存）
Task T009: renderTasks() を js/app.js に実装

# Step 3: T009 完了後（順次）
Task T010: openCreateModal() / closeModal() を js/app.js に実装

# Step 4: T010 完了後（順次）
Task T011: タスク作成ハンドラを js/app.js に実装
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（**必須 — すべてをブロック**）
3. Phase 3: User Story 1 完了
4. **STOP & VALIDATE**: US1 を独立してテスト（タスク作成・一覧表示・IndexedDB 永続化確認）
5. デプロイ/デモ準備完了

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1 追加 → 独立テスト → デプロイ/デモ（**MVP！**）
3. US2 追加 → 独立テスト → デプロイ/デモ
4. US3 追加 → 独立テスト → デプロイ/デモ
5. US4 追加 → 独立テスト → デプロイ/デモ
6. Polish → 品質向上・全ストーリー結合テスト

---

## Notes

- `[P]` = 異なるファイル・未完了タスクへの依存なし — 並列実行可能
- `[USn]` ラベルはタスクを特定ユーザーストーリーにトレーサビリティ付きでマッピングする
- 各ユーザーストーリーは独立して完成・テスト可能
- チェックポイントで各ストーリーを単独で検証してから次へ進む
- コミット: 各タスクまたは論理グループ完了後に実施
- 手動テストはブラウザの DevTools Console でエラーがないことも確認する
