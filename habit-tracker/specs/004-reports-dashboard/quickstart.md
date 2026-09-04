# Quickstart: レポート・ダッシュボード

このガイドは、実装完了後に本機能がエンドツーエンドで動作することを検証する手順を
示す。API契約の詳細は[contracts/reports-api.md](./contracts/reports-api.md)、
データ構造の詳細は[data-model.md](./data-model.md)を参照。`001-habit-management`の
習慣登録・`002-checkin-tracking`のチェックイン・`003-goal-management`の目標設定が
完了している前提。

## 前提条件

- `npm install`済みであること
- `npm test`（vitest run）がすべてパスすること
- 事前に習慣を1件以上登録し、複数日チェックイン済みであること

## 1. サーバーを起動する

```powershell
npm run dev
```

## 2. User Story 1 — 習慣ごとの実行状況ダッシュボードを見る

頻度「毎日」の習慣に直近7日間のうち5日チェックインした状態で:

```powershell
curl http://localhost:3000/api/reports/dashboard
```

**期待結果**: `habits`配列内の対象習慣について、`weekly.percent`が実施日数/対象日数
から算出された値（例: 5/7 ≈ 71%）で返ることを確認する（spec.md Acceptance
Scenario 1）。過去に7日間の連続記録があり、その後途切れて現在は2日連続の場合、
`longestStreak`が`7`、`currentStreak`が`2`と両方表示されることを確認する
（Acceptance Scenario 2）。チェックインが1件もない習慣は`weekly.percent`が`0`、
`longestStreak`が`0`であることを確認する（Acceptance Scenario 3）。

## 3. User Story 2 — カテゴリ別の達成状況を比較する

カテゴリ「健康」に2件、カテゴリ「学習」に1件の習慣を登録し、それぞれ一部
チェックインした状態で:

```powershell
curl http://localhost:3000/api/reports/dashboard
```

**期待結果**: `categories`配列に「健康」「学習」それぞれのエントリがあり、
`weekly`/`monthly`の`percent`がそのカテゴリに属する習慣の実施日数合計・
対象日数合計から算出されていることを確認する（Acceptance Scenario 1, 2）。
習慣が1件も属さないカテゴリ（例: 「仕事」を未登録のまま）が`categories`配列に
含まれないことを確認する（Acceptance Scenario 3）。

## 4. User Story 3 — 目標の達成状況を一覧で振り返る

期間が終了し達成条件を満たした目標と、満たさなかった目標をそれぞれ1件用意した
状態で:

```powershell
curl http://localhost:3000/api/reports/dashboard
```

**期待結果**: `goals`配列で、達成条件を満たした目標の`status`が`"achieved"`、
満たさなかった目標が`"not_achieved"`であることを確認する（Acceptance Scenario 1）。
期間内でまだ終了していない目標は`status`が`"in_progress"`で、`progressPercent`が
併記されていることを確認する（Acceptance Scenario 2）。

## 5. 自動テストでの検証

上記の手動確認に加え、以下がTDDのエビデンスとして`logs/tdd-run.log`に記録されて
いることを確認する。

```powershell
npm test
```

**期待結果**: `tests/unit/domain/targetDay.test.ts`・`completionRate.test.ts`・
`longestStreak.test.ts`・`goalReviewStatus.test.ts`（算出ロジック）と
`tests/integration/reports.test.ts`（上記シナリオに対応するAPIテスト）が
すべてパスする。既存の`tests/unit/domain/streak.test.ts`も、`targetDay.ts`への
抽出後に引き続きパスすることを確認する（リファクタリングによる既存機能の
デグレードがないことの確認）。
