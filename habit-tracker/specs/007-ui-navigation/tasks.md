---

description: "Task list template for feature implementation"
---

# Tasks: 画面遷移UI（トップ・タブ・一覧・登録編集の分割）

**Input**: Design documents from `/specs/007-ui-navigation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md（すべて
利用可能）。`001-habit-management`〜`006-persistent-storage`の実装が完了していること
が前提。

**Tests**: 本機能はフロントエンド（`public/`配下のVanilla JS）の画面構成変更のみで
あり、バックエンドAPI・データモデルを変更しないため、`001`〜`006`と同じ既定方針
（フロントエンドUIはDOMテストツール未導入のためTDD対象外）を踏襲する。自動テスト
タスクは含めず、各ユーザーストーリーの完了確認は`quickstart.md`の該当手順による
手動検証で行う。既存の統合テスト（137件）はバックエンドの回帰確認としてPolishで
再実行する。

**Organization**: タスクはユーザーストーリー単位でグループ化し、各ストーリーを独立に
検証できるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（異なるファイル・依存関係なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2, US3, US4）
- 各タスクに正確なファイルパスを含める

## Path Conventions

- 単一プロジェクト構成: `src/`, `tests/`, `public/` はリポジトリルート直下
  （`plan.md`のProject Structure参照）。`src/`・`tests/`は本機能で変更しない。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: モジュール分割の受け皿となるディレクトリを準備する

- [ ] T001 `public/js/views/` ディレクトリを作成する（画面単位のJSモジュールの
  格納先、`plan.md`のProject Structure参照）。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが依存する共通基盤（タブ切り替えの土台・
共通モジュール）を構築する

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始できない
（各ビューは`app.js`のタブ切り替え機構と`api.js`/`format.js`の共通処理に依存する）

- [ ] T002 [P] `public/js/format.js` を新規作成し、既存`public/js/habits.js`から
  表示用の共通ヘルパー（`FREQUENCY_LABELS`, `CATEGORY_LABELS`, `WEEKDAY_LABELS`,
  `JST_OFFSET_MS`, `todayString`, `dayOfWeek`, `isTargetDay`, `formatHabit`,
  `formatGoalPeriod`）を抽出してexportする（`research.md`「2.」参照、ロジックの
  変更は行わない）。
- [ ] T003 [P] `public/js/api.js` を新規作成し、既存`public/js/habits.js`内の
  `fetch`呼び出しを、リソース単位の関数（習慣の一覧取得・作成・更新・削除、
  チェックインの作成・取得・削除、目標の一覧取得・作成・更新・削除、
  ダッシュボード取得、リマインダー取得）として整理してexportする（既存の
  リクエスト/レスポンス形式は変更しない、`plan.md`のTechnical Context「Primary
  Dependencies」参照）。
- [ ] T004 `public/index.html` を再構成する。常時表示のタブメニュー（`nav`要素、
  「ホーム」「習慣」「目標」「ダッシュボード」の4ボタン）を追加し、
  `<section id="view-home">` `<section id="view-habit-list">`
  `<section id="view-habit-form">` `<section id="view-goal-list">`
  `<section id="view-goal-form">` `<section id="view-dashboard">`の6つの空の
  `<section>`枠（`data-model.md`の画面一覧参照）を用意する。この時点では
  既存の各セクション（リマインダー、習慣登録フォーム、習慣一覧、目標設定
  フォーム、目標一覧、ダッシュボード）の中身は移設しない（各`<section>`の
  中身の実装・既存マークアップの移設は、対応するユーザーストーリーのタスク
  （T007, T010, T011, T014, T015, T018）が担当する。本タスクとの二重実装を
  避けるため、ここでは枠組みのみ用意する）。`view-home`以外の`section`には
  初期状態で`hidden`属性を付与する。`<script type="module">`の参照先は
  `js/app.js`に変更する。
- [ ] T005 `public/js/app.js` を新規作成し、`showView(name)`関数（指定した
  `<section>`以外のすべてに`hidden`を設定し、指定した`<section>`の`hidden`を
  解除する）と、タブメニュー4ボタンのクリックハンドラ（`home` /
  `habit-list` / `goal-list` / `dashboard`への切替）を実装する。この時点では
  各ビューの中身は空実装のプレースホルダで構わない（各ユーザーストーリーの
  フェーズで実装する）。初期表示は`home`とする。
- [ ] T006 [P] `public/css/styles.css` に、タブメニューの見た目とアクティブタブの
  強調表示のスタイルを追加する。

**Checkpoint**: タブ切り替えの土台が完成。ブラウザでアプリを開き、4つのタブを
それぞれクリックして対応する（空の）セクションに切り替わり、コンソールエラーが
発生しないことを手動確認したら、ユーザーストーリーの実装を開始できる。

---

## Phase 3: User Story 1 - 迷わず目的の一覧にたどり着ける (Priority: P1) 🎯 MVP

**Goal**: トップページでリマインダー一覧・簡易サマリーを確認でき、タブメニューで
各画面へ迷わず移動でき、「ホーム」タブでいつでもトップページに戻れる。

**Independent Test**: 習慣3件・進行中の目標2件を登録した状態でアプリを開き、
トップページに「習慣3件」「目標2件」の簡易サマリーとリマインダー一覧が表示され、
各タブへの切替と「ホーム」への復帰が機能することを確認する（`quickstart.md`
手順2）。

### Implementation for User Story 1

- [ ] T007 [US1] `public/index.html`の`#view-home`に、既存のリマインダー
  セクションのマークアップ（`reminder-list`等）と、新規の簡易サマリー表示
  要素を配置する。あわせて`public/js/views/home.js`を新規作成し、
  `initHomeView()` / `refreshHomeView()`を実装する。リマインダー一覧
  （`api.js`のリマインダー取得 + `format.js`）と簡易サマリー（習慣数は習慣
  一覧取得件数、進行中の目標数は目標一覧取得結果を`startDate <= 本日 <=
  endDate`でフィルタしたカウント、`research.md`「4.」参照）を`#view-home`に
  描画する。リマインダーからのその場チェックイン（既存`005-reminders`の機能）
  もここに実装する。
