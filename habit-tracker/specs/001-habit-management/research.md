# Research: 習慣管理（CRUD・カテゴリ分類）

Technical Contextに`NEEDS CLARIFICATION`は残っていない（技術スタックは憲章
`.specify/memory/constitution.md`の「技術スタックの制約」で確定済み）。本フェーズでは、
その制約のもとでの実装方針の選定理由と代替案の検討結果を記録する。

## 1. データ永続化: `node:sqlite`のDatabaseSyncを使う

**Decision**: `src/repositories/habitRepository.ts`で`node:sqlite`の`DatabaseSync`を使い、
`habits`テーブルへのCRUD操作をカプセル化する。

**Rationale**: 憲章で`node:sqlite`の使用が定められている。Node.js組み込みでネイティブ
ビルドが不要なため、本開発環境（Windows, Python 3.8 32bit）で発生する`better-sqlite3`の
ビルド失敗を回避できる。

**Alternatives considered**:
- `better-sqlite3`: ネイティブビルドが失敗するため使用不可（既知の制約）。
- `sql.js`（Q1の`todo-App/`で採用）: ブラウザ完結型でサーバーサイドでのファイル永続化に
  不向きであり、Q2の技術スタック変更の目的（Node.js+Express構成でのTDD自動化）に合わない
  ため不採用。

## 2. ドメインロジックの分離

**Decision**: 頻度（`daily`/`weekly`+曜日）とカテゴリの検証・デフォルト値適用ロジックは
`src/domain/habit.ts`に副作用のない純粋関数として実装する。Expressルートハンドラや
リポジトリはこの関数を呼び出すのみとする。

**Rationale**: 憲章原則III（ドメイン中心アーキテクチャ）に基づく。純粋関数はDBやHTTPの
モックが不要でユニットテストが高速に書けるため、原則I（TDD）のRed-Green-Refactorサイクルを
最短で回せる。

**Alternatives considered**:
- Expressルートハンドラ内に検証ロジックを直接記述する方法: テストにHTTPリクエスト/レスポンス
  のモックが必要になり単体テストが書きにくいため、憲章原則III違反として却下。

## 3. テスト戦略

**Decision**: ユニットテストは`tests/unit/domain/habit.test.ts`でドメイン関数を直接テストし、
統合テストは`tests/integration/habits.test.ts`で既存の`health.test.ts`と同じパターン
（`createApp()`をimportしてSupertestでHTTPリクエストを発行）を使う。

**Rationale**: 既存のテストパターン（`tests/integration/health.test.ts`）を踏襲すること
で一貫性を保てる。Vitest+Supertestは`package.json`に既に導入済み。

**Alternatives considered**:
- 実サーバーを起動してのE2Eテスト: サーバーの起動・終了処理が複雑になり、個人開発規模
  では過剰なため却下（憲章原則Vのシンプルさに反する）。

## 4. テスト用データベースの初期化

**Decision**: 統合テストでは`node:sqlite`の`DatabaseSync`を`:memory:`パスで初期化し、
テストケースごとに新しいインスタンスを生成する。

**Rationale**: `node:sqlite`はインメモリDBをサポートしており、テスト間のデータ独立性・
再現性を確保できる。ファイルI/Oが不要なため実行速度も速く、TDDのサイクルに適する。

**Alternatives considered**:
- 共有ファイルDBをテスト間でリセットする方法: テスト間の副作用リスクや後始末処理が
  複雑になるため却下。

## 5. カテゴリ・頻度の型表現

**Decision**: カテゴリ（`health`/`work`/`study`/`other`/`uncategorized`）と頻度種別
（`daily`/`weekly`）はTypeScriptのUnion型（文字列リテラル）として`src/domain/habit.ts`に
定義し、DBには文字列カラムとして保存する（`CHECK`制約で整合性を保証）。

**Rationale**: 憲章原則V（シンプルさ・YAGNI）に基づき、本フェーズの固定リストという
仕様（spec.md Assumptions）に対しては別テーブルでの正規化は過剰。

**Alternatives considered**:
- カテゴリ用の別テーブルで正規化しリレーションを持たせる方法: 将来カテゴリの動的追加が
  必要になった場合に検討すべきだが、現時点の仕様（固定リスト）では不要なため不採用。

## まとめ

すべての技術的不明点は憲章の制約と既存のコードベース（`src/app.ts`, `tests/integration/
health.test.ts`）のパターンに従うことで解決した。Phase 1（データモデル・contracts・
quickstart）に進む準備が整っている。
