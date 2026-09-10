---

description: "Task list template for feature implementation"
---

# Tasks: データ永続化基盤の刷新

**Input**: Design documents from `/specs/006-persistent-storage/`

**Prerequisites**: plan.md, spec.md, data-model.md, research.md, quickstart.md
（すべて利用可能）。`001-habit-management`〜`005-reminders`の実装が完了していることが
前提。`contracts/`は生成していない（既存API契約を変更しないため、plan.md参照）。

**Tests**: spec.md「User Scenarios & Testing」で「本機能はテスト駆動で実装する」旨が明記
されているため、各ユーザーストーリーにテストタスクを含める（憲章原則I: テスト駆動開発、
NON-NEGOTIABLE）。本機能は既存の振る舞い（`001`〜`005`）を変えない基盤刷新であるため、
既存の統合テストは「新しい非同期API・DI可能な`createApp({ db })`に合わせて先に更新し、
旧実装に対して型エラー（Red）になることを確認したうえで、実装を追従させて再びパスさせる
（Green）」形でTDDを適用する。

**Organization**: タスクはユーザーストーリー単位でグループ化し、各ストーリーを独立に実装・
テストできるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（異なるファイル・依存関係なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2）
- 各タスクに正確なファイルパスを含める

## Path Conventions

- 単一プロジェクト構成: `src/`, `tests/`, `public/` はリポジトリルート直下
  （`plan.md`のProject Structure参照）。ディレクトリ自体は`001`〜`005`で作成済みのため、
  新規ディレクトリ作成タスクは不要。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Vercel Postgres移行に必要な依存関係・環境設定ファイルを整える

- [X] T001 [P] `npm install @vercel/postgres express-async-errors` と
  `npm install -D @electric-sql/pglite` を実行し、`package.json`に追加する。
- [X] T002 [P] `.gitignore` に `.env` / `.env.local` を追加する。`.env.example`
  （`DATABASE_URL=`のキーのみ、実際の接続文字列は含めない）をリポジトリルートに
  新規作成する。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `node:sqlite`（同期API）から Vercel Postgres / PGlite（非同期API）への
全面的な切り替え。User Story 1・2はいずれもこの基盤の上に成り立つため、両方を
ブロックする。

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始できない

### Tests for Foundational ⚠️

> **NOTE**: 本機能は新しい振る舞いを追加するのではなく、既存の`001`〜`005`の
> 振る舞いを保ったままDB層を差し替える。`createApp()`に、テスト用の`DbClient`を
> 直接注入できる`db`オプションを新設することで、テストファイル側の変更だけで
> 旧実装（`db`オプションを持たない同期版`createApp`）に対する型エラー（Red）を
> 確実に発生させる。この時点で`npm test`・`npm run build`が失敗することを確認
> したうえで、実装タスク（T011〜T021）に進む。

- [X] T003 [P] `tests/integration/testDb.ts` を新規作成し、`DbClient`
  インターフェース（`query<T>(text, params?): Promise<{ rows: T[] }>`）の型定義と、
  `@electric-sql/pglite`を使ったテスト用DB生成ヘルパー`createTestDb(options?: {
  dataDir?: string }): Promise<DbClient>`を実装する（`data-model.md`のDbClient
  定義参照）。
- [X] T004 [P] `tests/integration/health.test.ts` の`beforeEach`を
  `app = await createApp({ db: await createTestDb() })`に更新する。旧`createApp`
  は同期関数かつ`db`オプションを持たないため、`npm run build`が型エラーになる
  ことを確認する（Red）。
- [X] T005 [P] `tests/integration/habits.test.ts` の`beforeEach`を同様に更新する
  （FR-003: 既存のAcceptance Scenarios自体は変更しない）。
- [X] T006 [P] `tests/integration/checkins.test.ts` の`beforeEach`を同様に
  更新する（FR-003）。
- [X] T007 [P] `tests/integration/goals.test.ts` の`beforeEach`を同様に更新する
  （FR-003）。
- [X] T008 [P] `tests/integration/reports.test.ts` の`beforeEach`を同様に
  更新する（FR-003）。
