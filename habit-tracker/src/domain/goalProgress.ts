export interface GoalProgressInput {
  startDate: string;
  endDate: string;
  targetCount: number;
}

export interface GoalProgress {
  actualCount: number;
  progressPercent: number;
  achieved: boolean;
}

/**
 * 目標の対象期間（両端を含む）内のチェックイン数から進捗を計算する（FR-006〜FR-008）。
 * 進捗は永続化しない導出値であり、目標・チェックイン履歴から都度計算する
 * （`streak`と同じ設計方針、research.md「2.」参照）。
 */
export function calculateGoalProgress(
  goal: GoalProgressInput,
  checkinDates: string[],
): GoalProgress {
  const actualCount = checkinDates.filter(
    (date) => date >= goal.startDate && date <= goal.endDate,
  ).length;

  const progressPercent = Math.min(
    100,
    Math.round((actualCount / goal.targetCount) * 100),
  );
  const achieved = actualCount >= goal.targetCount;

  return { actualCount, progressPercent, achieved };
}
