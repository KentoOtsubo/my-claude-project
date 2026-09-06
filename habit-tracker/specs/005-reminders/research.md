# Research: リマインダー

Technical Contextに`NEEDS CLARIFICATION`は残っていない（技術スタックは`001`〜`004`と
同一で憲章により確定済み）。本フェーズでは、リマインダー機能固有の設計判断を記録する。

## 1. リマインダー表示設定の永続化方法

**Decision**: `habits`テーブルに`reminder_enabled INTEGER NOT NULL DEFAULT 1
CHECK (reminder_enabled IN (0, 1))`カラムを1つ追加する。新規テーブルは作成しない。

**Rationale**: リマインダー表示設定（`ReminderPreference`）は習慣に対して常に1対1で
存在し、独立したライフサイクル（複数件・履歴）を持たない値である。`category`
カラムと同じ「習慣に属する単純な属性」として扱うのが最もシンプルであり、`goals`・
`checkins`のような1対多の子リソースとして新規テーブルを設ける必要はない
（憲章原則V）。また、習慣削除時に`habits`テーブルの行自体が削除されるため、
FR-009（リマインダー表示設定の連鎖削除）もDB制約を追加することなく自動的に
満たされる。

**Alternatives considered**:
- 新規テーブル`reminder_preferences`（`habit_id`への外部キー、`ON DELETE CASCADE`）
  を追加する方法: `goals`と同じパターンだが、1対1の単純な真偽値に対して新規
  テーブル・新規リポジトリを追加するのは過剰（憲章原則V）。

## 2. リマインダー一覧の算出アルゴリズム

**Decision**: `src/domain/reminder.ts`に、習慣（頻度設定・作成日・
`reminderEnabled`）の集合・各習慣のチェックイン日付集合・「今日」の日付を受け取り、
リマインダー対象の習慣一覧を返す純粋関数`calculateReminderList`を実装する。

- 対象日判定（頻度「毎日」は常に対象、頻度「毎週」は指定曜日のみ対象）には
  `004-reports-dashboard`で抽出済みの`src/domain/targetDay.ts`の`isTargetDay`を
  そのまま再利用する（FR-001, FR-002）。
- 本日が対象日でない習慣、本日既にチェックイン済みの習慣、`reminderEnabled`が
  `false`の習慣は結果から除外する（FR-002, FR-003, FR-006相当）。

**Rationale**: `targetDay.ts`は`004`で「対象日かどうか」の判定ロジックを共通化する
目的で抽出済みであり、本機能でもそのまま再利用することで重複実装を避けられる
（憲章原則III・V）。リマインダー一覧自体は`004`の達成率・最長ストリークと同様に
永続化しない導出値とする。

**Alternatives considered**:
- 対象日判定ロジックを本機能用に再度実装する方法: `targetDay.ts`と重複するため
  不採用。

## 3. リマインダーからのチェックイン方法

**Decision**: リマインダー一覧からのチェックイン（User Story 2）は、新規の
APIエンドポイントを設けず、既存の`POST /api/habits/:habitId/checkins`
（`002-checkin-tracking`で実装済み）をフロントエンドから呼び出す形で実現する。

**Rationale**: 既存のチェックイン検証ロジック（重複防止・未来日禁止・作成日より前
禁止、FR-005）をそのまま再利用でき、新しい検証ルールを追加する必要がない。
リマインダー一覧の表示元が習慣一覧かリマインダー一覧かによってチェックインの
振る舞いを変える理由もないため、単一のエンドポイントに統一するのがシンプル
（憲章原則V）。

**Alternatives considered**:
- リマインダー専用の`POST /api/reminders/:habitId/checkins`のようなエンドポイントを
  新設する方法: 既存のチェックインAPIと検証ロジックが重複するため不採用。

## 4. APIルート設計

**Decision**: 新規エンドポイント`GET /api/reminders`を追加し、本日のリマインダー
対象習慣一覧を返す。リマインダー表示設定の変更（FR-006）は、既存の
`PUT /api/habits/:id`のリクエストボディに`reminderEnabled`フィールドを追加する形で
対応し、専用のエンドポイントは設けない。

**Rationale**: リマインダー表示設定は習慣自体の属性（1.参照）であるため、既存の
習慣更新エンドポイントで一緒に更新できる方が自然でREST的に一貫している
（`001`のPUT部分更新マージ方針をそのまま踏襲できる）。一方、リマインダー一覧の
取得は習慣一覧取得（`GET /api/habits`）とは異なるフィルタリング条件（対象日・
未チェックイン・表示設定）を持つ導出データであるため、`004`の
`GET /api/reports/dashboard`と同様に専用のエンドポイントとする。

**Alternatives considered**:
- `GET /api/habits`のレスポンスに`isReminderTarget`のようなフラグを追加し、
  専用エンドポイントを設けない方法: 習慣一覧画面とリマインダー一覧画面で
  必要なデータの形（フィルタ済み配列 vs 全件+フラグ）が異なり、フロントエンドの
  実装がかえって複雑になるため不採用。

## まとめ

すべての設計判断は憲章の制約（シンプルさ・ドメイン中心・TDD）と`001`〜`004`で
確立したパターン（3層構成、`node:sqlite`直接操作、Vitest+Supertestでの検証、
導出値は永続化しない方針、既存ロジックの再利用）を踏襲することで一貫性を保って
いる。Phase 1（データモデル・contracts・quickstart）に進む準備が整っている。
