# Contract: db.js モジュールインターフェース

**Type**: JavaScript Module Interface | **Phase 1 Output** | **Date**: 2026-06-07 | **Plan**: [../plan.md](../plan.md)

## 責務

`js/db.js`はsql.jsのラッパーモジュールとして以下の責務を持つ:

- sql.jsの初期化とデータベース接続管理
- IndexedDBとのデータ永続化（読み込み・保存）
- タスクCRUD操作の提供（app.jsから呼び出す）

---

## 公開API（グローバルオブジェクト `DB`）

### 初期化

```javascript
DB.init(): Promise<void>
```

- sql.jsをCDNから読み込んで初期化する
- IndexedDBから保存済みデータを読み込む（初回はスキーマを作成）
- 失敗した場合はエラーをスローする

---

### CRUD操作

```javascript
// 作成
DB.createTask(title: string): Promise<Task>

// 読み取り（全件）
DB.getAllTasks(): Promise<Task[]>

// タイトル更新
DB.updateTaskTitle(id: number, title: string): Promise<void>

// 完了状態トグル
DB.toggleTaskCompletion(id: number): Promise<void>

// 削除
DB.deleteTask(id: number): Promise<void>
```

---

## データ型

```javascript
// Taskオブジェクト（db.jsからapp.jsへ渡す形式）
{
  id: number,         // INTEGER PRIMARY KEY
  title: string,      // TEXT NOT NULL
  completed: boolean, // SQLite INTEGER（0/1）をbooleanに変換して返す
  created_at: number  // Unixタイムスタンプ（ミリ秒）
}
```

---

## エラー処理

| エラー条件 | 処理方法 |
|------------|----------|
| sql.js初期化失敗（CDN障害等） | Promiseをreject → app.js側でエラーUI表示 |
| 空タイトルによるバリデーション違反 | `Error`をスロー → app.js側でモーダルにエラーメッセージ表示 |
| IndexedDB読み込み失敗 | コンソールにエラーを記録し空のDBで初期化を続行 |
| IndexedDB書き込み失敗 | コンソールにエラーを記録（データはメモリ上で維持） |

---

## 副作用

全ての書き込み操作（`createTask` / `updateTaskTitle` / `toggleTaskCompletion` / `deleteTask`）完了後、自動的にIndexedDBへデータを保存する（`db.export()` → IndexedDB書き込み）。

---

## ソート順

`getAllTasks()`は以下のSQLで取得した順番でTaskの配列を返す:

```sql
SELECT * FROM tasks ORDER BY completed ASC, created_at DESC;
```

（未完了タスクが先、その中で新規作成順。完了済みタスクが後。）