- [ ] T008 [US1] `public/js/app.js` を拡張し、「ホーム」タブがアクティブになる
  たび（初期表示時を含む）に`refreshHomeView()`を呼び出すよう配線する。
- [ ] T009 [US1] `quickstart.md`手順2（User Story 1）を手動実行し、トップページの
  表示内容とタブ切り替え・「ホーム」への復帰を検証する。

**Checkpoint**: User Story 1が単独で完全に動作・検証可能（MVP）。

---

## Phase 4: User Story 2 - 習慣を一覧から登録・編集する (Priority: P1)

**Goal**: 習慣一覧画面から新規登録・編集画面へ移動して習慣を登録・更新でき、
完了またはキャンセルで自動的に一覧画面へ戻る。

**Independent Test**: 習慣一覧画面から新規登録した習慣が一覧に反映され、編集で
変更した内容も一覧に反映されることを確認する（`quickstart.md`手順3）。

### Implementation for User Story 2

- [ ] T010 [US2] `public/js/views/habitList.js` を新規作成し、既存
  `public/js/habits.js`の習慣一覧描画・カテゴリ絞り込み・チェックイン・削除
  ロジックを移設し、`initHabitListView()` / `refreshHabitListView()`として
  `#view-habit-list`に実装する。「新規登録」ボタンと各行の「編集」ボタンから
  `showView('habit-form')`を呼び出し、対応するモード（新規/編集）で
  `habitForm.js`を初期化する。
- [ ] T011 [US2] `public/js/views/habitForm.js` を新規作成し、既存
  `public/js/habits.js`の習慣登録・編集フォームロジック（新規/編集モード共通、
  頻度・曜日チェックボックス・カテゴリ・リマインダー表示チェックボックス）を
  移設し、`initHabitFormView(mode, habit?)`として`#view-habit-form`に実装する。
  登録・更新の成功時、およびキャンセル操作時のいずれも`showView('habit-list')`
  を呼び出し、`refreshHabitListView()`で一覧を再読み込みする（spec.md FR-006）。
