# Research: ToDo管理アプリ 技術選定

**Phase 0 Output** | **Date**: 2026-06-07 | **Plan**: [plan.md](./plan.md)

## NEEDS CLARIFICATION 解決結果

### 1. SQLite実装方式の選定

**Decision**: sql.js（SQLite compiled to WebAssembly）をブラウザ内で使用し、IndexedDBでデータを永続化する

**Rationale**:
- ユーザー要件: SQLiteを使用する
- 仕様書前提条件: バックエンドなし・クライアントサイドストレージのみ
- sql.jsはSQLiteをWebAssemblyにコンパイルしたライブラリで、ブラウザ内で完全なSQLite APIを提供する
- バックエンド不要のため、Vercelにスタティックサイトとしてデプロイできる

**Alternatives Considered**:
- **Vercel Serverless Functions + better-sqlite3**: バックエンドが必要になり、かつVercelの一時ファイルシステムによりデータがリクエスト間で永続化されない。シンプルなToDoアプリには不適合。不採用。
- **Turso（libSQL）**: クラウドSQLite互換サービスだが、外部サービスへの依存・バックエンドAPIが必要。シンプルなToDoアプリには過剰。不採用。
- **localStorage/IndexedDB（直接）**: SQLite要件を満たさない。不採用。

---

### 2. sql.jsのデータ永続化方式

**Decision**: IndexedDBにSQLiteデータベースのバイナリ（Uint8Array）を保存する

**Rationale**:
- localStorageは文字列のみ保存可能（base64変換が必要）で容量制限が~5-10MB
- IndexedDBはArrayBufferを直接保存でき、容量制限が実質的にない（数百MB以上）
- sql.jsはデータ変更後に`db.export()`でUint8Arrayとしてデータをエクスポートできる
- IndexedDB APIは全モダンブラウザで安定サポート済み

**Alternatives Considered**:
- **localStorage（base64変換）**: 容量制限とbase64変換のオーバーヘッドがある。ToDoアプリ程度なら容量問題は起きにくいが、IndexedDBの方が適切。
- **OPFS（Origin Private File System）**: 最も効率的だが、SharedArrayBufferが必要でCORP/COEPヘッダー設定が必要。シンプルなToDoアプリには複雑すぎる。

---

### 3. Vercelデプロイ設定

**Decision**: 基本はvercel.json不要。index.htmlをルートに配置するだけでVercelがスタティックサイトとして自動認識する

**Rationale**:
- Vercelはindex.htmlが存在するとスタティックサイトとして自動デプロイ
- ビルドコマンド・フレームワーク設定は不要
- sql.jsはCDN（cdnjs.cloudflare.com）から読み込むため、ローカル資産ファイルの管理が不要

**COEPヘッダーについて**:
- sql.jsの標準版（非スレッド版）はSharedArrayBufferを使用しないためCOEP/COOPヘッダー不要
- WASMのCDN読み込みのみ行うため、クロスオリジンの問題は発生しない
- 問題が発生した場合のみvercel.jsonでヘッダーを追加する

**Alternatives Considered**:
- **sql-wasmファイルをローカルに配置**: CDNが使えない環境のためのフォールバックとして有効だが、~1MBのWASMファイルをリポジトリに含める必要があり管理が複雑。今回はCDN版を採用。

---

### 4. sql.jsバージョンと読み込み方式

**Decision**: sql.js v1.10.3をcdnjs経由で`<script>`タグで読み込む

**Rationale**:
- `<script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js">`
- `initSqlJs`呼び出し時にWASMファイルも同CDNから自動的に読み込まれる（`locateFile`オプションで指定）
- バンドラー不使用のプロジェクトに最適な方式

---

## 技術リスクと軽減策

| リスク | 影響度 | 軽減策 |
|--------|--------|--------|
| WASMファイルの初期読み込み時間（~1MB） | 中 | ローディングインジケーターを表示しUXへの影響を最小化 |
| sql.js初期化失敗（CDN障害等） | 中 | try-catchでエラーを捕捉し、ユーザーへわかりやすいエラーメッセージを表示 |
| IndexedDB未対応環境 | 低 | 対象はモダンブラウザのみのため実質リスクなし |
| 書き込みごとのIndexedDB保存によるパフォーマンス低下 | 低 | ToDoアプリ規模のデータ量では問題なし |

---

## 実装パターン（参考）

### sql.js初期化フロー

```javascript
const SQL = await initSqlJs({
  locateFile: file =>
    `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
});
const savedData = await loadFromIndexedDB();
const db = savedData ? new SQL.Database(savedData) : new SQL.Database();
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )
`);
```

### IndexedDB永続化パターン

```javascript
async function saveToIndexedDB(data) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('TodoDB', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('database');
    };
    req.onsuccess = e => {
      const idb = e.target.result;
      const tx = idb.transaction(['database'], 'readwrite');
      tx.objectStore('database').put(data, 'sqlite-db');
      tx.oncomplete = resolve;
      tx.onerror = reject;
    };
    req.onerror = reject;
  });
}
```