- [X] T009 [P] `tests/integration/reminders.test.ts` の`beforeEach`を同様に
  更新する（FR-003）。
- [X] T010 [P] `tests/integration/errorHandling.test.ts` を新規作成し、`query()`が
  常に失敗する（reject する）ダミーの`DbClient`を`createApp({ db: ... })`に注入して
  `POST /api/habits`等を呼び出し、プロセスがクラッシュ・ハングせず`500`と
  `{ error: "..." }`形式のJSONが返ることを検証する（FR-005）。この時点では
  エラーハンドリングミドルウェア（T015で実装）が存在しないため失敗する（Red）。

### Implementation for Foundational

- [X] T011 `src/repositories/db.ts` を全面書き換えする。`DbClient`型をexportし、
  `createDatabase(connectionString?: string): Promise<DbClient>`を実装する。
  `connectionString`が指定されていれば`@vercel/postgres`、省略時は
  `@electric-sql/pglite`（インメモリ）を使用する。いずれの場合も、`habits`/
  `checkins`/`goals`テーブルの冪等なスキーマ初期化（`data-model.md`のSQL参照、
  `reminder_enabled`は`BOOLEAN`型）を実行する（FR-001, FR-002, FR-003）。
- [X] T012 [P] `src/repositories/habitRepository.ts` を全面書き換えし、`create`・
  `findAll`・`findById`・`update`・`delete`のすべてを`Promise`を返す非同期メソッドに
  変更する。SQLをPostgres方言（`?`→`$1, $2...`のプレースホルダ）に変更し、
  `reminder_enabled`がドライバから直接`boolean`で返るため、`rowToHabit()`の
  手動の0/1変換コードを削除する（`research.md`「5.」参照、FR-003）。
- [X] T013 [P] `src/repositories/checkinRepository.ts` を全面書き換えし、
  `create`・`findByHabitId`・`delete`を非同期メソッドに変更する（SQL方言の変更は
  T012と同様、FR-003）。
- [X] T014 [P] `src/repositories/goalRepository.ts` を全面書き換えし、`create`・
  `findAll`・`findById`・`update`・`delete`を非同期メソッドに変更する（同上、
  FR-003）。
- [X] T015 `src/app.ts` を拡張する。`CreateAppOptions`に`connectionString?: string`
  （本番・開発用、`server.ts`から使用）と`db?: DbClient`（テスト用の直接注入、
  T003〜T010から使用）を追加する。`createApp()`を`async`関数にし、`options.db`が
  あればそれを使用、なければ`createDatabase(options.connectionString)`（T011）を
  `await`する。ファイル先頭で`express-async-errors`を副作用importし、全ルート
  登録の後に共通エラーハンドリングミドルウェア（未捕捉エラーを`500 { error: "予期
  しないエラーが発生しました" }`として返す）を追加する（FR-003, FR-005）。
  T004〜T010のテストをパスさせる。
- [X] T016 `src/server.ts` を拡張し、`await createApp({ connectionString:
  process.env.DATABASE_URL })`のように非同期化されたAPIに対応する（FR-003）。
- [X] T017 [P] `src/routes/habits.ts` の各ハンドラを`async`化し、
  `repository`・`checkinRepository`の呼び出しに`await`を追加する（FR-003）。
- [X] T018 [P] `src/routes/checkins.ts` の各ハンドラを`async`化し、`await`を
  追加する（同上、FR-003）。
- [X] T019 [P] `src/routes/goals.ts` の各ハンドラを`async`化し、`await`を
  追加する（同上、FR-003）。
- [X] T020 [P] `src/routes/reports.ts` の`GET /dashboard`ハンドラを`async`化し、
  複数のリポジトリ呼び出し（`Promise.all`等）に`await`を追加する（FR-003）。
- [X] T021 [P] `src/routes/reminders.ts` の`GET /`ハンドラを`async`化し、`await`を
  追加する（FR-003）。

**Checkpoint**: 基盤完了。`npm run build`が型エラーなく通り、`npm test`を実行して
`001`〜`005`の既存の全テスト（T004〜T009）とFR-005のエラーハンドリングテスト
（T010）が、新しい非同期DB層のもとで全件パスすることを確認する（FR-003完全準拠、
Red→Greenの完了）。ここまで完了すればユーザーストーリーの実装を開始できる。

