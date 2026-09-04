# Data Model: レポート・ダッシュボード

本機能は新規の永続化エンティティを持たない（FR-012）。既存の`habits`・
`checkins`・`goals`テーブル（`001`〜`003`）を読み取り専用で参照し、以下の
派生値（永続化しない導出データ）を都度計算する。

## 派生値: 週次/月次達成率（CompletionRate）

`src/domain/completionRate.ts`が、習慣の頻度設定・チェックイン日付集合・
「今日」の日付・ウィンドウ日数を入力として計算する導出値。

```
calculateCompletionRate(
  habit: { frequencyType, weeklyDays, createdAt },
  checkinDates: string[],
  today: string,
  windowDays: 7 | 30,
): {
  targetDays: number;   // ウィンドウ内かつ習慣作成日以降の対象日数
  actualDays: number;   // targetDaysのうちチェックインが存在する日数
  percent: number;      // 0〜100（targetDaysが0の場合は0）
}
```

### 計算ロジック（research.md「2.」参照）

1. 対象期間は`today`を含む直近`windowDays`日間とし、習慣の`createdAt`より前の
   日付は`targetDays`に含めない（FR-001, FR-002, FR-010）。
2. 対象日の判定（頻度「毎日」は全日、「毎週」は指定曜日のみ）は
   `src/domain/targetDay.ts`の共通ロジックを使用する（FR-004相当のロジック共有）。
3. `percent` = `targetDays`が0なら`0`、それ以外は
   `round(actualDays / targetDays * 100)`。

## 派生値: 最長ストリーク（LongestStreak）

`src/domain/longestStreak.ts`が、習慣の頻度設定・チェックイン日付集合・
「今日」の日付から計算する導出値（FR-003, FR-004）。

```
calculateLongestStreak(
  habit: { frequencyType, weeklyDays, createdAt },
  checkinDates: string[],
  today: string,
): number // これまでの最長連続実施日数
```

習慣の作成日から`today`まで対象日を前方走査し、連続チェックイン数の最大値を
返す。`today`が対象日かつ未チェックインの場合はリセットせず判定を保留する
（現在のストリーク計算と同じ方針、research.md「3.」参照）。

## 派生値: カテゴリ別達成率（CategoryCompletionRate）

`src/domain/completionRate.ts`が、複数の習慣（頻度設定・チェックイン日付集合を
含む）とカテゴリ区分から計算する導出値（FR-006, FR-007）。

```
calculateCategoryCompletionRate(
  habits: Array<{ category, frequencyType, weeklyDays, createdAt, checkinDates }>,
  today: string,
  windowDays: 7 | 30,
): Array<{
  category: Category;   // "健康" | "仕事" | "学習" | "その他" | "未分類"
  targetDays: number;   // カテゴリに属する全習慣のtargetDays合計
  actualDays: number;   // カテゴリに属する全習慣のactualDays合計
  percent: number;      // 0〜100（targetDaysが0の場合は0）
}>
```

習慣が1件も属さないカテゴリは結果配列に含めない（FR-007）。

## 派生値: 目標振り返り状態（GoalReviewStatus）

`src/domain/goalReviewStatus.ts`が、既存の目標（Goal, `003-goal-management`）・
対象習慣のチェックイン日付集合・「今日」の日付から判定する導出値（FR-008, FR-009）。
既存の`calculateGoalProgress`（`003`）を内部で呼び出す。

```
determineGoalReviewStatus(
  goal: { startDate, endDate, targetCount },
  checkinDates: string[],
  today: string,
): {
  status: "in_progress" | "achieved" | "not_achieved";
  actualCount: number;
  progressPercent: number;
}
```

### 判定ロジック（research.md「6.」参照）

1. `endDate`が`today`より後 → `status = "in_progress"`（FR-009で進捗率も併記）。
2. `endDate`が`today`以前かつ`achieved`（`actualCount >= targetCount`）→
   `status = "achieved"`。
3. `endDate`が`today`以前かつ未達成 → `status = "not_achieved"`。

## APIレスポンスへの組み立て

`GET /api/reports/dashboard`のレスポンスでは、上記4種類の派生値を1つのJSONに
まとめる。詳細は[contracts/reports-api.md](./contracts/reports-api.md)を参照。
いずれの値も`habits`・`checkins`・`goals`テーブルには保存しない（FR-012）。

## 永続化スキーマへの変更

なし。既存の`src/repositories/db.ts`のスキーマ（`habits`・`checkins`・`goals`）を
変更せず、読み取りのみ行う。
