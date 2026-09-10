# Research: データ永続化基盤の刷新

Technical Contextに`NEEDS CLARIFICATION`は残っていない（保存先サービス自体は
`憲章v2.0.0`で確定済み）。本フェーズでは、Vercel Postgresへの移行に伴う実装レベルの
設計判断を記録する。

## 1. 実行時DBクライアントの選定

**Decision**: 本番・ローカル開発ともに`@vercel/postgres`を使用する。

**Rationale**: Vercel公式のクライアントであり、Vercel PostgresのProduction/
Development環境ごとに自動設定される`POSTGRES_URL`系の環境変数とそのまま連携できる。
サーバーレス関数からの利用に最適化されており（Neonのサーバーレスドライバをベースに
した接続方式）、ローカル開発でも同じAPIで接続できるため、本番・開発でクライアント
コードを分岐させる必要がない。

**Alternatives considered**:
- 素の`pg`（node-postgres）: より汎用的だが、サーバーレス環境向けの接続方式
  （コネクションプール枯渇対策等）を自前で設定する必要があり、`@vercel/postgres`が
  既にその設定を内包している分、個人開発規模では過剰な手間になる。

## 2. 自動テスト用のDB接続方式

**Decision**: 統合テスト（`tests/integration/*.test.ts`）では、`@electric-sql/pglite`
（WASMで動作するインプロセスのPostgres互換エンジン）を使用する。各テストファイルの
`beforeEach`で新しいPGliteインスタンスを生成し、実データベースへのネットワーク接続を
一切行わない。

**Rationale**: 本プロジェクトの`PostToolUseフック`は`src/**/*.ts`・`tests/**/*.ts`の
変更のたびに`npm test`を自動実行する仕組みであり（憲章原則I）、テストが遅い・
ネットワーク接続を必要とする、という状態は運用上致命的（オフライン時に開発が
止まる、CI待ち時間が伸びる）。PGliteはPostgres本体をWASM化したものであり、SQL方言・
制約（CHECK、外部キー等）を含めて本番のVercel Postgres（Postgres本体）と高い互換性を
持ちながら、ネイティブビルドが不要（`better-sqlite3`を避けた過去の判断と同じ理由）
かつインプロセスで完結するため高速に動く。

**Alternatives considered**:
- 実際のVercel Postgres（開発用DB）にテストからも接続する方法: ネットワーク接続が
  必須になり、オフライン時にテストが実行できなくなる。PostToolUseフックの実行速度も
  低下する。個人利用規模でもTDDサイクルの速さを優先し不採用。
- `pg-mem`（JavaScript実装のPostgresエミュレータ）: SQL方言の再現度がPGliteより低く、
  一部の構文・関数が未サポートのため、実装の正しさを検証する信頼性に欠けると判断し
  不採用。

## 3. 開発環境と本番環境のデータ分離

**Decision**: Vercel PostgresプロジェクトのDevelopment用インスタンス（またはNeon
ブランチ相当の別データベース）への接続文字列をローカルの`.env`ファイル
（`DATABASE_URL`、gitには含めない）に設定し、`npm run dev`はこれを読み込んで接続する。
Vercelの本番環境（Production）には、Vercelのダッシュボードで別の`DATABASE_URL`が
環境変数として設定され、両者は異なるデータベースを指す。

**Rationale**: spec.md FR-004（開発環境の操作が本番データに影響しない）を満たす
最もシンプルな方法であり、Vercel Postgres自体がProduction/Preview/Development向けに
環境ごとの接続文字列を発行する機能を持つため、追加のカスタム実装（環境判定ロジック等）
は不要。

**Alternatives considered**:
- 単一のデータベースに`environment`カラムを追加し、アプリケーション側でフィルタリング
  する方法: 実装が複雑になり、フィルタ漏れによる本番データ汚染のリスクを排除できない
  ため不採用（憲章原則V、シンプルさ）。

## 4. スキーマ作成・マイグレーション方式