---

## Phase 3: User Story 1 - 記録したデータが消えずに残り続ける (Priority: P1) 🎯 MVP

**Goal**: 習慣・チェックイン等のデータが、アプリケーションプロセスの再起動後も
失われずに残っていることを、自動テストで検証できる状態にする。

**Independent Test**: 同じディレクトリを指定した`createTestDb({ dataDir })`
（T003）を2回（プロセス再起動を模擬）呼び出し、1回目のインスタンスで登録した
データが2回目のインスタンスからも読み取れることを確認する（`quickstart.md`
手順2）。

### Tests for User Story 1 ⚠️

- [X] T022 [P] [US1] `tests/integration/persistence.test.ts` を新規作成する。
  一時ディレクトリ（`node:fs`の`mkdtempSync`等）を`dataDir`として指定した
  `createTestDb({ dataDir })`（T003）で1回目の`DbClient`インスタンスを生成し
  習慣を1件登録・チェックインを1件記録した後、同じディレクトリを指定して
  `createTestDb({ dataDir })`をもう一度呼び出して2回目の（別の）`DbClient`
  インスタンスを生成し、それ経由で同じ習慣・チェックインが取得できることを
  検証するテストを作成する（research.md「2.」の永続化検証専用のPGlite利用方法を
  参照、FR-001, FR-002, spec.md Acceptance Scenario 1-3）。テスト終了後は
  一時ディレクトリを削除する。

### Implementation for User Story 1

- [X] T023 [US1] T022のテストを実行し、失敗する場合は`tests/integration/
  testDb.ts`の`createTestDb()`（T003）のディレクトリ指定時のPGlite初期化処理
  （データディレクトリの生成・スキーマ初期化のタイミング等）を修正してパスさせる。

**Checkpoint**: User Story 1が単独で完全に動作・テスト可能（MVP）。

---

## Phase 4: User Story 2 - 動作確認用のデータ操作が本番データに影響しない (Priority: P2)

**Goal**: 開発用と本番用が別々のデータストアに接続されており、互いに影響しないことを
自動テストと手動確認の両方で確認できる状態にする。

**Independent Test**: 開発用・本番用を模擬した2つの独立したデータストアに対して
それぞれ操作を行い、一方の変更がもう一方に反映されないことを確認する
（`quickstart.md`手順3）。

### Tests for User Story 2 ⚠️

- [X] T024 [P] [US2] `tests/integration/persistence.test.ts` に、異なる2つの
  一時ディレクトリ（開発用・本番用を模擬）をそれぞれ指定した`createTestDb({
  dataDir })`（T003）で独立した`DbClient`インスタンスを2つ作成し、一方に習慣を
  登録してももう一方の取得結果には表れないことを検証するテストを追加する
  （FR-004, spec.md Acceptance Scenario 1-2）。

### Implementation for User Story 2

- [X] T025 [US2] T024のテストを実行し、失敗する場合は`tests/integration/
  testDb.ts`の`createTestDb()`（T003）の実装を見直してパスさせる（データストア
  間でのデータ混在がないことの保証）。
- [ ] T026 [US2] **（ユーザー・運用作業、コード変更なし）**: Vercelダッシュボードで
  Development用・Production用の2つのVercel Postgresデータベースを作成し、
  それぞれの接続文字列をローカルの`.env`（`DATABASE_URL`）とVercelの環境変数に
  設定する。この作業はVercelアカウントへのアクセスが必要なため、ユーザー自身が
  行う（`quickstart.md`の前提条件参照）。

**Checkpoint**: すべてのユーザーストーリーが独立に動作する。

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 全ユーザーストーリーに共通する仕上げ

- [X] T027 `quickstart.md` の全シナリオ（既存機能の回帰確認を含む）を、実際に
  ローカル開発用DBに接続した状態で手動実行し、動作を確認する。
- [X] T028 `npm run build`（`tsc`）を実行し、型エラーがないことを確認する。
- [X] T029 `npm test` を実行し全テストがパスし、`logs/tdd-run.log` に記録される
  ことを確認する。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可能。
