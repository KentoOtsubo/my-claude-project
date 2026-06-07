# Implementation Plan: ToDo管理アプリ

**Branch**: `001-todo-app` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-todo-app/spec.md`

## Summary

HTMLとCSS、Vanilla JavaScriptを使用してフロントエンドのみで動作するToDo管理アプリを構築する。データストアにはブラウザ内で動作するsql.js（WebAssemblyコンパイル版SQLite）を使用し、IndexedDBでデータを永続化する。バックエンドは不要で、Vercelにスタティックサイトとしてデプロイする。

## Technical Context

**Language/Version**: HTML5, CSS3, Vanilla JavaScript (ES2020+)

**Primary Dependencies**: sql.js 1.10.x（CDN経由: cdnjs.cloudflare.com）

**Storage**: SQLite via sql.js（WebAssembly）、IndexedDBに永続化

**Testing**: ブラウザ手動テスト（モダンブラウザ）

**Target Platform**: モダンブラウザ（Chrome・Firefox・Safari・Edge）

**Project Type**: 静的Webアプリケーション（フロントエンドのみ・ビルドステップなし）

**Performance Goals**: 全CRUD操作 < 100ms

**Constraints**: バックエンドなし・オフライン動作可能・ブラウザのみで完結・単一ユーザー

**Scale/Scope**: 個人タスク管理・単一ユーザー

## Constitution Check

コンスティテューションはテンプレート未設定のため、プロジェクト固有のゲートなし。仕様書の前提条件に準拠する。

- ✅ バックエンドなしの実装（仕様書前提条件: 「サーバーサイドのバックエンドは不要」）
- ✅ シングルユーザー設計（マルチユーザー機能はv1スコープ外）
- ✅ モダンブラウザのみ対応（レガシーブラウザサポート不要）
- ✅ SQLite要件をsql.js（WebAssembly）で満たす

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-app/
├── plan.md              # This file（/speckit-planコマンド出力）
├── research.md          # Phase 0: 技術選定・調査結果
├── data-model.md        # Phase 1: データモデル設計
├── quickstart.md        # Phase 1: 開発・デプロイ手順
├── contracts/           # Phase 1: JavaScriptモジュールインターフェース
│   ├── db-module.md     # db.jsモジュールのインターフェース仕様
│   └── ui-events.md     # UIイベント・状態管理の契約
└── tasks.md             # Phase 2: タスク一覧（/speckit-tasksコマンド出力）
```

### Source Code (repository root)

```text
index.html           # メインページ（タスク一覧・モーダル）
css/
└── styles.css       # スタイルシート
js/
├── db.js            # データベース抽象レイヤー（sql.jsラッパー）
└── app.js           # アプリケーションロジック・UI制御
vercel.json          # Vercel設定（COEPヘッダー、必要な場合のみ）
```

**Structure Decision**: フロントエンド専用のシンプルなフラット構造。フレームワーク・ビルドツール不使用。Vercelはルートのindex.htmlを検出してスタティックサイトとして自動デプロイする。

## Complexity Tracking

> コンスティテューション未設定のため、このセクションは適用外。