**Decision**: 専用のマイグレーションツール（Prisma Migrate、node-pg-migrate等）は
導入しない。既存の`db.ts`と同様に、アプリ起動時（`createApp()`内）に冪等な
`CREATE TABLE IF NOT EXISTS`相当のDDLを実行する方式を継続する。ただしPostgresでは
既存の列追加のみを行うマイグレーション（`005`の`reminder_enabled`カラム追加相当の
変更）が将来発生した場合は、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`を同様に
起動時チェックとして追加する（`005`の教訓、docs/q1-q2-comparison-report.md 6.12参照）。

**Rationale**: 個人開発規模でマイグレーション履歴管理ツールを導入するのは過剰
（憲章原則V、YAGNI）。起動のたびに冪等なDDLを実行する方式は`001`〜`005`で確立
済みのパターンであり、Postgresでも`IF NOT EXISTS`系の構文でそのまま踏襲できる。

**Alternatives considered**:
- Prisma / Drizzle等のORM・マイグレーションツールを導入する方法: スキーマ変更履歴の
  管理や型安全性のメリットはあるが、本プロジェクトは薄いリポジトリ層による直接SQL
  実行という一貫した方針を`001`から継続しており、今から新しい抽象化層を導入するのは
  過剰と判断し不採用。

## 5. 既存データ型のPostgresへの変換

**Decision**: 既存のSQLite方言スキーマをPostgres方言に素直に変換する。主な変更点:

- `reminder_enabled`（SQLiteでは`INTEGER`の0/1）→ Postgresの`BOOLEAN`型（クライアント
  側の0/1↔boolean変換コードが不要になり、`habitRepository.ts`がむしろ単純化される）
- `weekly_days`（JSON文字列を`TEXT`カラムに格納）→ 変更なし。Postgresの`JSONB`型への
  移行も検討したが、`src/domain/habit.ts`側の型（`number[]`）とのシリアライズ/
  デシリアライズ処理は現状維持で問題なく、変更範囲を最小化するため据え置く
- `created_at`/`updated_at`（`TEXT`, ISO 8601文字列）→ 変更なし。日付文字列の
  比較・ソートは既存のドメインロジック（`clock.ts`のJST変換等）が文字列前提で
  実装されているため、`TIMESTAMPTZ`型への変更は本機能のスコープ外とする（挙動を
  変えないことを優先、spec.md FR-003）
- 外部キー制約（`ON DELETE CASCADE`）→ Postgresでもそのまま利用可能、変更なし

**Rationale**: spec.md FR-003（既存機能の振る舞いを変えない）を満たすため、
データ型・SQL構造の変更は必要最小限（`node:sqlite`固有の制約に起因する箇所のみ）に
とどめる。

**Alternatives considered**:
- 日付列を`TIMESTAMPTZ`型に、真偽値以外のフラグ的カラムも整理する等、Postgres
  ネイティブの型に全面的に刷新する方法: ドメイン層・フロントエンドの日付文字列
  前提の実装まで見直しが必要になり、影響範囲が本機能のスコープ（永続化方式の
  刷新）を超えるため不採用。

## 6. 非同期化に伴うエラーハンドリング

**Decision**: `express-async-errors`を導入し、`src/app.ts`の先頭で読み込む
（副作用インポートで、Express 4系の非同期ルートハンドラの例外を自動的に
エラーハンドリングミドルウェアへ転送するパッチが適用される）。加えて、
`src/app.ts`に共通のエラーハンドリングミドルウェアを1つ追加し、ドメイン層の
バリデーションエラー（各ルートで個別にcatch済み）以外の未捕捉エラー
（DB接続エラー等）を`500 { error: "予期しないエラーが発生しました" }`として
返すようにする（spec.md FR-005: 分かりやすいエラーメッセージ、中途半端な保存の
防止）。

**Rationale**: Express 4系は非同期ハンドラ内で発生したPromiseの拒否を自動的には
捕捉しない仕様のため、明示的な対応が必要。各ルートハンドラに`try/catch`を個別に
書き足す方法もあるが、`express-async-errors`を使えば1行の追加で全ルートに対応でき、
実装量を抑えられる（憲章原則V）。

**Alternatives considered**:
- 各ルートハンドラに手動で`try/catch`を追加し、`next(error)`を呼び出す方法:
  `001`〜`005`で書かれた既存の各ハンドラ（十数箇所）すべてに同種の定型コードを
  追加する必要があり、`express-async-errors`の導入に比べて変更量・保守コストが
  明らかに大きいため不採用。

## まとめ

すべての設計判断は憲章v2.0.0の制約（Vercel Postgres・非同期API・シンプルさ）と
`001`〜`005`で確立したパターン（3層構成、薄いリポジトリ層、冪等なスキーマ初期化、
既存APIの後方互換性）を踏襲することで一貫性を保っている。Phase 1
（データモデル・quickstart）に進む準備が整っている。
