# Implementation Plan: 画面遷移UI（トップ・タブ・一覧・登録編集の分割）

**Branch**: `007-ui-navigation` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-ui-navigation/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

現在`public/index.html`1ファイルに集約されている全機能（リマインダー・習慣登録・
習慣一覧・目標設定・目標一覧・ダッシュボード）を、「ホーム」「習慣」「目標」
「ダッシュボード」の4タブ＋習慣/目標の登録編集専用画面という構成に分割する。
ページ全体の再読み込みを伴わない、`<section>`単位の表示切り替え（`hidden`属性の
トグル）による軽量なSPA風実装とする。バックエンドAPI・データモデルは一切変更せず、
既存の`fetch`呼び出しロジックを画面（ビュー）単位のJSモジュールに再配置する
フロントエンドのみの構造変更。

## Technical Context

**Language/Version**: JavaScript (ES2022, ESモジュール) — `public/`配下は既存方針を
踏襲しTypeScriptを導入しない（バックエンドのみNode.js + TypeScript）

**Primary Dependencies**: なし（Vanilla DOM API + `fetch`。憲章の技術スタック制約
「フロントエンド用フレームワークを導入しない」を踏襲し、クライアントサイド
ルーターライブラリ等も導入しない）

**Storage**: N/A（本機能はフロントエンドのみの変更。データ永続化は
`006-persistent-storage`のVercel Postgres構成を変更せず利用する）

**Testing**: 自動テストなし（`001`〜`006`と同様、フロントエンドはDOMテストツール
未導入のため対象外）。`quickstart.md`による手動検証で各画面遷移・データ表示を
保証する。バックエンドAPIは無変更のため、既存137件の自動テスト（`npm test`）が
そのまま回帰確認として機能する。

**Target Platform**: モダンブラウザ（既存`001`〜`006`と同一の前提、個人利用規模）

**Project Type**: Web application（既存の単一`public/`フロントエンド + 既存
Express backend。新しいプロジェクト種別の追加ではない）

**Performance Goals**: SC-001（クリック1回・3秒以内で目的画面に到達）を満たす程度。
数値的なスループット等の目標は本機能の性質上不要（個人利用・単一ユーザー）

**Constraints**: ページ全体の再読み込みなしで画面切り替えを行う（SPA風）。ブラウザ
URL・履歴とは連動しない（spec.md Assumptions）。既存のバックエンドAPI契約
（リクエスト/レスポンス形式）を一切変更しない

**Scale/Scope**: 6画面（ホーム／習慣一覧／習慣登録編集／目標一覧／目標登録編集／
ダッシュボード）、既存`public/js/habits.js`（530行）を画面単位のモジュールに分割

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 理由 |
|---|---|---|
| I. テスト駆動開発 | PASS（既存の適用範囲限定を踏襲） | フロントエンドはDOMテストツール未導入のため`001`〜`006`と同様に自動テスト対象外とし、`quickstart.md`の手動検証で保証する。バックエンド（`src/`）は無変更のため新規テストタスクは発生しない |
| II. 仕様駆動ワークフローの遵守 | PASS | `constitution`（ロードマップ追記, v2.0.1）→`specify`→`clarify`→`plan`の順で実施済み。次に`tasks`→`analyze`→`implement`と進む |
| III. ドメイン中心アーキテクチャ | PASS（対象外） | 本機能は`src/domain/`・`src/repositories/`・`src/routes/`を変更しない。フロントエンドの画面構成変更のみ |
| IV. ドキュメントは日本語で記述 | PASS | 本ドキュメント一式（spec.md, plan.md以下）はすべて日本語で記述 |
| V. シンプルさとエビデンスに基づく進行 | PASS | クライアントサイドルーターやフレームワークを導入せず、既存の`hidden`属性トグルパターン（現index.htmlで使用済み）を拡張するだけの最小構成とする |

## Project Structure

### Documentation (this feature)

```text
specs/007-ui-navigation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

`contracts/`は生成しない。本機能はバックエンドAPIの契約（リクエスト/レスポンス
形式）を一切変更しないため（spec.md FR-014）、`006-persistent-storage`同様、
新しい外部インターフェース契約は存在しない。

### Source Code (repository root)

既存の単一プロジェクト構成（Web application: Express backend + Vanilla JS
frontend）を維持する。バックエンド（`src/`）は無変更。フロントエンド
（`public/`）のみ、画面（ビュー）単位でファイルを分割する。

```text
public/
├── index.html            # シェル: タブメニュー(nav) + 6つの<section>（各画面）
│                          # を1ファイルに保持。JSがsectionの表示/非表示を切替
├── css/
│   └── styles.css         # 既存に、タブメニュー・画面切替用のスタイルを追加
└── js/
    ├── app.js              # エントリポイント。タブ/画面切替（showView）、
    │                        # 各ビューモジュールの初期化・再描画呼び出しを統括
    ├── api.js               # 既存のfetch呼び出し（habits/checkins/goals/
    │                         # reports/reminders）をリソース単位の関数に整理
    │                         # （src/routes/のAPIをそのまま呼ぶのみ、契約変更なし）
    ├── format.js             # 表示用の共通ヘルパー（既存habits.jsから抽出:
    │                         # FREQUENCY_LABELS, CATEGORY_LABELS, WEEKDAY_LABELS,
    │                         # todayString, dayOfWeek, isTargetDay, formatHabit,
    │                         # formatGoalPeriod）
    └── views/
        ├── home.js            # トップページ: リマインダー一覧 + 簡易サマリー
        ├── habitList.js        # 習慣一覧画面（新規登録・編集ボタン→habitForm）
        ├── habitForm.js         # 習慣登録・編集画面（新規/編集モード共通）
        ├── goalList.js          # 目標一覧画面（新規登録・編集ボタン→goalForm）
        ├── goalForm.js           # 目標登録・編集画面（新規/編集モード共通）
        └── dashboard.js          # ダッシュボード画面（既存の描画ロジックを移設）

tests/
├── unit/          # 既存のまま無変更（ドメインロジック、本機能では対象外）
└── integration/   # 既存のまま無変更（API契約を変更しないため回帰確認のみ）
```

**Structure Decision**: 既存の単一プロジェクト構成（`src/` + `public/`）を維持し、
`public/js/habits.js`（530行、全機能混在）を「エントリポイント（`app.js`）＋
共通モジュール（`api.js`, `format.js`）＋画面別モジュール（`views/*.js`）」の
9ファイルに分割する。`index.html`は単一ファイルのまま、画面ごとの`<section>`を
`hidden`属性で排他表示する（クライアントサイドルーターやビルドツールは導入しない、
憲章原則V）。

## Constitution Check（Phase 1設計後の再評価）

`research.md`・`data-model.md`・`quickstart.md`作成後も、当初の判定（PASS）から
変更はない。画面（View）の追加はフロントエンド上の表示単位に留まり、
`src/domain/`・`src/repositories/`・`src/routes/`のいずれにも変更が発生しない
ことをdata-model.mdで確認済み。ライブラリ・ビルドツールの追加もなし
（原則V）。

## Complexity Tracking

*本機能にConstitution Checkの違反はないため、本セクションは空欄とする。*