- [ ] T012 [US2] `public/index.html`の`#view-habit-list` / `#view-habit-form`
  セクションに、新規登録・編集・登録（更新）・キャンセルの各ボタン/フォーム要素を
  配置する（既存`index.html`の習慣一覧・習慣登録フォームのマークアップを移設・
  再配置する）。
- [ ] T013 [US2] `quickstart.md`手順3（User Story 2）を手動実行し、習慣一覧⇄
  登録編集画面の遷移（新規登録・編集・キャンセル）を検証する。

**Checkpoint**: User Story 1・2がともに単独で動作する。

---

## Phase 5: User Story 3 - 目標を一覧から登録・編集する (Priority: P2)

**Goal**: 目標一覧画面から新規登録・編集画面へ移動して目標を登録・更新でき、
完了またはキャンセルで自動的に一覧画面へ戻る。

**Independent Test**: 目標一覧画面から新規登録した目標が一覧に反映され、編集で
変更した内容も一覧に反映されることを確認する（`quickstart.md`手順4）。

### Implementation for User Story 3

- [ ] T014 [US3] `public/js/views/goalList.js` を新規作成し、既存
  `public/js/habits.js`の目標一覧描画・削除ロジックを移設し、
  `initGoalListView()` / `refreshGoalListView()`として`#view-goal-list`に
  実装する。「新規登録」ボタンと各行の「編集」ボタンから`showView('goal-form')`
  を呼び出し、対応するモード（新規/編集）で`goalForm.js`を初期化する。
- [ ] T015 [US3] `public/js/views/goalForm.js` を新規作成し、既存
  `public/js/habits.js`の目標登録・編集フォームロジック（対象習慣選択・開始日・
  終了日・目標回数、新規/編集モード共通）を移設し、
  `initGoalFormView(mode, goal?)`として`#view-goal-form`に実装する。登録・
  更新の成功時、およびキャンセル操作時のいずれも`showView('goal-list')`を
  呼び出し、`refreshGoalListView()`で一覧を再読み込みする（spec.md FR-011）。
- [ ] T016 [US3] `public/index.html`の`#view-goal-list` / `#view-goal-form`
  セクションに、新規登録・編集・登録（更新）・キャンセルの各ボタン/フォーム要素を
  配置する（既存`index.html`の目標一覧・目標設定フォームのマークアップを移設・
  再配置する）。
- [ ] T017 [US3] `quickstart.md`手順4（User Story 3）を手動実行し、目標一覧⇄
  登録編集画面の遷移（新規登録・編集・キャンセル）を検証する。

**Checkpoint**: User Story 1・2・3がすべて単独で動作する。

---

## Phase 6: User Story 4 - タブからダッシュボードを確認する (Priority: P3)

**Goal**: タブメニューから既存のダッシュボード（`004-reports-dashboard`）を専用の
画面として表示できる。

**Independent Test**: 「ダッシュボード」タブを選択し、既存の実施率・最長ストリーク・
目標の達成状況が引き続き正しく表示されることを確認する（`quickstart.md`手順5）。

### Implementation for User Story 4

- [ ] T018 [US4] `public/index.html`の`#view-dashboard`に、既存のダッシュボード
  セクションのマークアップ（見出し・注釈文・各リスト要素）を移設する。あわせて
  `public/js/views/dashboard.js`を新規作成し、既存`public/js/habits.js`の
  ダッシュボード描画ロジック（習慣ごと・カテゴリ別の実施率、目標の振り返り）を
  移設し、`refreshDashboardView()`として`#view-dashboard`に実装する。
- [ ] T019 [US4] `public/js/app.js` を拡張し、「ダッシュボード」タブが
  アクティブになるたびに`refreshDashboardView()`を呼び出すよう配線する。
- [ ] T020 [US4] `quickstart.md`手順5（User Story 4）を手動実行し、ダッシュ
  ボードタブの表示内容が`004-reports-dashboard`と同一であることを検証する。

**Checkpoint**: すべてのユーザーストーリーが独立に動作する。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 全ユーザーストーリーに共通する仕上げ

- [ ] T021 全ビューへの移設が完了したことを確認した上で、`public/js/habits.js`を
  削除する（`app.js` / `api.js` / `format.js` / `views/*.js`に完全に置き換え
  済みであることを確認してから実施する）。
