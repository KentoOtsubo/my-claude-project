# Research: 目標設定・進捗計算

Technical Contextに`NEEDS CLARIFICATION`は残っていない（技術スタックは`001`/`002`と同一で
憲章により確定済み）。本フェーズでは、目標管理機能固有の設計判断を記録する。

## 1. 習慣削除時の目標連鎖削除

**Decision**: `goals`テーブルに`habit_id`への外部キー制約
（`REFERENCES habits(id) ON DELETE CASCADE`）を設定する。`002`で有効化済みの
`PRAGMA foreign_keys = ON;`（`src/repositories/db.ts`）をそのまま利用し、新たな
初期化コードは追加しない。

**Rationale**: `002-checkin-tracking`で確立した「DB層の宣言的制約でカスケード削除を
保証する」方針（`checkins`テーブルと同じパターン）を再利用することで、実装コストを
最小化しつつFR-014を満たす。

**Alternatives considered**: なし。`002`で採用済みの方針をそのまま踏襲するため、
代替案の検討は不要と判断した。

## 2. 進捗計算の設計

**Decision**: `src/domain/goalProgress.ts`に、目標（`startDate`・`endDate`・
`targetCount`）と対象習慣のチェックイン日付集合を受け取り、`{ actualCount,
progressPercent, achieved }`を返す純粋関数を実装する。`actualCount`は
`startDate`〜`endDate`（両端を含む）に含まれるチェックイン日付の件数、
`progressPercent`は`min(100, actualCount / targetCount * 100)`、`achieved`は
`actualCount >= targetCount`とする。

**Rationale**: spec.md Key Entitiesで「進捗（Progress）は永続化されるエンティティ
ではなく、都度計算される導出値」と定義済み。`002`の`streak.ts`と同じ設計方針
（永続化しない導出値、副作用のない純粋関数）を継承することで、憲章原則III・Vと
整合させる。

**Alternatives considered**:
- 進捗率・達成フラグを`goals`テーブルにカラムとして永続化し、チェックイン操作の
  都度更新する方法: チェックインの追加・取り消しやチェックイン日付の変更のたびに
  再計算・整合性維持が必要になり、`streak`で不採用とした理由と同様に個人利用規模
  では過剰と判断し不採用（憲章原則V）。

## 3. 部分更新（PUT）のマージ方針

**Decision**: `goalRepository.update()`は、`001`の`habitRepository.update()`と同じ
パターン（既存レコードと送信フィールドをマージ→`src/domain/goal.ts`の検証を再適用
→保存）を採用する。

**Rationale**: 既に確立されたパターンを再利用することで一貫性を保ち、`001`で
`/speckit-analyze`により指摘・是正した「PUT部分更新のマージ方針の明文化」の教訓を
そのまま活かす。

**Alternatives considered**: なし。既存パターンの再利用が最も単純で一貫性が高いため、
代替案は検討していない。

## 4. APIルート設計

**Decision**: 目標は`/api/goals`（フラット構成）として公開する。`POST /api/goals`は
ボディに`habitId`を含める。一覧取得（`GET /api/goals`）は複数習慣をまたいだ目標
一覧を返し、各要素に対象習慣の情報を参照するための`habitId`と、計算済みの進捗
（`actualCount`・`progressPercent`・`achieved`）を含める。

**Rationale**: spec.md FR-009（「登録済みの目標を一覧表示」）は特定の習慣に限定
しておらず、目標管理は複数習慣をまたいだダッシュボード的な使い方が想定される。
`002`のチェックイン（`/api/habits/:habitId/checkins`、習慣に従属するネスト型
リソース）とは性質が異なり、`001`の`/api/habits`と同様のフラットなトップレベル
リソースとして扱う方が自然である。

**Alternatives considered**:
- `/api/habits/:habitId/goals`のようにネストする方法: 特定の習慣の目標だけを見る
  ユースケースには適するが、複数習慣をまたいだ目標一覧を表示する場合に複数回の
  リクエストが必要になり、SC-002（3秒以内の反映）にとって不利なため不採用。

## 5. 進捗計算に用いるチェックインの取得方法

**Decision**: `routes/goals.ts`が`goalRepository`から目標一覧を取得したのち、
目標ごとに`checkinRepository.findByHabitId(habitId)`の結果を`goalProgress.ts`に渡して
進捗を計算する。`001`の`routes/habits.ts`が`currentStreak`を付加する際に採用した
オーケストレーションパターン（ルート層がリポジトリ横断で組み立てる）をそのまま
踏襲する。

**Rationale**: 既存の`checkinRepository.findByHabitId()`をそのまま再利用でき、
新たなリポジトリメソッドやドメイン層をまたぐ依存を増やさずに済む。

**Alternatives considered**:
- `goalRepository`が`checkinRepository`に直接依存する方法: リポジトリ間の依存が
  生まれ、`001`/`002`で確立した「リポジトリは対応するテーブルのみを扱う」という
  責務分離から外れるため不採用。

## まとめ

すべての設計判断は`001`・`002`で確立したパターン（3層構成、DB層でのカスケード
削除、導出値としての計算ロジック、ルート層でのオーケストレーション）を再利用する
ことで一貫性を保っている。Phase 1（データモデル・contracts・quickstart）に進む
準備が整っている。
