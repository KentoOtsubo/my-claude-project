import { calculateGoalProgress } from "./goalProgress.js";
import type { GoalProgressInput } from "./goalProgress.js";

export type GoalReviewStatusValue = "in_progress" | "achieved" | "not_achieved";

export interface GoalReviewStatus {
  status: GoalReviewStatusValue;
  actualCount: number;
  progressPercent: number;
}

/**
 * 目標の進行中/達成/未達成を判定する（FR-008, FR-009）。
 * 進捗計算自体は既存の`calculateGoalProgress`（003-goal-management）を再利用し、
 * 期間終了の有無（`endDate`と`today`の比較）のみを新たに判定する
 * （research.md「6.」参照）。
 */
export function determineGoalReviewStatus(
  goal: GoalProgressInput,
  checkinDates: string[],
  today: string,
): GoalReviewStatus {
  const { actualCount, progressPercent, achieved } = calculateGoalProgress(goal, checkinDates);

  const status: GoalReviewStatusValue =
    goal.endDate > today ? "in_progress" : achieved ? "achieved" : "not_achieved";

  return { status, actualCount, progressPercent };
}