- [ ] T022 `quickstart.md`手順6（エッジケース: 未登録状態・進行中の目標0件・
  未保存離脱）を手動実行し、動作を確認する。
- [ ] T023 `npm test`を実行し、バックエンドAPIを変更していないため既存18
  ファイル・137件がすべて引き続きパスすることを確認する（回帰確認、
  `logs/tdd-run.log`への記録も確認する）。
- [ ] T024 `quickstart.md`手順7に沿って、`001`〜`005`の既存機能（カテゴリ絞り込み・
  チェックイン履歴・目標進捗・ダッシュボード・リマインダー設定）が画面分割後も
  ブラウザ上で従来通り動作することを手動確認する。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可能。
- **Foundational (Phase 2)**: Setup完了後。すべてのユーザーストーリーをブロック
  する（タブ切り替え機構・共通モジュールに全ストーリーが依存するため）。
- **User Story 1 (Phase 3)**: Foundational完了後。他のストーリーへの依存なし。
- **User Story 2 (Phase 4)**: Foundational完了後。User Story 1への依存なし
  （並行実装可能）。
- **User Story 3 (Phase 5)**: Foundational完了後。User Story 1・2への依存なし
  （並行実装可能。実装パターンはUser Story 2と同型）。
- **User Story 4 (Phase 6)**: Foundational完了後。他のストーリーへの依存なし。
- **Polish (Phase 7)**: すべての対象ユーザーストーリー完了後。

### User Story Dependencies

- **User Story 1 (P1)**: 他のストーリーに依存しない。MVP。
- **User Story 2 (P1)**: 他のストーリーに依存しない。
- **User Story 3 (P2)**: 他のストーリーに依存しない（User Story 2と同一パターンを
  踏襲するため、実装順序としてはUser Story 2の後が効率的だが、独立して実装
  可能）。
- **User Story 4 (P3)**: 他のストーリーに依存しない。

### Within Each User Story

- 既存`public/js/habits.js`のロジックを対象ビューのモジュールへ移設する
- 一覧画面 → 登録編集画面（該当する場合）の順で実装する
- ストーリー完了後、`quickstart.md`の該当手順で単独検証してから次の優先度の
  ストーリーへ進む

---

## Parallel Example: Foundational

```bash
# Foundationalの共通モジュールは並行して作成できる（異なるファイル）:
Task: "public/js/format.js に表示用共通ヘルパーを抽出"
Task: "public/js/api.js にリソース単位のfetch関数を整理"
```

## Parallel Example: User Story 2 / User Story 3

```bash
# User Story 2とUser Story 3は同型のパターンで異なるファイルのため並行実装できる:
Task: "public/js/views/habitList.js と habitForm.js を実装（US2）"
Task: "public/js/views/goalList.js と goalForm.js を実装（US3）"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup を完了する
2. Phase 2: Foundational を完了する（すべてのストーリーをブロックするため必須）
3. Phase 3: User Story 1 を完了する
4. **STOP and VALIDATE**: `quickstart.md`手順2でUser Story 1を単独検証する

### Incremental Delivery

1. Setup + Foundational → タブ切り替えの土台完成
2. User Story 1 追加 → 単独検証 → デモ可能（MVP）
3. User Story 2 追加 → 単独検証 → デモ可能
4. User Story 3 追加 → 単独検証 → デモ可能
5. User Story 4 追加 → 単独検証 → デモ可能
6. Polish（Phase 7）で仕上げる

---

## Notes

- [P] タスク = 異なるファイル・依存関係なし
- [Story] ラベルはユーザーストーリーへのトレーサビリティのために付与
- 各ユーザーストーリーは独立して完了・検証可能であるべき
- タスクごと、または論理的なまとまりごとにコミットする
- チェックポイントで一度停止し、ストーリー単位の独立動作を検証する
- 本機能はバックエンドAPI・データモデルを一切変更しないため（spec.md FR-014）、
  `src/`・`tests/`配下の変更はなく、既存の自動テスト（137件）がそのまま回帰
  確認として機能する
- フロントエンドUI（`public/`配下）は`001`〜`006`と同じ方針でTDD対象外とし、
  `quickstart.md`による手動検証で品質を保証する