- **Foundational (Phase 2)**: Setup完了後。User Story 1・2の両方をブロックする
  （DB層・ルート層の非同期化そのものが基盤のため）。テスト（T003〜T010）を
  実装（T011〜T021）より先に完了させる。
- **User Story 1 (Phase 3)**: Foundational完了後。他のストーリーへの依存なし。
- **User Story 2 (Phase 4)**: Foundational完了後。`tests/integration/
  persistence.test.ts`（User Story 1で作成）に追記する形のため、実質的に
  User Story 1完了後に着手する。
- **Polish (Phase 5)**: すべての対象ユーザーストーリー完了後。

### User Story Dependencies

- **User Story 1 (P1)**: 他のストーリーに依存しない。MVP。
- **User Story 2 (P2)**: `persistence.test.ts`（User Story 1）に追記するため
  ファイルレベルでは順次実装するが、検証内容自体は独立している。

### Within Each Phase

- テストを先に書き、失敗を確認してから実装する（憲章原則I、NON-NEGOTIABLE）。
  Foundationalフェーズでは、`createApp({ db })`という新しいDI経路をテスト側が
  先に使うことで、旧実装に対する型エラー（Red）を確実に発生させてから実装に
  進む。
- DB層 → リポジトリ層 → ルート層 の順で実装する
- フェーズ完了後に次のフェーズ・優先度のストーリーへ進む

---

## Parallel Example: Foundational

```bash
# テストファイルの更新は並行して行える（異なるファイル）:
Task: "tests/integration/health.test.ts のbeforeEachを更新"
Task: "tests/integration/habits.test.ts のbeforeEachを更新"
Task: "tests/integration/checkins.test.ts のbeforeEachを更新"
Task: "tests/integration/goals.test.ts のbeforeEachを更新"
Task: "tests/integration/reports.test.ts のbeforeEachを更新"
Task: "tests/integration/reminders.test.ts のbeforeEachを更新"

# db.ts完了後、3つのリポジトリは並行して書き換えられる:
Task: "src/repositories/habitRepository.ts を非同期化"
Task: "src/repositories/checkinRepository.ts を非同期化"
Task: "src/repositories/goalRepository.ts を非同期化"

# リポジトリ完了後、5つのルートファイルも並行して更新できる:
Task: "src/routes/habits.ts をasync化"
Task: "src/routes/checkins.ts をasync化"
Task: "src/routes/goals.ts をasync化"
Task: "src/routes/reports.ts をasync化"
Task: "src/routes/reminders.ts をasync化"
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 1)

1. Phase 1: Setup を完了する
2. Phase 2: Foundational を完了する（テストを先に更新し型エラーを確認、DB層の
   全面書き換え、既存機能の回帰確認込み）
3. Phase 3: User Story 1 を完了する
4. **STOP and VALIDATE**: `quickstart.md`手順2でUser Story 1を単独検証する

### Incremental Delivery

1. Setup + Foundational → 基盤完成（`001`〜`005`の機能がPostgres/PGlite上で
   引き続き動作することを確認）
2. User Story 1 追加 → 単独検証（永続化の実証）→ デモ可能（MVP）
3. User Story 2 追加 → 単独検証（開発/本番分離の実証）→ デモ可能
4. Polish（Phase 5）で仕上げ、本番のVercel Postgres接続で最終確認

---

## Notes

- [P] タスク = 異なるファイル・依存関係なし
- [Story] ラベルはユーザーストーリーへのトレーサビリティのために付与
- 実装前にテストが失敗する（型エラーを含む）ことを確認する
- タスクごと、または論理的なまとまりごとにコミットする
- チェックポイントで一度停止し、独立動作を検証する
- フロントエンドUI（`public/`配下）は`001`〜`005`と同じ方針でTDD対象外とする。
  本機能はAPIの入出力仕様を変更しないため、フロントエンドのコード変更自体が
  発生しない見込みである
- T026（Vercelダッシュボードでの実際のDB作成）はコード変更を伴わない運用作業で
  あり、ユーザー自身が行う
