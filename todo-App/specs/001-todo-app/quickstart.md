# Quickstart: ToDo管理アプリ

**Phase 1 Output** | **Date**: 2026-06-07 | **Plan**: [plan.md](./plan.md)

## 前提条件

- モダンブラウザ（Chrome 100+, Firefox 100+, Safari 15+, Edge 100+）
- ローカルHTTPサーバー（WASMはCORSのため`file://`プロトコルでは動作しない）
- インターネット接続（CDNからsql.jsを読み込むため）
- Node.js（`npx serve`を使う場合。Python等の代替でも可）

---

## ローカル開発サーバーの起動

**npxを使用（推奨）:**
```bash
cd todo-app
npx serve .
# → http://localhost:3000 で起動
```

**Pythonを使用:**
```bash
cd todo-app
python -m http.server 8080
# → http://localhost:8080 で起動
```

**VS Code Live Server拡張:**
- `index.html`を右クリック → "Open with Live Server"

> **注意**: `file://`プロトコルではWASMファイルの読み込みがブロックされます。必ずHTTPサーバー経由でアクセスしてください。

---

## プロジェクト構成

```
todo-app/
├── index.html           # メインページ（タスク一覧・モーダル・確認ダイアログ）
├── css/
│   └── styles.css       # スタイルシート
└── js/
    ├── db.js            # データベース抽象レイヤー（sql.jsラッパー）
    └── app.js           # アプリケーションロジック・UI制御
```

---

## 動作確認チェックリスト

1. ブラウザで`http://localhost:3000`（またはサーバーのURL）を開く
2. "新規作成"ボタンをクリックしてタスクを追加する
3. ページをリロードしてデータが保持されることを確認する
4. チェックボックスで完了状態を切り替える（完了タスクが下部に移動することを確認）
5. 編集ボタンでタイトルを変更する
6. 削除ボタンで確認ダイアログを経由してタスクを削除する
7. Tabキー・Enterキー・Escキーによるキーボード操作を確認する

---

## Vercelへのデプロイ

### 方法1: GitHub連携（推奨）

1. GitHubにリポジトリを作成し、コードをプッシュする
2. [vercel.com](https://vercel.com) にアクセスしてGitHubアカウントでログインする
3. "New Project" → リポジトリを選択する
4. Framework Preset: **Other**（自動検出される場合が多い）
5. Root Directory: プロジェクトルート（デフォルト）
6. "Deploy"をクリックする

### 方法2: Vercel CLIを使用

```bash
npm i -g vercel
cd todo-app
vercel
```

### vercel.json（問題が発生した場合のみ追加）

COEPヘッダーが必要な場合のみ`vercel.json`を作成する:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

> **補足**: sql.js標準版（非スレッド版）はSharedArrayBufferを使用しないため、通常はCOEPヘッダーは不要です。

---

## デバッグ

| 症状 | 原因 | 対処 |
|------|------|------|
| ページが真っ白・コンソールにCORSエラー | `file://`でアクセスしている | HTTPサーバー経由でアクセスする |
| sql.jsの初期化エラー | CDN障害またはネットワーク問題 | インターネット接続を確認する |
| データが保存されない | IndexedDBのクォータ超過 | ブラウザのストレージを確認する |
| ブラウザのDevToolsでデータ確認 | - | Application → IndexedDB → TodoDB → database |
